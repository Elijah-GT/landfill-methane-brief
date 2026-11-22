// Where detections repeat: spots on a site where Carbon Mapper's estimated plume origins
// fall within SPOT_KM of each other on at least two different days. Shared by the app and the
// brief, and loaded by Node in the tests. No DOM.
//
// Greedy grouping: take the detection with the most others within SPOT_KM, call that a spot,
// remove its members, repeat until no detection has a neighbour. A spot is kept only when its
// detections span two or more days, so one flyover with several plumes is not read as
// recurrence. Locations are estimated plume origins, not ground truth.
(function (root) {
  "use strict";

  var SPOT_KM = 0.2;

  function km(a, b) {
    var r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }

  // plumes: [{lat, lon, date: "YYYY-MM-DD", rate_kg_h, uncertainty_kg_h}, ...]
  function findSpots(plumes, radiusKm) {
    var radius = radiusKm || SPOT_KM;
    var left = plumes.slice(), out = [];
    while (left.length) {
      var best = null, members = [];
      left.forEach(function (p) {
        var m = left.filter(function (q) { return km(p, q) <= radius; });
        if (m.length > members.length) { members = m; best = p; }
      });
      if (members.length < 2) break;
      left = left.filter(function (q) { return members.indexOf(q) < 0; });
      var days = {};
      members.forEach(function (q) { days[q.date] = true; });
      var dates = members.map(function (q) { return q.date; }).sort();
      var top = members.filter(function (q) { return q.rate_kg_h != null; })
        .sort(function (a, b) { return b.rate_kg_h - a.rate_kg_h; })[0] || null;
      if (Object.keys(days).length >= 2) {
        out.push({ lat: best.lat, lon: best.lon, n: members.length, days: Object.keys(days).length,
          first: dates[0], last: dates[dates.length - 1], top: top });
      }
    }
    return out;
  }

  var api = { findSpots: findSpots, km: km, SPOT_KM: SPOT_KM };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LMBSpots = api;
})(typeof window !== "undefined" ? window : this);
