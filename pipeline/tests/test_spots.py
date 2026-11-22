"""Where detections repeat (web/spots.js), run through Node."""
import json
import shutil
import subprocess
from pathlib import Path

import pytest

SPOTS = Path(__file__).resolve().parents[2] / "web" / "spots.js"
NODE = shutil.which("node")
pytestmark = pytest.mark.skipif(NODE is None, reason="Node.js is not installed")


def spots(plumes, radius=None):
    arg = "" if radius is None else f", {radius}"
    script = (f"const S = require({json.dumps(str(SPOTS))});"
              f"console.log(JSON.stringify(S.findSpots({json.dumps(plumes)}{arg})));")
    out = subprocess.run([NODE, "-e", script], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def p(lat, lon, date, rate=100.0):
    return {"lat": lat, "lon": lon, "date": date, "rate_kg_h": rate, "uncertainty_kg_h": 10.0}


def test_repeat_spot_across_days_is_found():
    # three detections within ~50 m on three days, one far away
    got = spots([p(38.0, -121.0, "2025-01-01"), p(38.0003, -121.0, "2025-06-01", 400.0),
                 p(38.0, -121.0004, "2026-01-01"), p(38.05, -121.0, "2025-02-01")])
    assert len(got) == 1
    s = got[0]
    assert (s["n"], s["days"], s["first"], s["last"]) == (3, 3, "2025-01-01", "2026-01-01")
    assert s["top"]["rate_kg_h"] == 400.0


def test_one_flyover_is_not_a_repeat():
    # several plumes close together, all on the same day
    got = spots([p(38.0, -121.0, "2025-01-01"), p(38.0002, -121.0, "2025-01-01"), p(38.0, -121.0002, "2025-01-01")])
    assert got == []


def test_radius_and_ordering():
    far_pair = [p(38.0, -121.0, "2025-01-01"), p(38.0025, -121.0, "2025-03-01")]       # about 280 m apart
    assert spots(far_pair) == []                       # outside 200 m
    assert len(spots(far_pair, 0.3)) == 1               # inside 300 m
    big = [p(38.1, -121.1, f"2025-0{m}-01") for m in range(1, 5)]
    small = [p(38.0, -121.0, "2025-01-01"), p(38.0, -121.0001, "2025-02-01")]
    got = spots(small + big)
    assert [s["n"] for s in got] == [4, 2]              # most detections first


def test_unpublished_rates():
    got = spots([dict(p(38.0, -121.0, "2025-01-01"), rate_kg_h=None), dict(p(38.0, -121.0001, "2025-02-01"), rate_kg_h=None)])
    assert got[0]["top"] is None
