# Landfill methane brief

**Live:** https://elijah-gt.github.io/landfill-methane-brief/

A one-page methane brief for any Sacramento-area landfill, built from public aircraft and satellite plume data, for the city and county staff who oversee or contract with landfills.

## The problem, in two sentences

From January 1, 2027, California landfill operators must investigate and fix methane plumes that CARB detects remotely and tells them about, with surveys due within 10 days of CARB's notice. But the plume history, each site's record and the new legal duties live in separate places, so a local solid-waste analyst cannot quickly see how often their landfill has leaked, how large the leaks were, or what the rule now asks of the operator.

## What it does

1. **Pick a landfill.** The app groups 205 waste-sector methane plumes (2017 to Aug 2026) into 9 sites, names each from EPA and CalRecycle records, and shows them on a list and a map.
2. **See its history.** Count, date range, median and largest emission rate with its published uncertainty, and a timeline with one dot per detection and an uncertainty bar. Detections whose rate was not published are shown, not dropped.
3. **See what the 2027 rule asks after a CARB notice.** Twelve operator duties, each with its deadline, its section number linked to the page of the regulation, and the verbatim regulation text.
4. **Generate a brief.** A print-ready, one-page US Letter brief with data dates, the 30-day publication lag, caveats and credits. Print it or save it as a PDF.

## How it complements CARB's CalSMP dashboard

CARB's [CalSMP dashboard](https://ww2.arb.ca.gov/our-work/programs/california-satellite-methane-project/calsmp-dashboard) is the official source for plume events and operator notification status. This tool does not replace it. It adds what local staff need for one site: a multi-year history in one view, a plain-language summary of the operator's duties with citations, and a one-page brief to hand to a manager. Every site links to CalSMP to check official status.

## Run it

Nothing to install. The data is bundled, so it works offline (map tiles excepted).

```bash
git clone https://github.com/Elijah-GT/landfill-methane-brief.git
cd landfill-methane-brief
```

Then either open `web/index.html` in a browser, or serve it:

```bash
python -m http.server 8000 --directory web
# open http://localhost:8000
```

### Refresh the data (optional, needs internet)

Python 3.10 or newer, standard library only.

```bash
python pipeline/fetch_plumes.py      # Carbon Mapper API -> data/plumes_snapshot.json
python pipeline/build_sites.py       # snapshot -> clusters, stats -> web/data/sites.js
```

`fetch_plumes.py` takes `--bbox MINLON MINLAT MAXLON MAXLAT` for another area. The Carbon Mapper plume endpoint answers without a token today; if that changes, set `CARBONMAPPER_TOKEN` and it is sent as a Bearer token. New clusters need a name added to `pipeline/site_names.json` with a source link, or they show as "Unnamed waste site near …".

### Tests

```bash
pip install -r requirements-dev.txt
python -m pytest pipeline/tests -q
```

The tests cover distance, 1 km clustering, per-site statistics, the build step, and a wording guard. The guard fails the build if any page says "violation", "non-compliant", "safe" or similar, and checks that every duty cites a section, a page and a verbatim quote.

## How it works

```
Carbon Mapper API ──fetch_plumes.py──> data/plumes_snapshot.json  (230 CH4 plumes, image URLs dropped)
                                         │
                       build_sites.py ───┤ keep sector 6A (solid waste disposal on land)
                                         │ single-linkage clustering, 1 km
                                         │ per-site stats, match names within 3 km
                                         ▼
                                   web/data/sites.js  ──>  index.html (list, map, timeline, checklist)
web/data/checklist.js (hand-built from the regulation) ─>  brief.html (one printable page)
```

* No backend, no database, no build step: static HTML, CSS and JavaScript, with Leaflet and the Chivo Mono font bundled.
* The timeline is a hand-drawn SVG, so it prints sharply and carries a text description for screen readers.
* Accessibility: keyboard navigation with visible focus, a skip link, the site list as the main way to choose a site, chart alternative text plus a full data table, and no meaning carried by colour alone.

## Data sources and credits

| What | Source | Notes |
| --- | --- | --- |
| Methane plumes | Source: Carbon Mapper ([data.carbonmapper.org](https://data.carbonmapper.org)) | Used non-commercially under the [Carbon Mapper Terms of Use](https://carbonmapper.org/terms). The data in `data/` and `web/data/sites.js` is not MIT-licensed; see [data/DATA_LICENSE.md](data/DATA_LICENSE.md). |
| Operator duties | California Air Resources Board, [Landfill Methane Regulation](https://ww2.arb.ca.gov/resources/documents/landfill-methane-regulation), [unofficial clean copy effective Jan 1, 2027](https://ww2.arb.ca.gov/sites/default/files/2026-08/Unofficial%20Clean%20LMR%20Effective%201-1-2027.pdf) | The official CCR text governs. |
| Landfill names | U.S. EPA Greenhouse Gas Reporting Program facility records; CalRecycle SWIS for the closed UC Davis landfill | Source linked on each site. |
| Map | © OpenStreetMap contributors, via Leaflet | |

## Limitations

* **Not legal advice and not a compliance finding.** The tool reports detections and summarises what the rule requires. It never says a landfill is or is not meeting the rule.
* **Only CARB's notification triggers the duties** (§ 95469(b)). A plume in the public data does not, by itself.
* **About 30 days behind.** Carbon Mapper publishes plumes about 30 days after observation; the newest in this snapshot is from Aug 18, 2026. This is a history and accountability tool, not an alert system.
* **Attribution is by distance.** A plume near a landfill may come from a neighbouring source. Each site shows how far its detections lie from its centre.
* **Rates are estimates.** Each carries Carbon Mapper's published ± uncertainty. Carbon Mapper does not say whether that is one standard deviation or a 95% interval. 53 of 230 plumes in the region have no published rate.
* **Coverage is uneven.** Aircraft and satellites saw each site only when they passed over, so a year with no dots is not a year without leaks.
* **The user is assumed, not validated.** The tool is designed for a city or county analyst, but has not been tested with one.

## Project files

* `pipeline/`: fetch, cluster and build scripts plus tests
* `data/`: the committed Carbon Mapper snapshot and its license note
* `web/`: the app (`index.html`), the brief (`brief.html`), bundled data and vendor files
* `NOTES.md`: build log of what was verified, what was not, and decisions

Built for EvoHacks 2 (Social Good). Code under the MIT license.
