"""Pure functions: distance, clustering of plumes into sites, per-site stats,
and matching a site centroid to a curated landfill name."""
from __future__ import annotations

import math
from collections import Counter
from statistics import median

EARTH_RADIUS_KM = 6371.0088


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(min(1.0, math.sqrt(a)))


def cluster_points(points: list[dict], threshold_km: float) -> list[list[int]]:
    """Single-linkage clustering: two plumes share a site if a chain of plumes
    links them with every hop under threshold_km. Returns lists of indices,
    largest cluster first, each list sorted."""
    n = len(points)
    parent = list(range(n))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(n):
        for j in range(i + 1, n):
            if haversine_km(points[i]["lat"], points[i]["lon"], points[j]["lat"], points[j]["lon"]) < threshold_km:
                ri, rj = find(i), find(j)
                if ri != rj:
                    parent[rj] = ri

    groups: dict[int, list[int]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)
    return sorted((sorted(g) for g in groups.values()), key=lambda g: (-len(g), g[0]))


def _date(ts: str) -> str:
    return ts[:10]


def _quantified(pl: dict) -> bool:
    return pl.get("emission_auto") is not None


def site_stats(plumes: list[dict]) -> dict:
    dates = sorted(_date(pl["scene_timestamp"]) for pl in plumes)
    rated = [pl for pl in plumes if _quantified(pl)]
    rates = [pl["emission_auto"] for pl in rated]
    top = max(rated, key=lambda pl: pl["emission_auto"]) if rated else None
    per_year = Counter(d[:4] for d in dates)
    platforms = Counter(pl.get("platform") or "unknown" for pl in plumes)
    return {
        "plume_count": len(plumes),
        "quantified_count": len(rated),
        "first_date": dates[0] if dates else None,
        "last_date": dates[-1] if dates else None,
        "median_rate_kg_h": median(rates) if rates else None,
        "max_rate_kg_h": top["emission_auto"] if top else None,
        "max_rate_uncertainty_kg_h": top.get("emission_uncertainty_auto") if top else None,
        "max_rate_date": _date(top["scene_timestamp"]) if top else None,
        "per_year": dict(sorted(per_year.items())),
        "platforms": [[k, v] for k, v in sorted(platforms.items(), key=lambda kv: (-kv[1], kv[0]))],
        "lat": sum(pl["lat"] for pl in plumes) / len(plumes),
        "lon": sum(pl["lon"] for pl in plumes) / len(plumes),
    }


def match_name(lat: float, lon: float, names: list[dict], radius_km: float) -> dict | None:
    best, best_d = None, radius_km
    for entry in names:
        d = haversine_km(lat, lon, entry["lat"], entry["lon"])
        if d <= best_d:
            best, best_d = entry, d
    return best
