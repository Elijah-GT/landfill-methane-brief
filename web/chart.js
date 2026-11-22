// Plume timeline: one dot per detection at its emission rate, a whisker for the
// published uncertainty, and a strip of hollow squares for detections whose rate
// Carbon Mapper did not publish. Inline SVG written for the data; colours come
// from CSS classes (chart.css rules in app.css / brief.css), never literals.
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function niceMax(v) {
    if (!(v > 0)) return 100;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * mag >= v) return steps[i] * mag;
    return 10 * mag;
  }

  function t(iso) { return Date.parse(iso.length === 10 ? iso + "T00:00:00Z" : iso); }

  function describe(site) {
    var L = window.LMB;
    var rated = site.plumes.filter(function (p) { return p.rate_kg_h != null; });
    var s = "Timeline of " + L.plural(site.plume_count, "detected plume") + " at " + site.name +
      ", " + L.fmtDate(site.first_date) + " to " + L.fmtDate(site.last_date) + ". ";
    if (rated.length) {
      var min = Math.min.apply(null, rated.map(function (p) { return p.rate_kg_h; }));
      s += "Published rates range from " + L.fmtRate(min) + " to " + L.fmtRate(site.max_rate_kg_h) +
        " kg/h, median " + L.fmtRate(site.median_rate_kg_h) + " kg/h. ";
    }
    var withheld = site.plume_count - site.quantified_count;
    if (withheld) s += L.plural(withheld, "detection") + " had no published rate. ";
    var years = Object.keys(site.per_year);
    s += "Detections per year: " + years.map(function (y) { return y + ": " + site.per_year[y]; }).join(", ") + ".";
    return s;
  }

  function render(container, site, opts) {
    opts = opts || {};
    // Draw at the container's own width (within limits) so labels stay readable on phones.
    var avail = container.clientWidth ? container.clientWidth - 2 * 12 : 720;
    var W = opts.width || Math.max(340, Math.min(720, avail));
    var H = opts.height || (W < 520 ? 240 : 280);
    var m = { l: 64, r: 16, t: 32, b: 64 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var firstYear = +site.first_date.slice(0, 4), lastYear = +site.last_date.slice(0, 4);
    var x0 = Date.UTC(firstYear, 0, 1), x1 = Date.UTC(lastYear + 1, 0, 1);
    var rated = site.plumes.filter(function (p) { return p.rate_kg_h != null; });
    var top = niceMax(Math.max.apply(null, [0].concat(rated.map(function (p) {
      return p.rate_kg_h + (p.uncertainty_kg_h || 0);
    }))));
    var X = function (ms) { return m.l + (ms - x0) / (x1 - x0) * pw; };
    var Y = function (v) { return m.t + ph - v / top * ph; };

    var id = "chart-" + site.id + (opts.suffix || "");
    var svg = svgEl("svg", {
      viewBox: "0 0 " + W + " " + H, class: "chart", role: "img",
      "aria-labelledby": id + "-title " + id + "-desc", preserveAspectRatio: "xMidYMid meet"
    });
    var title = svgEl("title", { id: id + "-title" });
    title.textContent = "Methane plume emission rates over time, " + site.name;
    var desc = svgEl("desc", { id: id + "-desc" });
    desc.textContent = describe(site);
    svg.appendChild(title);
    svg.appendChild(desc);

    // horizontal grid and y labels
    for (var i = 0; i <= 4; i++) {
      var v = top / 4 * i, y = Y(v);
      svg.appendChild(svgEl("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, class: i === 0 ? "chart-axis" : "chart-grid" }));
      var lab = svgEl("text", { x: m.l - 8, y: y + 4, class: "chart-label", "text-anchor": "end" });
      lab.textContent = window.LMB.numFmt.format(v);
      svg.appendChild(lab);
    }
    var unit = svgEl("text", { x: m.l, y: m.t - 14, class: "chart-label", "text-anchor": "start" });
    unit.textContent = "Emission rate, kg of methane per hour";
    svg.appendChild(unit);

    // year ticks
    var span = lastYear - firstYear + 1, every = span > (W < 520 ? 4 : 8) ? 2 : 1;
    for (var yr = firstYear; yr <= lastYear + 1; yr++) {
      var xx = X(Date.UTC(yr, 0, 1));
      svg.appendChild(svgEl("line", { x1: xx, x2: xx, y1: m.t + ph, y2: m.t + ph + 6, class: "chart-axis" }));
      if (yr <= lastYear && (yr - firstYear) % every === 0) {
        var yl = svgEl("text", { x: X(Date.UTC(yr, 6, 1)), y: m.t + ph + 20, class: "chart-label", "text-anchor": "middle" });
        yl.textContent = String(yr);
        svg.appendChild(yl);
      }
    }

    // detections with no published rate, as a strip under the axis
    var stripY = m.t + ph + 42;
    var withheld = site.plumes.filter(function (p) { return p.rate_kg_h == null; });
    var sl = svgEl("text", { x: m.l - 8, y: stripY + 4, class: "chart-label", "text-anchor": "end" });
    sl.textContent = "no rate";
    svg.appendChild(sl);
    svg.appendChild(svgEl("line", { x1: m.l, x2: W - m.r, y1: stripY, y2: stripY, class: "chart-grid" }));
    withheld.forEach(function (p) {
      var cx = X(t(p.observed));
      svg.appendChild(svgEl("rect", { x: cx - 4, y: stripY - 4, width: 8, height: 8, class: "chart-withheld" }));
    });

    // uncertainty whiskers, then dots on top
    rated.forEach(function (p) {
      var cx = X(t(p.observed)), u = p.uncertainty_kg_h || 0;
      var ya = Y(Math.max(0, p.rate_kg_h - u)), yb = Y(p.rate_kg_h + u);
      svg.appendChild(svgEl("line", { x1: cx, x2: cx, y1: ya, y2: yb, class: "chart-whisker" }));
      svg.appendChild(svgEl("line", { x1: cx - 3, x2: cx + 3, y1: yb, y2: yb, class: "chart-whisker" }));
      svg.appendChild(svgEl("line", { x1: cx - 3, x2: cx + 3, y1: ya, y2: ya, class: "chart-whisker" }));
    });
    rated.forEach(function (p) {
      var c = svgEl("circle", { cx: X(t(p.observed)), cy: Y(p.rate_kg_h), r: 4.5, class: "chart-dot" });
      var tip = svgEl("title");
      tip.textContent = window.LMB.fmtDate(p.date) + ": " + window.LMB.fmtRateUnc(p.rate_kg_h, p.uncertainty_kg_h) +
        " (" + window.LMB.platform(p.platform).label + ")";
      c.appendChild(tip);
      svg.appendChild(c);
    });

    container.textContent = "";
    container.appendChild(svg);
    return svg;
  }

  window.LMBChart = { render: render, describe: describe };
})();
