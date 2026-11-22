// Shared helpers for the app and the printable brief. No dependencies.
(function () {
  "use strict";

  // Carbon Mapper platform names in the data, and what kind of instrument each is.
  // ISS = NASA’s EMIT imaging spectrometer on the International Space Station.
  var PLATFORMS = {
    "Planet Tanager 1": { kind: "space", label: "Tanager-1 satellite" },
    "ISS": { kind: "space", label: "EMIT on the ISS" },
    "Global Airborne Observatory": { kind: "aircraft", label: "Global Airborne Observatory aircraft" },
    "AVIRIS-NG": { kind: "aircraft", label: "AVIRIS-NG aircraft" },
    "AVIRIS-3": { kind: "aircraft", label: "AVIRIS-3 aircraft" }
  };

  var LINKS = {
    calsmp: "https://ww2.arb.ca.gov/our-work/programs/california-satellite-methane-project/calsmp-dashboard",
    carbonMapper: "https://data.carbonmapper.org",
    carbonMapperTerms: "https://carbonmapper.org/terms",
    productGuide: "https://carbonmapper.org/articles/product-guide"
  };

  function platform(name) {
    return PLATFORMS[name] || { kind: "unknown", label: name || "Unknown platform" };
  }

  var dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  var numFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  function fmtDate(iso) {
    if (!iso) return "unknown";
    var d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
    return isNaN(d) ? iso : dateFmt.format(d);
  }

  // Emission rates are rounded to 2 significant figures at most: in this data the
  // published uncertainty is a median 32 percent of the rate, so more digits would be false precision.
  function round2sf(v) {
    if (v == null || !isFinite(v)) return null;
    if (v === 0) return 0;
    var mag = Math.pow(10, Math.floor(Math.log10(Math.abs(v))) - 1);
    return Math.round(v / mag) * mag;
  }

  function fmtRate(v) {
    var r = round2sf(v);
    return r == null ? "not published" : numFmt.format(r);
  }

  function fmtRateUnc(v, u) {
    if (v == null) return "rate not published";
    return fmtRate(v) + (u != null ? " ± " + fmtRate(u) : "") + " kg/h";
  }

  function data() { return window.LMB_DATA || null; }

  function siteById(id) {
    var d = data();
    if (!d) return null;
    for (var i = 0; i < d.sites.length; i++) if (d.sites[i].id === id) return d.sites[i];
    return null;
  }

  function siteIdFromHash() {
    var m = /(?:^|[#&])site=([a-z0-9-]+)/.exec(window.location.hash);
    return m ? m[1] : null;
  }

  function kindCounts(site) {
    var c = { space: 0, aircraft: 0, unknown: 0 };
    site.plumes.forEach(function (p) { c[platform(p.platform).kind]++; });
    return c;
  }

  function plural(n, one, many) { return numFmt.format(n) + " " + (n === 1 ? one : (many || one + "s")); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "class") node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function regPageUrl(page) {
    var reg = window.LMB_CHECKLIST && window.LMB_CHECKLIST.regulation;
    return reg ? reg.url + "#page=" + page : "#";
  }

  window.LMB = {
    LINKS: LINKS, platform: platform, fmtDate: fmtDate, fmtRate: fmtRate, fmtRateUnc: fmtRateUnc,
    round2sf: round2sf, data: data, siteById: siteById, siteIdFromHash: siteIdFromHash,
    kindCounts: kindCounts, plural: plural, el: el, regPageUrl: regPageUrl, numFmt: numFmt
  };
})();
