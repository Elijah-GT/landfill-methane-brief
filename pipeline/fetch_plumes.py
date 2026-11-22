"""Fetch methane plume detections from the Carbon Mapper public catalog API
for a bounding box and save a trimmed snapshot to data/plumes_snapshot.json.

Standard library only, so it runs from a clean clone with no installs.

    python pipeline/fetch_plumes.py            # default Sacramento-region box
    python pipeline/fetch_plumes.py --bbox -122.2 38.0 -120.9 39.2

If Carbon Mapper starts requiring a token, set CARBONMAPPER_TOKEN in your
environment; it is sent as a Bearer token and never written to disk.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API_URL = "https://api.carbonmapper.org/api/v1/catalog/plumes/annotated"
# min lon, min lat, max lon, max lat: Sacramento valley and delta, Pittsburg to Yuba City.
# Keep every site well inside the box: a landfill on the edge loses detections (see NOTES.md).
DEFAULT_BBOX = (-122.2, 37.9, -120.8, 39.2)
PAGE_SIZE = 500
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "data" / "plumes_snapshot.json"

# Fields kept from each record. Signed image URLs are dropped on purpose:
# they expire, and image redistribution is not covered by this project.
KEEP = (
    "id", "plume_id", "scene_timestamp", "published_at", "sector", "platform",
    "instrument", "status", "emission_auto", "emission_uncertainty_auto",
    "wind_speed_avg_auto", "wind_direction_avg_auto", "hide_emission",
    "plume_quality", "gsd", "emission_version",
)


def build_url(bbox: tuple[float, float, float, float], limit: int, offset: int) -> str:
    params = [("bbox", str(v)) for v in bbox]
    params += [("plume_gas", "CH4"), ("limit", str(limit)), ("offset", str(offset))]
    return f"{API_URL}?{urllib.parse.urlencode(params)}"


def get_json(url: str, retries: int = 3) -> dict:
    headers = {"Accept": "application/json", "User-Agent": "landfill-methane-brief/1.0"}
    token = os.environ.get("CARBONMAPPER_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
            last_err = err
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Carbon Mapper request failed after {retries} tries: {last_err}")


def trim(item: dict) -> dict:
    rec = {k: item.get(k) for k in KEEP}
    lon, lat = item["geometry_json"]["coordinates"][:2]
    rec["lon"], rec["lat"] = lon, lat
    return rec


def fetch(bbox: tuple[float, float, float, float]) -> list[dict]:
    items: list[dict] = []
    offset = 0
    expected = None
    while True:
        page = get_json(build_url(bbox, PAGE_SIZE, offset))
        expected = page.get("bbox_count", expected)
        batch = page.get("items", [])
        items.extend(batch)
        offset += len(batch)
        if not batch or (expected is not None and offset >= expected):
            break
    if expected is not None and len(items) != expected:
        print(f"warning: API reported {expected} plumes, received {len(items)}", file=sys.stderr)
    return [trim(i) for i in items]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--bbox", nargs=4, type=float, metavar=("MINLON", "MINLAT", "MAXLON", "MAXLAT"),
                    default=DEFAULT_BBOX)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = ap.parse_args(argv)

    plumes = fetch(tuple(args.bbox))
    plumes.sort(key=lambda p: p["scene_timestamp"])
    snapshot = {
        "source": "Carbon Mapper public plume catalog",
        "source_url": API_URL,
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "bbox": list(args.bbox),
        "gas": "CH4",
        "count": len(plumes),
        "plumes": plumes,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(snapshot, indent=1), encoding="utf-8")
    print(f"saved {len(plumes)} plumes to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
