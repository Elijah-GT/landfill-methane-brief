// After a CARB notice: turn the date the operator received CARB's plume notification
// into the regulation's due dates, and the questions an analyst can ask the operator.
// Pure logic (no DOM) so the app, the brief and the tests share it.
//
// Day counting: the regulation gives "within N calendar days of receiving a notification"
// (§ 95469(b)(2)(A), (b)(3)(A)) and "within N calendar days after receiving the notification"
// (§ 95470(b)(7)(A), (C)) but does not say how to count. Here the due date is the receipt date
// plus N calendar days, with no shift for weekends or holidays. The app says so on screen.
(function (root) {
  "use strict";

  var DAY = 86400000;

  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(t);
    // reject impossible dates such as 2027-02-30
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
    return t;
  }

  function iso(t) { return new Date(t).toISOString().slice(0, 10); }

  function addDays(isoDate, n) {
    var t = parseISO(isoDate);
    return t == null ? null : iso(t + n * DAY);
  }

  function daysBetween(fromIso, toIso) {
    var a = parseISO(fromIso), b = parseISO(toIso);
    return a == null || b == null ? null : Math.round((b - a) / DAY);
  }

  var TYPES = {
    controlled: "Controlled landfill, or has a landfill gas control system",
    uncontrolled: "Uncontrolled landfill (covered by § 95463(b)(2)(B))",
    unknown: "Not sure"
  };

  // Dated steps, counted from the receipt of the notice. `item` points at the cited entry in
  // data/checklist.js, which holds the section, page and verbatim quote.
  var DATED = {
    controlled: [
      { days: 10, item: "survey-surface", what: "Ground-surface methane survey and component leak check of the 600 ft square around CARB’s plume location",
        short: "Survey the 600 ft square: ground surface and gas components",
        ask: "When was the 600 ft square surveyed, and the gas-system components in it checked for leaks? With what instrument?" },
      { days: 15, item: "report-controlled", what: "Report to CARB: survey results, each reading over 500 ppmv or leak and its source, an initial mitigation plan, and possible causes. The rule names controlled MSW landfills for this report",
        short: "Report results, sources, mitigation plan and causes to CARB",
        ask: "Has the 15-day report gone to CARB? Can you share a copy, including the initial mitigation plan?" }
    ],
    uncontrolled: [
      { days: 30, item: "survey-uncontrolled", what: "Methane survey of the entire landfill surface",
        short: "Survey the entire landfill surface",
        ask: "When was the whole surface surveyed, and with what instrument?" },
      { days: 35, item: "report-uncontrolled", what: "Report to CARB: the survey, the instrument, and each reading of 200 ppmv or more with its location",
        short: "Report the survey and each reading of 200 ppmv or more to CARB",
        ask: "Has the 35-day report gone to CARB? Can you share a copy?" }
    ]
  };

  // Steps whose clock starts with something the analyst will not know yet (a high reading,
  // a leak, a successful re-test): no date, only the rule and the question to ask.
  var CONDITIONAL = {
    controlled: [
      { item: "fix-surface", what: "For each surface reading over 500 ppmv: start corrective action within 5 calendar days of the reading, re-test within 10, and re-test again one month later if that re-test is clean. A second reading over 500 ppmv repeats these steps; a third needs notice to CARB and a new or replacement well",
        short: "Reading over 500 ppmv: start fixes in 5 days, re-test in 10 and again at one month",
        ask: "Did the survey find any reading over 500 ppmv? Where, when did corrective action start, and when was it re-tested?" },
      { item: "fix-components", what: "For each component leak: tag it, then repair and re-test it within 10 calendar days",
        short: "Component leak: tag, repair and re-test within 10 days",
        ask: "Were any component leaks found? When were they repaired and re-tested?" },
      { item: "report-repairs", what: "Report each repair within 5 calendar days of the re-test that first shows it fixed",
        short: "Report each repair within 5 days of the re-test showing it fixed",
        ask: "Have the repair reports been sent to CARB?" }
    ],
    uncontrolled: [
      { item: "uncontrolled-200", what: "For any surface reading of 200 ppmv or more: the landfill must then comply with sections 95464 through 95476, including a gas collection and control system design plan within one year if no qualifying system is installed",
        short: "Reading of 200 ppmv or more: the full rule then applies, including a gas collection design plan within a year",
        ask: "Did the survey find any reading of 200 ppmv or more? If so, what are the next steps toward the full rule?" }
    ]
  };

  function has(obj, k) { return Object.prototype.hasOwnProperty.call(obj, k); }
  function validType(t) { return typeof t === "string" && has(TYPES, t) ? t : "unknown"; }

  // Steps for a given landfill type. "unknown" returns both sets, each tagged with its type.
  function steps(noticeIso, type) {
    type = validType(type);
    var types = type === "unknown" ? ["controlled", "uncontrolled"] : [type];
    var dated = [], conditional = [];
    types.forEach(function (ty) {
      DATED[ty].forEach(function (s) {
        dated.push({ type: ty, item: s.item, days: s.days, due: addDays(noticeIso, s.days), what: s.what, short: s.short, ask: s.ask });
      });
      CONDITIONAL[ty].forEach(function (s) {
        conditional.push({ type: ty, item: s.item, what: s.what, short: s.short, ask: s.ask });
      });
    });
    dated.sort(function (a, b) { return a.days - b.days; });
    return { dated: dated, conditional: conditional };
  }

  // Where a due date stands relative to today, worded neutrally: a passed date is a prompt to
  // ask whether the step was done, never a finding that it was missed.
  function standing(dueIso, todayIso) {
    var d = daysBetween(todayIso, dueIso);
    if (d == null) return { key: "unknown", text: "" };
    if (d > 1) return { key: "ahead", text: "in " + d + " days" };
    if (d === 1) return { key: "ahead", text: "tomorrow" };
    if (d === 0) return { key: "today", text: "today" };
    return { key: "passed", text: "date passed " + (-d === 1 ? "yesterday" : -d + " days ago") + "; ask whether it was done" };
  }

  // A notice date the tool accepts: a real calendar date from 2020 to 2099 (so a year typed
  // digit by digit, such as 0202, is not taken as a date).
  function validNoticeDate(s) {
    return parseISO(s) != null && s >= "2020-01-01" && s <= "2099-12-31";
  }

  function cleanCarb(s) { return String(s || "").replace(/[^A-Za-z0-9 _.\-]/g, "").slice(0, 40); }

  // State in the URL hash: notice=YYYY-MM-DD, type=controlled|uncontrolled|unknown, carb=<CARB ID>.
  // formFromHash returns whatever is there (the date may be empty); fromHash only a usable notice.
  function param(hash, k) {
    var m = new RegExp("(?:^|[#&])" + k + "=([^&]*)").exec(hash || "");
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return null; } // malformed % escapes
  }
  function formFromHash(hash) {
    var date = param(hash, "notice") || "";
    return { date: validNoticeDate(date) ? date : "", type: validType(param(hash, "type")), carb: cleanCarb(param(hash, "carb")) };
  }
  function fromHash(hash) {
    var st = formFromHash(hash);
    return st.date ? st : null;
  }
  // toHash writes a usable notice only; formToHash also keeps a chosen type and ID while the
  // date is still being entered, so the form survives a range switch.
  function formToHash(state) {
    if (!state) return "";
    var out = validNoticeDate(state.date) ? "&notice=" + state.date : "";
    var type = validType(state.type), carb = cleanCarb(state.carb);
    if (out || type !== "unknown") out += "&type=" + type;
    if (carb) out += "&carb=" + encodeURIComponent(carb);
    return out;
  }
  function toHash(state) {
    return state && validNoticeDate(state.date) ? formToHash(state) : "";
  }

  var EFFECTIVE = "2027-01-01";

  var api = { addDays: addDays, daysBetween: daysBetween, parseISO: parseISO, steps: steps, standing: standing,
    validNoticeDate: validNoticeDate, cleanCarb: cleanCarb, fromHash: fromHash, formFromHash: formFromHash,
    toHash: toHash, formToHash: formToHash, TYPES: TYPES, EFFECTIVE: EFFECTIVE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LMBNotice = api;
})(typeof window !== "undefined" ? window : this);
