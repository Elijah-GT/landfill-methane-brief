"""Turn the plume snapshot into per-site data for the web app.

    python pipeline/build_sites.py

Reads  data/plumes_snapshot.json  (written by fetch_plumes.py)
       pipeline/site_names.json   (hand-checked landfill names, each with a source)
       pipeline/ghgrp_ca_landfills.json (EPA GHGRP landfill records, from
                                   fetch_landfill_names.py; used when no hand-checked name fits)
Writes web/data/sites.js          (window.LMB_DATA = {...}; a .js file so the
                                   app also opens straight from disk, no server)

No network access: this step only uses the committed snapshot.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from statistics import median

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipeline.sites import cluster_points, haversine_km, in_california, match_name, site_stats  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SNAPSHOT = ROOT / "data" / "plumes_snapshot.json"
NAMES = ROOT / "pipeline" / "site_names.json"
GHGRP_NAMES = ROOT / "pipeline" / "ghgrp_ca_landfills.json"
OUT = ROOT / "web" / "data" / "sites.js"

WASTE_SECTOR = "6A"
CLUSTER_KM = 1.0
NAME_RADIUS_KM = 3.0
EDGE_WARN_KM = 3.0
NEAREST_RECORD_KM = 10.0  # for unnamed sites, show the nearest landfill record within this distance


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def publication_lag_days(plumes: list[dict], since: str = "2025-01-01") -> dict:
    lags = [
        (_parse(p["published_at"]) - _parse(p["scene_timestamp"])).total_seconds() / 86400
        for p in plumes
        if p.get("published_at") and p["scene_timestamp"] >= since
    ]
    if not lags:
        return {"since": since, "n": 0, "min": None, "median": None}
    return {"since": since, "n": len(lags), "min": round(min(lags), 1), "median": round(median(lags), 1)}


def km_to_bbox_edge(lat: float, lon: float, bbox: list[float] | None) -> float | None:
    """Distance from a point to the nearest side of the fetch box (min lon, min lat, max lon, max lat)."""
    if not bbox:
        return None
    min_lon, min_lat, max_lon, max_lat = bbox
    return min(
        haversine_km(lat, lon, min_lat, lon), haversine_km(lat, lon, max_lat, lon),
        haversine_km(lat, lon, lat, min_lon), haversine_km(lat, lon, lat, max_lon),
    )


def plume_row(p: dict, lat: float, lon: float) -> dict:
    return {
        "plume_id": p["plume_id"],
        "observed": p["scene_timestamp"],
        "date": p["scene_timestamp"][:10],
        "published": (p.get("published_at") or "")[:10] or None,
        "rate_kg_h": p.get("emission_auto"),
        "uncertainty_kg_h": p.get("emission_uncertainty_auto"),
        "rate_withheld": bool(p.get("hide_emission")) or p.get("emission_auto") is None,
        "platform": p.get("platform"),
        "wind_speed_m_s": p.get("wind_speed_avg_auto"),
        "wind_dir_deg": p.get("wind_direction_avg_auto"),
        "lat": round(p["lat"], 5),
        "lon": round(p["lon"], 5),
        "km_from_center": round(haversine_km(lat, lon, p["lat"], p["lon"]), 2),
    }


def mark_secondary_matches(sites: list[dict]) -> None:
    """When several sites match the same landfill record (outlying detections more than
    1 km from the main group), the site with the most detections keeps the name (ties go to
    the one nearer the record). The others are labelled "Near <name>" and point to it."""
    groups: dict[str, list[dict]] = {}
    for s in sites:
        if s["official_name"]:
            groups.setdefault(s["official_name"], []).append(s)
    for group in groups.values():
        if len(group) < 2:
            continue
        primary = max(group, key=lambda s: (s["plume_count"], -s["name_distance_km"]))
        primary["id"] = slugify(primary["name"])
        for s in group:
            if s is primary:
                continue
            s["near_of"] = {"id": primary["id"], "name": primary["name"]}
            s["name"] = "Near " + primary["name"]
            s["id"] = slugify(f"near {primary['name']} {s['lat']:.3f} {s['lon']:.3f}")


def build(snapshot: dict, names: list[dict], fallback_names: list[dict] | None = None) -> dict:
    all_plumes = snapshot["plumes"]
    waste = [p for p in all_plumes if p.get("sector") == WASTE_SECTOR]
    other = [p for p in all_plumes if p.get("sector") != WASTE_SECTOR]
    bbox = snapshot.get("bbox")
    sites = []
    used_ids: set[str] = set()
    outside: list[dict] = []
    all_names = list(names) + list(fallback_names or [])
    rank = 0
    for idx in cluster_points(waste, CLUSTER_KM):
        members = sorted((waste[i] for i in idx), key=lambda p: p["scene_timestamp"])
        stats = site_stats(members)
        if not in_california(stats["lat"], stats["lon"]):
            outside.append({"lat": round(stats["lat"], 4), "lon": round(stats["lon"], 4), "plume_count": len(members)})
            continue
        rank += 1
        named = (match_name(stats["lat"], stats["lon"], names, NAME_RADIUS_KM)
                 or match_name(stats["lat"], stats["lon"], fallback_names or [], NAME_RADIUS_KM))
        label = named["short_name"] if named else f"Unnamed waste site near {stats['lat']:.3f}, {stats['lon']:.3f}"
        if not named and (stats["lat"] < 32.9 or (stats["lat"] < 35.0 and stats["lon"] > -114.9)):
            print(f"note: unnamed site at {stats['lat']:.3f}, {stats['lon']:.3f} is near the Mexico or Arizona "
                  "border; check by hand that it is in California", file=sys.stderr)
        site_id = slugify(named["short_name"]) if named else slugify(f"site {stats['lat']:.3f} {stats['lon']:.3f}")
        while site_id in used_ids:
            site_id += "-b"
        used_ids.add(site_id)
        nearest = None
        if not named and all_names:
            cand = min(all_names, key=lambda e: haversine_km(stats["lat"], stats["lon"], e["lat"], e["lon"]))
            dist = haversine_km(stats["lat"], stats["lon"], cand["lat"], cand["lon"])
            if dist <= NEAREST_RECORD_KM:
                nearest = {"name": cand["short_name"], "distance_km": round(dist, 1),
                           "county": cand.get("county"), "source_url": cand.get("source_url")}
        rows = [plume_row(p, stats["lat"], stats["lon"]) for p in members]
        # Plumes Carbon Mapper put in another sector but within 1 km of this site's detections:
        # not counted, but reported so the site's numbers are not read as complete.
        nearby_other = sum(
            1 for o in other
            if any(haversine_km(o["lat"], o["lon"], m["lat"], m["lon"]) < CLUSTER_KM for m in members)
        )
        edge_km = min((km_to_bbox_edge(m["lat"], m["lon"], bbox) for m in members), default=None) if bbox else None
        if edge_km is not None and edge_km < EDGE_WARN_KM:
            print(f"warning: site {rank} has detections {edge_km:.1f} km from the fetch box edge; "
                  "widen --bbox so its record is not cut off", file=sys.stderr)
        sites.append({
            "id": site_id,
            "rank": rank,
            "name": label,
            "official_name": named.get("name") if named else None,
            "county": named.get("county") if named else None,
            "operator": named.get("operator") if named else None,
            "name_confidence": named.get("confidence") if named else None,
            "name_source_url": named.get("source_url") if named else None,
            "name_distance_km": round(haversine_km(stats["lat"], stats["lon"], named["lat"], named["lon"]), 2)
            if named else None,
            "nearest_record": nearest,
            "near_of": None,
            **stats,
            "max_km_from_center": max(r["km_from_center"] for r in rows),
            "nearby_other_sector": nearby_other,
            "km_to_bbox_edge": round(edge_km, 1) if edge_km is not None else None,
            "plumes": rows,
        })

    mark_secondary_matches(sites)
    observed = sorted(p["scene_timestamp"] for p in all_plumes)
    kept = {r["plume_id"] for s in sites for r in s["plumes"]}
    waste_ca = [p for p in waste if p["plume_id"] in kept]
    waste_observed = sorted(p["scene_timestamp"] for p in waste_ca)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fetched_at": snapshot["fetched_at"],
        "source": snapshot.get("source"),
        "source_url": snapshot.get("source_url"),
        "bbox": snapshot.get("bbox"),
        "cluster_km": CLUSTER_KM,
        "total_plumes": len(all_plumes),
        "waste_plumes": len(waste_ca),
        "outside_california": outside,
        "oldest_observation": observed[0][:10] if observed else None,
        "newest_observation": observed[-1][:10] if observed else None,
        "waste_oldest_observation": waste_observed[0][:10] if waste_observed else None,
        "waste_newest_observation": waste_observed[-1][:10] if waste_observed else None,
        "publication_lag_days": publication_lag_days(all_plumes),
        "sites": sites,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Build web/data/sites.js from the plume snapshot.")
    ap.add_argument("--snapshot", type=Path, default=SNAPSHOT)
    ap.add_argument("--names", type=Path, default=NAMES)
    ap.add_argument("--ghgrp-names", type=Path, default=GHGRP_NAMES)
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args(argv)

    snapshot = json.loads(args.snapshot.read_text(encoding="utf-8"))
    names = json.loads(args.names.read_text(encoding="utf-8")) if args.names.exists() else []
    fallback = json.loads(args.ghgrp_names.read_text(encoding="utf-8")) if args.ghgrp_names.exists() else []
    data = build(snapshot, names, fallback)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        "// Generated by pipeline/build_sites.py. Do not edit by hand.\n"
        f"window.LMB_DATA = {json.dumps(data, indent=1)};\n",
        encoding="utf-8",
    )
    print(f"wrote {len(data['sites'])} sites ({data['waste_plumes']} waste-sector plumes) to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
