// Main screen: site list + map on the left, the selected site on the right.
// Selection lives in the URL hash (#site=<id>) so a link opens the same landfill.
(function () {
  "use strict";
  var L = window.LMB, D = L.data();
  var listEl = document.getElementById("site-list");
  var detailEl = document.getElementById("detail");
  var statusEl = document.getElementById("sr-status"); // kept across re-renders
  var map = null, markers = {};

  function showState(kind, head, msg) {
    detailEl.textContent = "";
    var attrs = { class: "state state--" + kind };
    if (kind === "error") attrs.role = "alert";
    detailEl.appendChild(L.el("div", attrs, [L.el("h1", { text: head }), L.el("p", { text: msg })]));
    listEl.textContent = "";
    document.getElementById("map-wrap").hidden = true;
  }

  if (!D) {
    showState("error", "The landfill data did not load", "The file web/data/sites.js is missing or broken. From the project folder run: python pipeline/build_sites.py, then reload this page.");
    return;
  }
  if (!D.sites.length) {
    showState("empty", "No landfills to show yet", "The snapshot holds no waste-sector plumes for this area, so there is nothing to list. Run python pipeline/fetch_plumes.py with a wider --bbox, then python pipeline/build_sites.py.");
    return;
  }

  // ---------- rail: note, list, map ----------
  document.getElementById("rail-note").textContent =
    L.plural(D.waste_plumes, "waste-sector plume") + " seen from aircraft and satellites between " +
    L.fmtDate(D.waste_oldest_observation || D.oldest_observation) + " and " + L.fmtDate(D.waste_newest_observation || D.newest_observation) +
    ", grouped into sites where detections fall within " + D.cluster_km + " km of each other.";

  listEl.textContent = "";
  D.sites.forEach(function (s) {
    var btn = L.el("a", { class: "site", href: "#site=" + s.id, "data-site": s.id }, [
      L.el("span", { class: "site-name", text: s.name }),
      L.el("span", { class: "site-sub", text: s.county || (s.nearest_record ? "Unmatched; " + s.nearest_record.distance_km + " km from " + s.nearest_record.name : "No registered landfill within 10 km") }),
      L.el("span", { class: "site-count" }, [
        L.el("span", { class: "site-figure", text: String(s.plume_count) }),
        L.el("span", { class: "site-unit", text: s.plume_count === 1 ? " plume" : " plumes" })
      ]),
      L.el("span", { class: "site-sub site-last", text: "Last seen " + L.fmtDate(s.last_date) })
    ]);
    var hay = [s.name, s.official_name, s.county, s.operator, s.nearest_record && s.nearest_record.name].filter(Boolean).join(" ").toLowerCase();
    listEl.appendChild(L.el("li", { "data-search": hay }, [btn]));
  });

  // Filter the list as you type. The map keeps every site; the list is the control.
  (function initFilter() {
    var box = document.getElementById("filter"), input = document.getElementById("site-filter"), count = document.getElementById("filter-count");
    if (D.sites.length < 12) return;
    box.hidden = false;
    function apply() {
      var q = input.value.trim().toLowerCase(), shown = 0;
      Array.prototype.forEach.call(listEl.children, function (li) {
        var hit = !q || li.getAttribute("data-search").indexOf(q) >= 0;
        li.hidden = !hit;
        if (hit) shown++;
      });
      if (shown) listEl.removeAttribute("data-empty"); else listEl.setAttribute("data-empty", "");
      count.textContent = q ? (shown ? "Showing " + shown + " of " + D.sites.length + " sites" : "No site matches “" + input.value.trim() + "”")
        : D.sites.length + " sites, most detections first";
    }
    input.addEventListener("input", apply);
    apply();
  })();

  function initMap() {
    var box = document.getElementById("map");
    if (!window.L || !window.L.map) { document.getElementById("map-wrap").hidden = true; return; }
    map = window.L.map(box, { scrollWheelZoom: false, attributionControl: true, zoomSnap: 0.25, keyboard: false });
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    var bounds = [];
    D.sites.forEach(function (s) {
      var r = Math.min(22, 4 + Math.sqrt(s.plume_count) * 1.3);
      var mk = window.L.circleMarker([s.lat, s.lon], { radius: r, className: "site-marker", weight: 2 });
      mk.bindTooltip(s.name + ": " + L.plural(s.plume_count, "plume"));
      mk.on("click", function () { window.location.hash = "site=" + s.id; });
      mk.addTo(map);
      markers[s.id] = mk;
      bounds.push([s.lat, s.lon]);
    });
    map.fitBounds(bounds, { padding: [24, 24] });
    initMapToggle(bounds);
  }

  // Expand the map to fill the window. The rest of the page is made inert while it is open,
  // so Tab stays on the map's controls. Escape, the button or picking a site closes it.
  var mapOpen = false;
  function setMapExpanded(open, bounds, keepFocus) {
    var wrap = document.getElementById("map-wrap");
    var btn = document.getElementById("map-toggle");
    mapOpen = open;
    wrap.classList.toggle("is-expanded", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = open ? "Close map" : "Expand map";
    var outside = document.querySelectorAll(".bar, .skip, #detail, .about, .foot, .rail-title, .rail-note, #site-list");
    Array.prototype.forEach.call(outside, function (n) { n.inert = open; });
    if (open) map.scrollWheelZoom.enable(); else map.scrollWheelZoom.disable();
    map.invalidateSize();
    map.fitBounds(bounds, { padding: open ? [48, 48] : [24, 24] });
    if (!keepFocus) btn.focus();
  }
  function initMapToggle(bounds) {
    var btn = document.getElementById("map-toggle");
    btn.hidden = false;
    btn.addEventListener("click", function () { setMapExpanded(!mapOpen, bounds); });
    document.addEventListener("keydown", function (e) {
      if (mapOpen && e.key === "Escape") setMapExpanded(false, bounds);
    });
    // Picking a site on the big map closes it so the site's details show (route() then moves focus).
    window.addEventListener("hashchange", function () { if (mapOpen) setMapExpanded(false, bounds, true); });
  }

  // ---------- detail ----------
  function stat(label, figure, unit, sub) {
    return L.el("div", { class: "stat" }, [
      L.el("dt", { class: "stat-label", text: label }),
      L.el("dd", { class: "stat-value" }, [
        L.el("span", { class: "stat-figure", text: figure }),
        unit ? L.el("span", { class: "stat-unit", text: unit }) : null
      ]),
      sub ? L.el("dd", { class: "stat-sub", text: sub }) : null
    ]);
  }

  function plumeTable(site) {
    var rows = site.plumes.slice().reverse().map(function (p) {
      return L.el("tr", {}, [
        L.el("td", { text: L.fmtDate(p.date) }),
        L.el("td", { class: "num", text: p.rate_kg_h == null ? "not published" : L.fmtRate(p.rate_kg_h) }),
        L.el("td", { class: "num", text: p.uncertainty_kg_h == null ? "" : "± " + L.fmtRate(p.uncertainty_kg_h) }),
        L.el("td", { text: L.platform(p.platform).label }),
        L.el("td", { class: "num", text: p.km_from_center.toFixed(1) }),
        L.el("td", { class: "mono-id", text: p.plume_id })
      ]);
    });
    return L.el("div", { class: "table-wrap", role: "region", "aria-label": "All detections, scrollable", tabindex: "0" }, [
      L.el("table", { class: "table" }, [
        L.el("caption", { class: "visually-hidden", text: "Every detection at " + site.name + ", newest first" }),
        L.el("thead", {}, [L.el("tr", {}, [
          L.el("th", { scope: "col", text: "Observed" }),
          L.el("th", { scope: "col", class: "num", text: "Rate, kg/h" }),
          L.el("th", { scope: "col", class: "num", text: "Uncertainty" }),
          L.el("th", { scope: "col", text: "Seen by" }),
          L.el("th", { scope: "col", class: "num", text: "Km from site centre" }),
          L.el("th", { scope: "col", text: "Carbon Mapper plume ID" })
        ])]),
        L.el("tbody", {}, rows)
      ])
    ]);
  }

  function renderSite(site) {
    var kinds = L.kindCounts(site);
    var withheld = site.plume_count - site.quantified_count;
    detailEl.textContent = "";

    // head
    var meta = L.el("dl", { class: "meta" }, [
      site.official_name ? L.el("div", {}, [L.el("dt", { text: "Registered name" }), L.el("dd", { text: site.official_name })]) : null,
      site.county ? L.el("div", {}, [L.el("dt", { text: "County" }), L.el("dd", { text: site.county })]) : null,
      site.operator ? L.el("div", {}, [L.el("dt", { text: "Owner or parent company" }), L.el("dd", { text: site.operator })]) : null,
      L.el("div", {}, [L.el("dt", { text: "Site centre" }), L.el("dd", { class: "num", text: site.lat.toFixed(4) + ", " + site.lon.toFixed(4) })])
    ]);
    var head = L.el("header", { class: "detail-head" }, [
      L.el("div", { class: "detail-title" }, [L.el("h1", { text: site.name }), meta]),
      L.el("div", { class: "actions" }, [
        L.el("a", { class: "btn btn--primary", href: "brief.html#site=" + site.id, text: "Generate one-page brief" }),
        L.el("a", { class: "btn", href: L.LINKS.calsmp, rel: "noopener", target: "_blank" }, [
          "Check CARB notices", L.el("span", { class: "visually-hidden", text: " on the CalSMP dashboard (opens in a new tab)" })
        ])
      ])
    ]);
    detailEl.appendChild(head);
    if (site.name_source_url) {
      detailEl.appendChild(L.el("p", { class: "note" }, [
        "Name matched to the registered facility " + site.name_distance_km.toFixed(1) + " km from the site centre (",
        L.el("a", { href: site.name_source_url, rel: "noopener", target: "_blank" }, ["source record", L.el("span", { class: "visually-hidden", text: " (opens in a new tab)" })]),
        ")." + (site.name_confidence && site.name_confidence.indexOf("closed") >= 0 ? " This is a closed landfill with a single detection; treat the match with care." : "")
      ]));
    } else {
      var nr = site.nearest_record;
      detailEl.appendChild(L.el("p", { class: "note" }, nr ? [
        "No registered landfill lies within 3 km of these detections, so the site is not named. The nearest EPA landfill record is " +
          nr.name + ", " + nr.distance_km.toFixed(1) + " km from the site centre (",
        L.el("a", { href: nr.source_url, rel: "noopener", target: "_blank" }, ["source record", L.el("span", { class: "visually-hidden", text: " (opens in a new tab)" })]),
        "). EPA locations are sometimes an office address rather than the landfill itself."
      ] : ["No registered landfill was matched within 10 km of these detections."]));
    }
    if (site.outlying_groups) {
      detailEl.appendChild(L.el("p", { class: "note", text: "Includes " + L.plural(site.outlying_detections, "detection") +
        " more than 1 km from the main group but within 3 km of this landfill’s registered location, counted here as part of the same landfill. " +
        "The furthest detection is " + site.max_km_from_center.toFixed(1) + " km from the site centre; a neighbouring source is possible." }));
    }
    if (site.nearby_other_sector) {
      detailEl.appendChild(L.el("p", { class: "note", text: L.plural(site.nearby_other_sector, "other plume") +
        " within 1 km of these detections " + (site.nearby_other_sector === 1 ? "was" : "were") +
        " classed by Carbon Mapper as a non-waste source and " + (site.nearby_other_sector === 1 ? "is" : "are") + " not counted here." }));
    }

    // stats
    detailEl.appendChild(L.el("dl", { class: "stats" }, [
      stat("Plumes detected", String(site.plume_count), null, site.first_date === site.last_date ? "on " + L.fmtDate(site.first_date) : L.fmtDate(site.first_date) + " to " + L.fmtDate(site.last_date)),
      stat("Median rate", site.median_rate_kg_h == null ? "n/a" : L.fmtRate(site.median_rate_kg_h), site.median_rate_kg_h == null ? null : "kg/h",
        "of " + L.plural(site.quantified_count, "plume") + " with a published rate"),
      stat("Largest rate", site.max_rate_kg_h == null ? "n/a" : L.fmtRate(site.max_rate_kg_h), site.max_rate_kg_h == null ? null : "kg/h",
        site.max_rate_kg_h == null ? null : "± " + L.fmtRate(site.max_rate_uncertainty_kg_h) + " kg/h, " + L.fmtDate(site.max_rate_date)),
      stat("Seen from aircraft", String(kinds.aircraft), null, "and " + kinds.space + " from satellites")
    ]));

    // timeline
    var chartBox = L.el("div", { class: "chart-box" });
    var legend = L.el("ul", { class: "legend", "aria-label": "Chart key" }, [
      L.el("li", {}, [L.el("span", { class: "key key--dot", "aria-hidden": "true" }), "One detection at its estimated rate"]),
      L.el("li", {}, [L.el("span", { class: "key key--whisker", "aria-hidden": "true" }), "Published uncertainty (±)"]),
      withheld ? L.el("li", {}, [L.el("span", { class: "key key--square", "aria-hidden": "true" }), "Detected, rate not published (" + withheld + ")"]) : null
    ]);
    detailEl.appendChild(L.el("section", { class: "block", "aria-labelledby": "timeline-title" }, [
      L.el("h2", { id: "timeline-title", text: site.first_date.slice(0, 4) === site.last_date.slice(0, 4) ? "Every detection, " + site.first_date.slice(0, 4) : "Every detection, " + site.first_date.slice(0, 4) + " to " + site.last_date.slice(0, 4) }),
      L.el("p", { class: "lede", text: "Each dot is one plume Carbon Mapper published near this site; dots from the same day are spread a few pixels apart. Gaps mean no flight or satellite pass was published, not that nothing leaked." }),
      legend, chartBox,
      L.el("details", { class: "more" }, [
        L.el("summary", { text: "All " + L.plural(site.plume_count, "detection") + " as a table" }),
        plumeTable(site)
      ])
    ]));
    window.LMBChart.render(chartBox, site);

    // checklist
    var dutiesBox = L.el("div", { class: "checklist" });
    detailEl.appendChild(L.el("section", { class: "block", "aria-labelledby": "duties-title" }, [
      L.el("h2", { id: "duties-title", text: "What the 2027 rule asks after a CARB notice" }),
      L.el("p", { class: "lede", text: "Applies from January 1, 2027. Use it to know what to ask the operator, not to judge them." }),
      dutiesBox
    ]));
    window.LMBChecklist.render(dutiesBox);

    // selection state
    Array.prototype.forEach.call(listEl.querySelectorAll(".site"), function (a) {
      if (a.getAttribute("data-site") === site.id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    Object.keys(markers).forEach(function (id) {
      var path = markers[id].getElement && markers[id].getElement();
      if (path) path.classList.toggle("is-current", id === site.id);
    });
    document.title = site.name + ": methane plume history and the 2027 rule";
  }

  function route(focus) {
    var asked = L.siteIdFromHash();
    var site = L.siteById(asked) || D.sites[0];
    renderSite(site);
    if (asked && asked !== site.id) {
      history.replaceState(null, "", "#site=" + site.id);
      detailEl.insertBefore(L.el("p", { class: "note", text: "No landfill matches “" + asked + "”, so the site with the most detections is shown." }), detailEl.children[1]);
    }
    if (statusEl) { detailEl.prepend(statusEl); statusEl.textContent = "Showing " + site.name; }
    if (focus) {
      var h1 = detailEl.querySelector("h1");
      h1.setAttribute("tabindex", "-1");
      h1.focus({ preventScroll: true });
      detailEl.scrollIntoView({ block: "start" });
    }
  }

  // ---------- about facts ----------
  var lag = D.publication_lag_days;
  var facts = document.getElementById("data-facts");
  [
    ["Plume data", "Carbon Mapper public catalog, fetched " + L.fmtDate(D.fetched_at) + ". Newest observation in this snapshot: " + L.fmtDate(D.newest_observation) + "."],
    ["Publication delay", "Carbon Mapper releases data about 30 days after each observation. In this snapshot, plumes observed since 2025 were published at least " + lag.min + " days later (median " + lag.median + " days)."],
    ["Rates", "Estimated emission rate in kilograms of methane per hour, with Carbon Mapper’s published ± uncertainty (wind and plume-enhancement error). Rounded to two significant figures."],
    ["Instruments", "Aircraft (Global Airborne Observatory, AVIRIS-NG, AVIRIS-3) and satellites (Planet’s Tanager-1, NASA’s EMIT on the ISS). Each saw only the moments it flew over."],
    ["Sites", "Waste-sector plumes (sector 6A, solid waste disposal on land) grouped when a chain of detections lies within " + D.cluster_km + " km. Names come from EPA GHGRP and CalRecycle records, with the source linked on each site."]
  ].forEach(function (f) {
    facts.appendChild(L.el("div", {}, [L.el("dt", { text: f[0] }), L.el("dd", { text: f[1] })]));
  });

  initMap();
  route(false);
  window.addEventListener("hashchange", function () { route(true); });
  var lastW = window.innerWidth, timer = null;
  window.addEventListener("resize", function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (Math.abs(window.innerWidth - lastW) < 40) return;
      lastW = window.innerWidth;
      var box = detailEl.querySelector(".chart-box"), site = L.siteById(L.siteIdFromHash()) || D.sites[0];
      if (box) window.LMBChart.render(box, site);
    }, 200);
  });
})();
