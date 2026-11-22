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

  document.getElementById("back").setAttribute("href", "index.html#site=" + site.id);
  document.title = "Methane brief: " + site.name;

  var kinds = L.kindCounts(site);
  var withheld = site.plume_count - site.quantified_count;
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
      row("Detections through", L.fmtDate(site.last_date))
    ])
  ]));

  // summary sentence
  var who = kinds.aircraft && kinds.space ? "aircraft and satellites" : kinds.space ? (kinds.space === 1 ? "a satellite" : "satellites") : (kinds.aircraft === 1 ? "an aircraft" : "aircraft");
  var when = site.first_date === site.last_date ? "On " + L.fmtDate(site.first_date)
    : "Between " + L.fmtDate(site.first_date) + " and " + L.fmtDate(site.last_date);
  var summary = when + ", " + who + " detected " + L.plural(site.plume_count, "methane plume") + " at this site" +
    (kinds.aircraft && kinds.space ? " (" + kinds.aircraft + " from aircraft, " + kinds.space + " from satellites)" : "") + ". ";
  if (site.quantified_count === 1) {
    summary += "Its published rate was " + L.fmtRateUnc(site.max_rate_kg_h, site.max_rate_uncertainty_kg_h) + ". ";
  } else if (site.quantified_count > 1) {
    summary += "The median published rate was " + L.fmtRate(site.median_rate_kg_h) + " kg/h; the largest was " +
      L.fmtRateUnc(site.max_rate_kg_h, site.max_rate_uncertainty_kg_h) + " on " + L.fmtDate(site.max_rate_date) + ". ";
  }
  if (withheld) summary += L.plural(withheld, "detection") + " had no published rate.";
  sheet.appendChild(el("p", { class: "b-summary", text: summary }));

  // chart + per-year
  var chartBox = el("div", { class: "b-chart" });
  sheet.appendChild(el("section", { class: "b-block", "aria-labelledby": "b-chart-title" }, [
    el("h2", { id: "b-chart-title", text: "Every published detection" }),
    el("p", { class: "b-key", text: "Dot: estimated rate (same-day dots spread). Bar: ± uncertainty. Square: no published rate. Gap: no published pass." }),
    chartBox
  ]));
  var chartH = 160;
  window.LMBChart.render(chartBox, site, { width: 760, height: chartH, suffix: "-brief" });

  // checklist
  var duties = el("div", { class: "b-duties" });
  sheet.appendChild(el("section", { class: "b-block", "aria-labelledby": "b-duty-title" }, [
    el("h2", { id: "b-duty-title", text: "What California’s 2027 rule asks after a CARB notice" }),
    duties
  ]));
  window.LMBChecklist.render(duties, { compact: true });

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
        (site.near_of ? "These detections lie more than 1 km from the main group at " + site.near_of.name + " and are counted separately; they may come from that landfill or a neighbouring source. " : "") +
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
    window.LMBChart.render(chartBox, site, { width: 760, height: chartH, suffix: "-brief" });
    while (contentHeight() > limit && chartH > 130) {
      chartH -= 10;
      window.LMBChart.render(chartBox, site, { width: 760, height: chartH, suffix: "-brief" });
    }
    if (contentHeight() > limit) sheet.classList.add("is-tight");
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
