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

  // Axis scale: a tick step of 1, 2, 2.5 or 5 x 10^n, with 3 to 5 intervals.
  function niceScale(v, maxN) {
    maxN = maxN || 5;
    if (!(v > 0)) return { top: 100, n: Math.min(4, maxN) };
    var mag = Math.pow(10, Math.floor(Math.log10(v)) - 1);
    var mult = [1, 2, 2.5, 5, 10, 20, 25, 50, 100];
    for (var i = 0; i < mult.length; i++) {
      var step = mult[i] * mag, n = Math.ceil(v / step);
      if (n <= maxN) return { top: n * step, n: Math.max(n, 1) };
    }
    return { top: 100 * mag * maxN, n: maxN };
  }

  // Detections on the same day share an x position; spread them a few pixels
  // apart (centred on the true date) so each dot and whisker stays visible.
  function spread(list, X) {
    var groups = {};
    list.forEach(function (p) { (groups[p.date] = groups[p.date] || []).push(p); });
    var out = new Map();
    Object.keys(groups).forEach(function (d) {
      var g = groups[d], n = g.length, stepPx = n > 1 ? Math.min(5, 24 / (n - 1)) : 0;
      g.forEach(function (p, i) { out.set(p, X(t(p.observed)) + (i - (n - 1) / 2) * stepPx); });
    });
    return out;
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
    var m = { l: 64, r: 16, t: 32, b: H < 200 ? 52 : 64 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    // x range: whole years from first to last detection, or an explicit window (opts.from/opts.to, ISO dates).
    var x0, x1;
    if (opts.from && opts.to) { x0 = t(opts.from); x1 = t(opts.to); }
    else { x0 = Date.UTC(+site.first_date.slice(0, 4), 0, 1); x1 = Date.UTC(+site.last_date.slice(0, 4) + 1, 0, 1); }
    var firstYear = new Date(x0).getUTCFullYear(), lastYear = new Date(x1 - 1).getUTCFullYear();
    var rated = site.plumes.filter(function (p) { return p.rate_kg_h != null; });
    // fewer y labels on a short plot so they never collide (about 20 px per label)
    var scale = niceScale(Math.max.apply(null, [0].concat(rated.map(function (p) {
      return p.rate_kg_h + (p.uncertainty_kg_h || 0);
    }))), ph < 60 ? 2 : ph < 90 ? 3 : 5);
    var top = scale.top;
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
    for (var i = 0; i <= scale.n; i++) {
      var v = top / scale.n * i, y = Y(v);
      svg.appendChild(svgEl("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, class: i === 0 ? "chart-axis" : "chart-grid" }));
      var lab = svgEl("text", { x: m.l - 8, y: y + 4, class: "chart-label", "text-anchor": "end" });
      lab.textContent = window.LMB.numFmt.format(v);
      svg.appendChild(lab);
    }
    var unit = svgEl("text", { x: m.l, y: m.t - 14, class: "chart-label", "text-anchor": "start" });
    unit.textContent = "Emission rate, kg of methane per hour";
    svg.appendChild(unit);

    // year ticks
    // Year boundaries get a tick; each year's label sits in the middle of its visible part,
    // and is skipped when that part is too narrow to hold it.
    var span = lastYear - firstYear + 1, every = span > (W < 520 ? 4 : 8) ? 2 : 1;
    for (var yr = firstYear; yr <= lastYear + 1; yr++) {
      var jan = Date.UTC(yr, 0, 1);
      if (jan >= x0 && jan <= x1) {
        var xx = X(jan);
        svg.appendChild(svgEl("line", { x1: xx, x2: xx, y1: m.t + ph, y2: m.t + ph + 6, class: "chart-axis" }));
      }
      if (yr <= lastYear && (yr - firstYear) % every === 0) {
        var a = Math.max(x0, jan), b = Math.min(x1, Date.UTC(yr + 1, 0, 1));
        if (X(b) - X(a) < 36) continue;
        var yl = svgEl("text", { x: (X(a) + X(b)) / 2, y: m.t + ph + 20, class: "chart-label", "text-anchor": "middle" });
        yl.textContent = String(yr);
        svg.appendChild(yl);
      }
    }

    // detections with no published rate, as a strip under the axis
    var stripY = m.t + ph + (H < 200 ? 36 : 42);
    var withheld = site.plumes.filter(function (p) { return p.rate_kg_h == null; });
    var sl = svgEl("text", { x: m.l - 8, y: stripY + 4, class: "chart-label", "text-anchor": "end" });
    sl.textContent = "no rate";
    svg.appendChild(sl);
    svg.appendChild(svgEl("line", { x1: m.l, x2: W - m.r, y1: stripY, y2: stripY, class: "chart-grid" }));
    var wx = spread(withheld, X);
    withheld.forEach(function (p) {
      var cx = wx.get(p);
      svg.appendChild(svgEl("rect", { x: cx - 4, y: stripY - 4, width: 8, height: 8, class: "chart-withheld" }));
    });

    // uncertainty whiskers, then dots on top
    var rx = spread(rated, X);
    rated.forEach(function (p) {
      var cx = rx.get(p), u = p.uncertainty_kg_h || 0;
      var ya = Y(Math.max(0, p.rate_kg_h - u)), yb = Y(p.rate_kg_h + u);
      svg.appendChild(svgEl("line", { x1: cx, x2: cx, y1: ya, y2: yb, class: "chart-whisker" }));
      svg.appendChild(svgEl("line", { x1: cx - 2, x2: cx + 2, y1: yb, y2: yb, class: "chart-whisker" }));
      svg.appendChild(svgEl("line", { x1: cx - 2, x2: cx + 2, y1: ya, y2: ya, class: "chart-whisker" }));
    });
    rated.forEach(function (p) {
      var c = svgEl("circle", { cx: rx.get(p), cy: Y(p.rate_kg_h), r: 3.5, class: "chart-dot" });
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
