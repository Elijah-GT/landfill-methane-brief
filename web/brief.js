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
  document.title = "Methane Docket brief: " + site.name;

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
      el("p", { class: "b-kicker", text: "Methane Docket site brief for local government staff" }),
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
      row("Period", range === "all" || emptyWindow ? "Full record since " + L.fmtDate(site.first_date)
        : "Last " + D.recent_months + " months, since " + L.fmtDate(D.recent_since)),
      row("Detections through", L.fmtDate(site.last_date)),
      notice ? row("CARB notice received", L.fmtDate(notice.date)) : null
    ])
  ]));

  // ---------- key figures ----------
  function fig(label, value, unit, sub) {
    return el("div", { class: "b-fig" }, [
      el("dt", { text: label }),
      el("dd", { class: "b-fig-value" }, [el("span", { class: "b-fig-num", text: value }), unit ? el("span", { class: "b-fig-unit", text: " " + unit }) : null]),
      sub ? el("dd", { class: "b-fig-sub", text: sub }) : null
    ]);
  }
  var periodWord = emptyWindow || range === "all" ? "since " + L.fmtDate(shown.first_date) : "in the last " + D.recent_months + " months";
  sheet.appendChild(el("dl", { class: "b-figs" }, [
    fig("Detections", String(shown.plume_count), null,
      periodWord + (range === "recent" && !emptyWindow && site.plume_count > shown.plume_count ? "; " + site.plume_count + " in the full record" : "")),
    fig("Largest rate", shown.max_rate_kg_h == null ? "n/a" : L.fmtRate(shown.max_rate_kg_h), shown.max_rate_kg_h == null ? null : "kg/h",
      shown.max_rate_kg_h == null ? "no published rate" : "± " + L.fmtRate(shown.max_rate_uncertainty_kg_h) + " kg/h, " + L.fmtDate(shown.max_rate_date)),
    fig("Median rate", shown.median_rate_kg_h == null ? "n/a" : L.fmtRate(shown.median_rate_kg_h), shown.median_rate_kg_h == null ? null : "kg/h",
      "of " + shown.quantified_count + " with a rate" + (withheld ? "; " + withheld + " without" : "")),
    fig("Last detected", L.fmtDate(site.last_date), null,
      kinds.space + " by satellite, " + kinds.aircraft + " from aircraft")
  ]));
  if (emptyWindow) {
    sheet.appendChild(el("p", { class: "b-alert", text: "No plume published here in the " + D.recent_months + " months to " + L.fmtDate(D.fetched_at) +
      " (not proof of no leak: it may not have been flown over). Showing the full record." }));
  }

  function cite(id) {
    var hit = null;
    window.LMB_CHECKLIST.groups.forEach(function (g) { g.items.forEach(function (it) { if (it.id === id) hit = it; }); });
    return hit ? hit.section + ", p. " + hit.page : "";
  }

  // ---------- with a notice: the follow-up steps come first, they are why the page was printed ----------
  if (notice) {
    var s = N.steps(notice.date, notice.type), both = notice.type === "unknown";
    var dueRows = s.dated.map(function (d) {
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
        c.short + ". ", el("span", { class: "cite", text: cite(c.item) })]);
    });
    var flags = [
      notice.carb ? "CARB ID: " + notice.carb + "." : null,
      notice.date < N.EFFECTIVE ? "This notice predates the amended rule (effective " + L.fmtDate(N.EFFECTIVE) + "); these due dates may not apply." : null,
      notice.date > today ? "Notice date is after the prepared date; check it." : null
    ].filter(Boolean);
    sheet.appendChild(el("section", { class: "b-block b-notice", "aria-labelledby": "b-duty-title" }, [
      el("h2", { id: "b-duty-title", text: "Follow-up after CARB’s notice of " + L.fmtDate(notice.date) +
        (notice.type === "controlled" ? " (controlled landfill)" : notice.type === "uncontrolled" ? " (uncontrolled landfill)" : " (landfill type not confirmed)") }),
      flags.length ? el("p", { class: "b-key", text: flags.join(" ") }) : null,
      el("table", { class: "b-table b-due-table" }, [
        el("thead", {}, [el("tr", {}, [
          el("th", { scope: "col", text: "Due" }), el("th", { scope: "col", text: "Step and rule" }),
          el("th", { scope: "col", text: "Ask the operator" }), el("th", { scope: "col", text: "Operator’s answer" })
        ])]),
        el("tbody", {}, dueRows)
      ]),
      cond.length ? el("p", { class: "b-key", text: "Depending on what the survey finds:" }) : null,
      cond.length ? el("ul", { class: "b-cond" }, cond) : null,
      cond.length ? el("p", { class: "b-ask" }, [el("strong", { text: "Ask: " }), "What did the survey find, and when was each problem fixed, re-tested and reported?"]) : null,
      el("p", { class: "b-key", text: "Due = notice date + the rule’s calendar days, with no weekend or holiday shift (the rule is silent). Confirm with CARB." })
    ]));
  }

  // ---------- chart ----------
  var chartBox = el("div", { class: "b-chart" });
  sheet.appendChild(el("section", { class: "b-block", "aria-labelledby": "b-chart-title" }, [
    el("div", { class: "b-block-head" }, [
      el("h2", { id: "b-chart-title", text: emptyWindow || range === "all" ? "Every published detection" : "Published detections, last " + D.recent_months + " months" }),
      el("p", { class: "b-key", text: "Dot: estimated rate. Bar: ± uncertainty. Square: no published rate. A gap means no published pass, not no leak." })
    ]),
    chartBox
  ]));
  var chartRange = range === "recent" && !emptyWindow ? { from: D.recent_since, to: D.fetched_at.slice(0, 10) } : {};
  function drawChart(h) {
    window.LMBChart.render(chartBox, shown, Object.assign({ width: 760, height: h, suffix: "-brief" }, chartRange));
  }
  var chartH = 150;
  drawChart(chartH);

  // ---------- most recent detections: specifics an operator can check against site records ----------
  var newest = shown.plumes.slice().reverse();
  var detBody = el("tbody");
  var detNote = el("p", { class: "b-key" });
  var detTable;
  function drawDetections(n) {
    detBody.textContent = "";
    // last resort on a crowded follow-up page: one line instead of the table
    if (detTable) detTable.hidden = n === 0;
    if (n === 0) {
      var p0 = newest[0];
      detNote.textContent = p0 ? "Latest: " + L.fmtDate(p0.date) + ", " + (p0.rate_kg_h == null ? "rate not published" : L.fmtRateUnc(p0.rate_kg_h, p0.uncertainty_kg_h)) +
        ", " + L.platform(p0.platform).label + ". The full list is in the app." : "";
      return;
    }
    newest.slice(0, n).forEach(function (p) {
      detBody.appendChild(el("tr", {}, [
        el("td", { class: "b-nowrap", text: L.fmtDate(p.date) }),
        el("td", { class: "num b-nowrap", text: p.rate_kg_h == null ? "not published" : L.fmtRate(p.rate_kg_h) + (p.uncertainty_kg_h != null ? " ± " + L.fmtRate(p.uncertainty_kg_h) : "") }),
        el("td", { text: L.platform(p.platform).label }),
        el("td", { class: "num b-nowrap", text: p.lat.toFixed(4) + ", " + p.lon.toFixed(4) }),
        el("td", { class: "num", text: p.km_from_center.toFixed(1) })
      ]));
    });
    var shownN = Math.min(n, newest.length);
    detNote.textContent = shownN < newest.length
      ? "The " + shownN + " most recent of " + newest.length + ". The full list, with Carbon Mapper plume IDs, is in the app."
      : "All " + newest.length + " detection" + (newest.length === 1 ? "" : "s") + (range === "recent" && !emptyWindow ? " in the window" : "") + ". Plume IDs are in the app.";
  }
  var detSection = el("section", { class: "b-block", "aria-labelledby": "b-det-title" }, [
    el("div", { class: "b-block-head" }, [el("h2", { id: "b-det-title", text: "Most recent detections" }), detNote]),
    detTable = el("table", { class: "b-table b-det-table" }, [
      el("thead", {}, [el("tr", {}, [
        el("th", { scope: "col", text: "Observed" }), el("th", { scope: "col", class: "num", text: "Rate, kg/h" }),
        el("th", { scope: "col", text: "Seen by" }), el("th", { scope: "col", class: "num", text: "Plume location" }),
        el("th", { scope: "col", class: "num", text: "Km from centre" })
      ])]),
      detBody
    ])
  ]);
  sheet.appendChild(detSection);
  var detRows = notice ? 6 : 10;
  drawDetections(detRows);

  // ---------- where detections repeat ----------
  // Spots come from web/spots.js (shared with the app): detections within 200 m of each other
  // on two or more different days.
  var SPOT_KM = window.LMBSpots.SPOT_KM;
  function findSpots(list) { return window.LMBSpots.findSpots(list); }
  var spots = findSpots(shown.plumes);
  var spotBody = el("tbody");
  var spotNote = el("p", { class: "b-key" });
  var spotTable;
  function drawSpots(n) {
    spotBody.textContent = "";
    spots.slice(0, n).forEach(function (sp, i) {
      spotBody.appendChild(el("tr", {}, [
        el("td", { class: "b-spot-n", text: String(i + 1) }),
        el("td", { class: "num b-nowrap", text: sp.lat.toFixed(4) + ", " + sp.lon.toFixed(4) }),
        el("td", { class: "b-nowrap" }, [el("strong", { text: sp.n + " detections" }), el("br"), sp.days + " different days"]),
        el("td", { class: "b-nowrap", text: L.fmtDate(sp.first) + " to " + L.fmtDate(sp.last) }),
        el("td", { class: "num b-nowrap", text: sp.top ? L.fmtRate(sp.top.rate_kg_h) + " ± " + L.fmtRate(sp.top.uncertainty_kg_h) : "not published" }),
        el("td", { text: "What is at this spot, and has it been checked or repaired since " + L.fmtDate(sp.last) + "?" })
      ]));
    });
    var share = spots.length ? Math.round(100 * spots[0].n / Math.max(1, shown.plume_count)) : 0;
    spotNote.textContent = spots.length
      ? (spots[0].n + " of " + shown.plume_count + " detections (" + share + "%) fall within " + Math.round(SPOT_KM * 1000) + " m of one spot.")
      : "No spot had detections on more than one day in this period.";
    if (spotTable) spotTable.hidden = !spots.length;
  }
  // the repeat spots are the headline finding, so they sit above the full detection list
  sheet.insertBefore(el("section", { class: "b-block", "aria-labelledby": "b-spot-title" }, [
    el("div", { class: "b-block-head" }, [el("h2", { id: "b-spot-title", text: "Where detections repeat" }), spotNote]),
    spotTable = el("table", { class: "b-table b-spot-table" }, [
      el("thead", {}, [el("tr", {}, [
        el("th", { scope: "col", text: "" }), el("th", { scope: "col", class: "num", text: "Spot (within " + Math.round(SPOT_KM * 1000) + " m)" }),
        el("th", { scope: "col", text: "Seen" }), el("th", { scope: "col", text: "First to last" }),
        el("th", { scope: "col", class: "num", text: "Largest, kg/h" }), el("th", { scope: "col", text: "Ask the operator" })
      ])]),
      spotBody
    ])
  ]), detSection);
  var spotRows = notice ? 2 : 3;
  drawSpots(spotRows);

  // ---------- sources, and the limits of the data in one line ----------
  var attribution = site.plume_count === 1 ? "a single detection is a weak basis for attribution"
    : "detections lie up to " + Math.max(0.1, site.max_km_from_center).toFixed(1) + " km from the site centre" +
      (site.nearby_other_sector ? " and " + site.nearby_other_sector + " nearby non-waste plume" + (site.nearby_other_sector === 1 ? " is" : "s are") + " not counted" : "");
  var lag = D.publication_lag_days;
  var nameSource = !site.name_source_url ? "not matched to a registered facility (nearest record named in the app)."
    : site.name_source_url.indexOf("calrecycle") >= 0 ? "CalRecycle SWIS." : "U.S. EPA Greenhouse Gas Reporting Program.";
  sheet.appendChild(el("footer", { class: "b-foot" }, [
    el("p", { class: "b-limits" }, [el("strong", { text: "About this data. " }),
      "Informational, not a compliance determination; only CARB’s notice starts the operator’s duties (§ 95469(b)). Plumes are published about " + lag.median +
      " days after observation. A plume may come from a neighbouring source; " + attribution + ". Rates are estimates (±), and detections follow when aircraft and satellites flew over."]),
    el("p", { text: "Sources: Carbon Mapper (data.carbonmapper.org), non-commercial use under its Terms of Use. CARB Landfill Methane Regulation, 17 CCR 95460 et seq. (unofficial clean copy effective Jan 1, 2027; the official CCR text governs). Facility name: " + nameSource +
      " Notification status: CARB CalSMP dashboard, " + L.LINKS.calsmp })
  ]));

  // Keep the brief on one US Letter page: if the content is taller than the page, show fewer
  // detection rows, then shorten the chart, then tighten spacing. Measured at the printed width.
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
    sheet.classList.remove("is-tighter");
    var maxRows = notice ? 6 : 10;
    spotRows = notice ? 2 : 3;
    drawSpots(spotRows);
    detRows = maxRows;
    drawDetections(detRows);
    chartH = 150;
    drawChart(chartH);
    var over = function () { return contentHeight() > limit; };
    // Cheapest first: tighter spacing keeps all the content. Then fewer rows and a shorter
    // chart (never under 130 px, so it stays readable), then smaller type, and as a last
    // resort the detection table becomes one line.
    if (over()) sheet.classList.add("is-tight");
    while (over() && detRows > 5) { detRows -= 1; drawDetections(detRows); }
    while (over() && chartH > 130) { chartH -= 10; drawChart(chartH); }
    while (over() && detRows > 3) { detRows -= 1; drawDetections(detRows); }
    if (over()) sheet.classList.add("is-tighter");
    while (over() && spotRows > 1) { spotRows -= 1; drawSpots(spotRows); }
    if (over()) { detRows = 0; drawDetections(0); }
    while (over() && chartH > 110) { chartH -= 10; drawChart(chartH); }   // very last: a short chart (2 y labels)
    // Then give back what still fits: chart height first, then rows.
    while (detRows > 0 && chartH < 150) { drawChart(chartH + 10); if (over()) { drawChart(chartH); break; } chartH += 10; }
    while (detRows > 0 && detRows < maxRows) { drawDetections(detRows + 1); if (over()) { drawDetections(detRows); break; } detRows += 1; }
    // Normal-size type matters more than an extra row: undo the smaller type if dropping rows (to 3) makes room.
    if (sheet.classList.contains("is-tighter") && detRows > 0) {
      var keepRows = detRows, keepChart = chartH;
      sheet.classList.remove("is-tighter");
      while (over() && detRows > 3) { detRows -= 1; drawDetections(detRows); }
      while (over() && chartH > 130) { chartH -= 10; drawChart(chartH); }
      if (over()) {
        sheet.classList.add("is-tighter");
        detRows = keepRows; drawDetections(keepRows);
        chartH = keepChart; drawChart(keepChart);
      }
    }
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
