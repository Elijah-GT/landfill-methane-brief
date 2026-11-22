// One-page printable brief for the site named in the URL hash (#site=<id>).
(function () {
  "use strict";
  var L = window.LMB, D = L.data();
  var sheet = document.getElementById("sheet");
  var el = L.el;

  document.getElementById("print").addEventListener("click", function () { window.print(); });
  window.addEventListener("hashchange", function () { window.location.reload(); });

  function fail(head, msg) {
    sheet.textContent = "";
    sheet.appendChild(el("div", { class: "state", role: "alert" }, [el("h1", { text: head }), el("p", { text: msg })]));
    document.getElementById("print").setAttribute("aria-disabled", "true");
    document.getElementById("print").disabled = true;
  }

  if (!D) { fail("The landfill data did not load", "web/data/sites.js is missing. Run python pipeline/build_sites.py, then reload."); return; }
  var site = L.siteById(L.siteIdFromHash());
  if (!site) { fail("No landfill selected", "Open this brief from a landfill in the app, so the address ends with #site= and the landfill’s id."); return; }

  var range = D.recent_since ? L.rangeFromHash() : "all";
  var N = window.LMBNotice, notice = N ? N.fromHash(window.location.hash) : null;
  document.getElementById("back").setAttribute("href", "index.html" + L.hashFor(site.id, range) + (notice ? N.toHash(notice) : ""));
  document.title = "Methane brief: " + site.name;

  // The brief follows the range chosen in the app. With no detections in the recent window,
  // it says so and shows the full history instead, so the page is never blank.
  var v = L.view(site, range);
  var emptyWindow = range === "recent" && !v.plume_count;
  var shown = emptyWindow ? L.view(site, "all") : v;
  var kinds = L.kindCounts(shown);
  var withheld = shown.plume_count - shown.quantified_count;
  var now = new Date();
  var today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0"); // local date, not UTC

  function row(label, value) { return el("div", {}, [el("dt", { text: label }), el("dd", { text: value })]); }

  // header
  sheet.appendChild(el("header", { class: "b-head" }, [
    el("div", { class: "b-title" }, [
      el("p", { class: "b-kicker", text: "Methane plume brief for local government staff" }),
      el("h1", { text: site.name }),
      el("dl", { class: "b-meta" }, [
        site.official_name ? row("Registered name", site.official_name) : null,
        site.county ? row("County", site.county) : null,
        site.operator ? row("Owner or parent company", site.operator) : null,
        row("Site centre", site.lat.toFixed(4) + ", " + site.lon.toFixed(4))
      ])
    ]),
    el("dl", { class: "b-dates" }, [
      row("Prepared", L.fmtDate(today)),
      row("Data fetched", L.fmtDate(D.fetched_at)),
      row("Period", range === "all" ? "Full record since " + L.fmtDate(site.first_date)
        : "Last " + D.recent_months + " months, since " + L.fmtDate(D.recent_since)),
      row("Detections through", L.fmtDate(site.last_date)),
      notice ? row("CARB notice received", L.fmtDate(notice.date)) : null
    ])
  ]));

  // summary sentence
  var who = kinds.aircraft && kinds.space ? "aircraft and satellites" : kinds.space ? (kinds.space === 1 ? "a satellite" : "satellites") : (kinds.aircraft === 1 ? "an aircraft" : "aircraft");
  var summary = "";
  if (emptyWindow) {
    summary = "No plume was published at this site in the " + D.recent_months + " months to " + L.fmtDate(D.fetched_at) +
      ". That does not mean nothing leaked: it may not have been flown over. The last detection was on " + L.fmtDate(site.last_date) +
      "; the full record below has " + L.plural(site.plume_count, "detection") + " since " + L.fmtDate(site.first_date) + ". ";
  } else {
    var when = shown.first_date === shown.last_date ? "On " + L.fmtDate(shown.first_date)
      : "Between " + L.fmtDate(shown.first_date) + " and " + L.fmtDate(shown.last_date);
    summary = when + ", " + who + " detected " + L.plural(shown.plume_count, "methane plume") + " at this site" +
      (kinds.aircraft && kinds.space ? " (" + kinds.aircraft + " from aircraft, " + kinds.space + " from satellites)" : "") + ". ";
    if (shown.quantified_count === 1) {
      summary += "Its published rate was " + L.fmtRateUnc(shown.max_rate_kg_h, shown.max_rate_uncertainty_kg_h) + ". ";
    } else if (shown.quantified_count > 1) {
      summary += "The median published rate was " + L.fmtRate(shown.median_rate_kg_h) + " kg/h; the largest was " +
        L.fmtRateUnc(shown.max_rate_kg_h, shown.max_rate_uncertainty_kg_h) + " on " + L.fmtDate(shown.max_rate_date) + ". ";
    }
    if (withheld) summary += L.plural(withheld, "detection") + " had no published rate. ";
    if (range === "recent" && site.plume_count > shown.plume_count) {
      summary += "The full record since " + L.fmtDate(site.first_date) + " has " + L.plural(site.plume_count, "detection") + ".";
    }
  }
  sheet.appendChild(el("p", { class: "b-summary", text: summary.trim() }));

  // chart + per-year
  var chartBox = el("div", { class: "b-chart" });
  sheet.appendChild(el("section", { class: "b-block", "aria-labelledby": "b-chart-title" }, [
    el("h2", { id: "b-chart-title", text: emptyWindow ? "Every published detection (none in the last " + D.recent_months + " months)"
      : range === "recent" ? "Published detections in the last " + D.recent_months + " months" : "Every published detection" }),
    el("p", { class: "b-key", text: "Dot: estimated rate (same-day dots spread). Bar: ± uncertainty. Square: no published rate. Gap: no published pass." }),
    chartBox
  ]));
  var chartRange = range === "recent" && !emptyWindow ? { from: D.recent_since, to: D.fetched_at.slice(0, 10) } : {};
  function drawChart(h) {
    window.LMBChart.render(chartBox, shown, Object.assign({ width: 760, height: h, suffix: "-brief" }, chartRange));
  }
  var chartH = 160;
  drawChart(chartH);

  // checklist, or with a notice date: the dated follow-up steps and what to ask
  function cite(id) {
    var hit = null;
    window.LMB_CHECKLIST.groups.forEach(function (g) { g.items.forEach(function (it) { if (it.id === id) hit = it; }); });
    return hit ? hit.section + ", p. " + hit.page : "";
  }
  if (notice) {
    var s = N.steps(notice.date, notice.type), both = notice.type === "unknown";
    var rows = s.dated.map(function (d) {
      return el("tr", {}, [
        el("td", { class: "b-due", text: L.fmtDate(d.due) }),
        el("td", {}, [
          both ? el("strong", { text: d.type === "controlled" ? "If controlled: " : "If uncontrolled: " }) : null,
          d.short + " (" + d.days + " days). ", el("span", { class: "cite", text: cite(d.item) })
        ]),
        el("td", { text: d.ask }),
        el("td", { class: "b-answer" })
      ]);
    });
    var cond = s.conditional.map(function (c) {
      return el("li", {}, [both ? el("strong", { text: c.type === "controlled" ? "If controlled: " : "If uncontrolled: " }) : null,
        c.short + ". ", el("span", { class: "cite", text: cite(c.item) + ". " }), el("em", { text: "Ask: " + c.ask })]);
    });
    sheet.appendChild(el("section", { class: "b-block b-notice", "aria-labelledby": "b-duty-title" }, [
      el("h2", { id: "b-duty-title", text: "Follow-up after CARB’s notice of " + L.fmtDate(notice.date) +
        (notice.type === "controlled" ? " (controlled landfill)" : notice.type === "uncontrolled" ? " (uncontrolled landfill)" : " (landfill type not confirmed)") }),
      notice.carb ? el("p", { class: "b-key", text: "CARB ID number: " + notice.carb }) : null,
      notice.date < N.EFFECTIVE ? el("p", { class: "b-key", text: "This notice predates the amended rule (effective " + L.fmtDate(N.EFFECTIVE) + "); these due dates may not apply." }) : null,
      notice.date > today ? el("p", { class: "b-key", text: "The notice date is after the date this brief was prepared; check it." }) : null,
      el("table", { class: "b-due-table" }, [
        el("thead", {}, [el("tr", {}, [
          el("th", { scope: "col", text: "Due" }), el("th", { scope: "col", text: "Step and rule" }),
          el("th", { scope: "col", text: "Ask the operator" }), el("th", { scope: "col", text: "Operator’s answer" })
        ])]),
        el("tbody", {}, rows)
      ]),
      cond.length ? el("p", { class: "b-key", text: "Depending on what the survey finds:" }) : null,
      cond.length ? el("ul", { class: "b-cond" }, cond) : null,
      el("p", { class: "b-key", text: "Due date = date the notice arrived + the rule’s calendar days, not moved for weekends or holidays (the rule does not say); confirm with CARB. Duties start only with CARB’s notice (§ 95469(b), p. 26)." })
    ]));
  } else {
    var duties = el("div", { class: "b-duties" });
    sheet.appendChild(el("section", { class: "b-block", "aria-labelledby": "b-duty-title" }, [
      el("h2", { id: "b-duty-title", text: "What California’s 2027 rule asks after a CARB notice" }),
      duties
    ]));
    window.LMBChecklist.render(duties, { compact: true });
  }

  // caveats and credits
  var lag = D.publication_lag_days;
  sheet.appendChild(el("section", { class: "b-block b-caveats", "aria-labelledby": "b-cav-title" }, [
    el("h2", { id: "b-cav-title", text: "Read this before using the numbers" }),
    el("ul", {}, [
      el("li", { text: "Informational only, not legal advice or an official CARB determination. This brief does not assess whether the operator is meeting the rule." }),
      el("li", { text: "Only a CARB notification starts the operator’s duties. Check notification status on CARB’s CalSMP dashboard." }),
      el("li", { text: "Public data lags: plumes are published about 30 days after observation (median " + lag.median + " days in this data), so this is a history, not an alert." }),
      el("li", { text: "A plume near a landfill may come from a neighbouring source. " +
        (site.plume_count === 1 ? "This site has a single detection, a weak basis for attribution. "
          : "Detections here lie up to " + Math.max(0.1, site.max_km_from_center).toFixed(1) + " km from the site centre. ") +
        (site.nearby_other_sector ? site.nearby_other_sector + " nearby plume" + (site.nearby_other_sector === 1 ? " was" : "s were") + " classed as non-waste and not counted. " : "") +
        (site.name_confidence && site.name_confidence.indexOf("closed") >= 0 ? "The named facility is a closed landfill; treat the match with care. " : "") +
        (site.outlying_groups ? site.outlying_detections + " detection" + (site.outlying_detections === 1 ? " lies" : "s lie") + " more than 1 km from the main group and " + (site.outlying_detections === 1 ? "is" : "are") + " counted as part of this landfill. " : "") +
        (!site.official_name && site.nearest_record ? "No registered landfill lies within 3 km; the nearest EPA record is " + site.nearest_record.name + ", " + site.nearest_record.distance_km.toFixed(1) + " km away. " : "") +
        "Rates are estimates with the uncertainty shown." })
    ])
  ]));
  var nameSource = !site.name_source_url ? "not matched to a registered facility."
    : site.name_source_url.indexOf("calrecycle") >= 0 ? "CalRecycle SWIS." : "U.S. EPA Greenhouse Gas Reporting Program.";
  sheet.appendChild(el("footer", { class: "b-foot" }, [
    el("p", { text: "Plume data: Source: Carbon Mapper (data.carbonmapper.org), non-commercial use under its Terms of Use. Regulation: CARB Landfill Methane Regulation, 17 CCR 95460 et seq. (unofficial clean copy effective Jan 1, 2027; the official CCR text governs). Facility name: " + nameSource }),
    el("p", { text: "CalSMP dashboard: " + L.LINKS.calsmp })
  ]));

  // Keep the brief on one US Letter page: if the content is taller than the page,
  // shorten the chart, then tighten spacing. Measured at the printed width.
  function pageHeightPx() {
    var probe = el("div", { style: "position:absolute;visibility:hidden;height:11in;width:1px" });
    document.body.appendChild(probe);
    var h = probe.getBoundingClientRect().height;
    probe.remove();
    return h;
  }
  function contentHeight() {
    var prevMin = sheet.style.minHeight, prevH = sheet.style.height;
    sheet.style.minHeight = "0";
    sheet.style.height = "auto"; // print CSS fixes the sheet at 11in; measure the content instead
    var h = sheet.getBoundingClientRect().height;
    sheet.style.minHeight = prevMin;
    sheet.style.height = prevH;
    return h;
  }
  function fit() {
    var limit = pageHeightPx() - 4;
    sheet.classList.remove("is-tight");
    chartH = 160;
    drawChart(chartH);
    var minChart = notice ? 110 : 130; // the follow-up table needs more room than the checklist
    while (contentHeight() > limit && chartH > minChart) {
      chartH -= 10;
      drawChart(chartH);
    }
    if (contentHeight() > limit) sheet.classList.add("is-tight");
    sheet.classList.remove("is-tighter");
    if (contentHeight() > limit) sheet.classList.add("is-tighter");
  }
  fit();
  // Measure again once the real font is in: fallback monospace sets wider and taller.
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('400 11px "Chivo Mono"'), document.fonts.load('500 11px "Chivo Mono"'), document.fonts.load('800 11px "Chivo Mono"')
    ]).then(fit, fit);
  }
  window.addEventListener("beforeprint", fit);
})();
