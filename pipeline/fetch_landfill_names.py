"""Download California landfill records from the EPA Greenhouse Gas Reporting Program
and save them as name candidates for build_sites.py.

    python pipeline/fetch_landfill_names.py

Reads EPA Envirofacts PUB_DIM_FACILITY for California for several reporting years
(so landfills that stopped reporting are still found), keeps facilities that reported
under subpart HH (municipal solid waste landfills) or TT (industrial waste landfills),
keeps each facility's most recent year, and writes pipeline/ghgrp_ca_landfills.json.

Hand-checked names in pipeline/site_names.json always take priority over these.
Standard library only.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "pipeline" / "ghgrp_ca_landfills.json"
URL = "https://data.epa.gov/efservice/PUB_DIM_FACILITY/STATE/CA/YEAR/{year}/CSV"
DETAIL = "https://ghgdata.epa.gov/ghgp/service/facilityDetail/{year}?id={fid}&ds=E&et=&popup=true"
YEARS = (2011, 2014, 2017, 2020, 2023)
LANDFILL_SUBPARTS = {"HH", "TT"}

# Words kept in capitals when the EPA's all-caps names are put in title case.
KEEP_UPPER = {"LLC", "LP", "USA", "US", "MSW", "UC", "II", "III", "SW", "CA", "LA", "SB", "SLF", "BKK", "CWMI", "RDF"}


def tidy(name: str) -> str:
    """'CHIQUITA CANYON LANDFILL, LLC' -> 'Chiquita Canyon Landfill, LLC'."""
    def word(w: str) -> str:
        core = re.sub(r"[^A-Za-z]", "", w)
        if core.upper() in KEEP_UPPER:
            return w.upper()
        if not (w.isupper() or w.islower()):
            return w
        m = re.match(r"^([^A-Za-z]*)(.*)$", w)  # keep leading "(" and capitalise the word after it
        return m.group(1) + m.group(2)[:1].upper() + m.group(2)[1:].lower()
    return re.sub(r"\s+", " ", " ".join(word(w) for w in name.strip().split(" ")))


def get_csv(year: int, retries: int = 3) -> list[dict]:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(URL.format(year=year), headers={"User-Agent": "methane-docket/1.0"})
            with urllib.request.urlopen(req, timeout=180) as resp:
                return list(csv.DictReader(io.StringIO(resp.read().decode("utf-8", "replace"))))
        except (urllib.error.URLError, TimeoutError) as err:
            last = err
            time.sleep(2 ** attempt)
    raise RuntimeError(f"EPA request for {year} failed: {last}")


def landfill_records(rows_by_year: dict[int, list[dict]]) -> list[dict]:
    latest: dict[str, dict] = {}
    for year in sorted(rows_by_year):
        for r in rows_by_year[year]:
            subparts = {s.strip() for s in (r.get("reported_subparts") or "").split(",")}
            if not subparts & LANDFILL_SUBPARTS or not r.get("latitude"):
                continue
            latest[r["facility_id"]] = {**r, "_year": year}
    out = []
    for fid, r in sorted(latest.items()):
        county = tidy(r.get("county") or "") or None
        parent = re.sub(r"\s*\(\d+(\.\d+)?%\)", "", r.get("parent_company") or "").split(";")[0].strip()
        kinds = sorted({s.strip() for s in r["reported_subparts"].split(",")} & LANDFILL_SUBPARTS)
        out.append({
            "name": r["facility_name"].strip(),
            "short_name": tidy(r["facility_name"]),
            "lat": round(float(r["latitude"]), 6),
            "lon": round(float(r["longitude"]), 6),
            "address": ", ".join(x for x in (tidy(r.get("address1") or ""), tidy(r.get("city") or ""), "CA " + (r.get("zip") or "")) if x.strip()),
            "county": county,
            "ghgrp_id": fid,
            "source_url": DETAIL.format(year=r["_year"], fid=fid),
            "note": f"EPA GHGRP subpart {'/'.join(kinds)} reporter, last seen in reporting year {r['_year']} "
                    f"of the years checked. Envirofacts PUB_DIM_FACILITY: {URL.format(year=r['_year'])}",
            "operator": tidy(parent) if parent else None,
            "confidence": "matched by distance to an EPA GHGRP landfill record",
            "last_reporting_year": r["_year"],
        })
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args(argv)
    rows = {}
    for y in YEARS:
        rows[y] = get_csv(y)
        print(f"{y}: {len(rows[y])} California facilities", file=sys.stderr)
    recs = landfill_records(rows)
    args.out.write_text(json.dumps(recs, indent=1) + "\n", encoding="utf-8")
    print(f"saved {len(recs)} landfill records to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
