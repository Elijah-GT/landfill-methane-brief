# Landfill methane brief

**Live:** https://elijah-gt.github.io/landfill-methane-brief/

A one-page methane brief for any California landfill, built from public aircraft and satellite plume data, for the city and county staff who oversee or contract with landfills.

## The problem, in two sentences

From January 1, 2027, California landfill operators must investigate and fix methane plumes that CARB detects remotely and tells them about, starting with a ground survey within 10 days of CARB's notice (30 days at uncontrolled landfills). But the plume history, each site's record and the new legal duties live in separate places, so a local solid-waste analyst cannot quickly see how often their landfill has leaked, how large the leaks were, or what the rule now asks of the operator.

## What it does

1. **Pick a landfill.** The app groups 2,707 waste-sector methane plumes seen in California (Sep 2016 to Oct 2026) into 53 sites, names 41 of them from EPA and CalRecycle records, and shows them on a searchable list and a map that expands to fill the window.
2. **See recent activity first, history on request.** By default every number, the list order, the map and the chart cover the last 24 months before the data was fetched (since Nov 22, 2024 in this snapshot); a switch shows the full record since 2016. Count, date range, median and largest emission rate with its published uncertainty, and a timeline with one dot per detection and an uncertainty bar. Detections whose rate was not published are shown, not dropped.
3. **See what the 2027 rule asks after a CARB notice.** Eleven operator duties, plus the notice that triggers them, each with its deadline, its section number linked to the page of the regulation, and the verbatim regulation text.
4. **Follow up after a CARB notice.** Enter the date the operator received CARB's notice, the landfill type and (optionally) CARB's ID number. The app gives the due date of each dated step (survey in 10 days and report in 15 at controlled landfills; 30 and 35 at uncontrolled ones), where each stands today, the steps that depend on what the survey finds, and a question to ask the operator for each, all cited. The brief then prints these as a follow-up sheet with a column for the operator's answers. A passed date is worded as a prompt to ask, never as a finding.
5. **Generate a brief.** A one-page US Letter sheet for a manager or a meeting with the operator: four key figures, the timeline, the most recent detections with their location (something the operator can check against site records), next steps, and short notes on the data. With a CARB notice entered, the follow-up table (due dates, the rule for each step, what to ask, and a column for the operator's answers) leads the page. The general duty summary stays in the app.

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
python pipeline/fetch_plumes.py          # Carbon Mapper API -> data/plumes_snapshot.json
python pipeline/fetch_landfill_names.py  # EPA GHGRP -> pipeline/ghgrp_ca_landfills.json
python pipeline/build_sites.py           # snapshot -> clusters, stats -> web/data/sites.js
```

`fetch_plumes.py` takes `--bbox MINLON MINLAT MAXLON MAXLAT` for another area; `build_sites.py` warns when a site's detections lie within 3 km of the box edge, where its record could be cut off. The Carbon Mapper plume endpoint answers without a token today; if that changes, set `CARBONMAPPER_TOKEN` and it is sent as a Bearer token. Names come first from the hand-checked `pipeline/site_names.json`, then from EPA landfill records (`pipeline/ghgrp_ca_landfills.json`: facilities reporting under subpart HH or TT in 2011, 2014, 2017, 2020 or 2023). A site is named only when a record lies within 3 km of its centre; otherwise it shows as "Unnamed waste site near …" with the nearest record and its distance. Sites east of California's Nevada border or north of 42° N are dropped; the build prints a note for unnamed sites near the Arizona or Mexico border so they can be checked by hand.

### Tests

```bash
pip install -r requirements-dev.txt
python -m pytest pipeline/tests -q
```

The tests cover distance, 1 km clustering, per-site statistics, the build step, and a wording guard. The guard fails the build if any page says "violation", "non-compliant", "safe" or similar, and checks that every duty cites a section, a page and a verbatim quote.

## How it works

```
Carbon Mapper API ──fetch_plumes.py──> data/plumes_snapshot.json  (5,493 CH4 plumes in a box around California, image URLs dropped)
EPA GHGRP ──fetch_landfill_names.py──> pipeline/ghgrp_ca_landfills.json  (124 landfill records)
                                         │
                       build_sites.py ───┤ keep sector 6A (solid waste disposal on land)
                                         │ single-linkage clustering, 1 km; drop sites outside California
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
| Landfill names | U.S. EPA Greenhouse Gas Reporting Program facility records ([Envirofacts PUB_DIM_FACILITY](https://data.epa.gov/efservice/PUB_DIM_FACILITY/STATE/CA/YEAR/2023/CSV)); CalRecycle SWIS for the closed UC Davis landfill | Source linked on each site. 9 names were checked by hand; the rest are matched by distance. |
| Map | © OpenStreetMap contributors, via Leaflet | |

## Limitations

* **Due dates assume simple counting.** The rule says "within N calendar days of receiving" the notice but not how to count; the app adds N days to the receipt date and does not move dates for weekends or holidays. Confirm exact dates with CARB.
* **Not legal advice and not a compliance finding.** The tool reports detections and summarises what the rule requires. It never says a landfill is or is not meeting the rule.
* **Only CARB's notification triggers the duties** (§ 95469(b)). A plume in the public data does not, by itself.
* **About 30 days behind.** Carbon Mapper publishes plumes about 30 days after observation; the newest in this snapshot is from Sep 15, 2026. This is a history and accountability tool, not an alert system.
* **Attribution is by distance.** A plume near a landfill may come from a neighbouring source. Each site shows how far its detections lie from its centre.
* **Outlying detections are folded in.** Detections more than 1 km from a landfill's main group, but whose group matches the same landfill record within 3 km, are counted as part of that landfill (Sunshine Canyon, Prima Deshecha, Guadalupe). Each such site says how many there are and how far the furthest lies.
* **12 sites are unnamed.** EPA's location for some large landfills is an office or gate address several kilometres from the tip face (for example 4.7 km at the site nearest Altamont Landfill), so no record falls within 3 km. These sites show the nearest record instead of guessing; adding a checked entry to `pipeline/site_names.json` names them.
* **Names matched by distance were not checked one by one.** Only the 9 Sacramento-region names were checked by hand.
* **Rates are estimates.** Each carries Carbon Mapper's published ± uncertainty. Carbon Mapper does not say whether that is one standard deviation or a 95% interval. 647 of the 2,707 waste-sector plumes have no published rate.
* **Only waste-sector plumes count.** Plumes Carbon Mapper classed as another sector are left out even when they sit inside a site ; each site says how many.
* **Possible duplicates.** A few detections share a scene and position (for example two at Potrero Hills on Jun 17, 2017); they are counted as Carbon Mapper lists them.
* **Totals follow flight campaigns.** 56% of all detections come from 2024, mostly two months of aircraft flights, and older years are aircraft-only while recent ones are mostly satellite (which see only larger leaks). That is why the app opens on the last 24 months; compare full-history counts between sites with care.
* **Coverage is uneven.** Aircraft and satellites saw each site only when they passed over, so a year with no dots is not a year without leaks.
* **The user is assumed, not validated.** The tool is designed for a city or county analyst, but has not been tested with one.

## Project files

* `pipeline/`: fetch, cluster and build scripts plus tests
* `data/`: the committed Carbon Mapper snapshot and its license note
* `web/`: the app (`index.html`), the brief (`brief.html`), bundled data and vendor files
* `NOTES.md`: build log of what was verified, what was not, and decisions

Built for EvoHacks 2 (Social Good). Code under the MIT license.
