// One-page printable brief for the site named in the URL hash (#site=<id>).
(function () {
  "use strict";
  var L = window.LMB, D = L.data();
  var sheet = document.getElementById("sheet");
  var el = L.el;

  document.getElementById("print").addEventListener("click", function () { window.print(); });

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
  var today = new Date().toISOString().slice(0, 10);

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
  var summary = "Between " + L.fmtDate(site.first_date) + " and " + L.fmtDate(site.last_date) + ", aircraft and satellites detected " +
    L.plural(site.plume_count, "methane plume") + " at this site (" + kinds.aircraft + " from aircraft, " + kinds.space + " from satellites). ";
  if (site.quantified_count) {
    summary += "The median published rate was " + L.fmtRate(site.median_rate_kg_h) + " kg/h; the largest was " +
      L.fmtRateUnc(site.max_rate_kg_h, site.max_rate_uncertainty_kg_h) + " on " + L.fmtDate(site.max_rate_date) + ". ";
  }
  if (withheld) summary += L.plural(withheld, "detection") + " had no published rate.";
  sheet.appendChild(el("p", { class: "b-summary", text: summary }));

  // chart + per-year
  var chartBox = el("div", { class: "b-chart" });
  var years = Object.keys(site.per_year);
  var yearLine = el("p", { class: "b-years", text: "Detections per year: " + years.map(function (y) { return y + ": " + site.per_year[y]; }).join(", ") + "." });
  sheet.appendChild(el("section", { class: "b-block", "aria-labelledby": "b-chart-title" }, [
    el("h2", { id: "b-chart-title", text: "Every published detection" }),
    el("p", { class: "b-key", text: "Dot: estimated rate. Bar: published ± uncertainty. Square: detected, rate not published. A gap means no published pass, not no leak." }),
    chartBox, yearLine
  ]));
  window.LMBChart.render(chartBox, site, { width: 760, height: 185, suffix: "-brief" });

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
      el("li", { text: "A plume near a landfill may come from a neighbouring source. Detections here lie up to " + site.max_km_from_center.toFixed(1) + " km from the site centre. Rates are estimates with the uncertainty shown." })
    ])
  ]));
  var nameSource = !site.name_source_url ? "not matched to a registered facility."
    : site.name_source_url.indexOf("calrecycle") >= 0 ? "CalRecycle SWIS." : "U.S. EPA Greenhouse Gas Reporting Program.";
  sheet.appendChild(el("footer", { class: "b-foot" }, [
    el("p", { text: "Plume data: Source: Carbon Mapper (data.carbonmapper.org), non-commercial use under the Carbon Mapper Terms of Use. Regulation: California Air Resources Board, Landfill Methane Regulation, 17 CCR 95460 et seq., summarised from CARB’s unofficial clean copy effective Jan 1, 2027; the official CCR text governs. Facility name: " + nameSource }),
    el("p", { text: "CalSMP dashboard: " + L.LINKS.calsmp })
  ]));
})();
