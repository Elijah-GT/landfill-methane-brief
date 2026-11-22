# Build notes

Status, decisions and what was or was not verified. All times PST, Sun Nov 22, 2026.

## Status

* **Core build complete** (data pipeline, app, cited checklist, one-page brief), well ahead of the 9:00 AM freeze.
* Tests: 29 passing (`python -m pytest pipeline/tests -q`).
* Brief: prints on exactly one US Letter page for all 9 sites (checked by printing each to PDF with headless Chrome and counting pages).
* Deployed to GitHub Pages from `web/` by `.github/workflows/pages.yml`.

## Statewide branch (`statewide`, started 08:37, after the 9:00 freeze was near)

Not merged into `main`; the submitted site stays the Sacramento-region version until this is reviewed.

* Snapshot: 5,493 CH4 plumes in the box −124.5 to −114.1 longitude, 32.5 to 42.1 latitude (fetched Nov 22, 2026, 08:38). Sectors: 2,726 in 6A, 1,583 in 1B2, 998 in 4B, 112 in 1A1, 74 other or blank.
* One waste cluster (19 plumes at 36.38 N, 114.87 W) lies in Nevada and is dropped by the border test in `pipeline/sites.py`: the 120th meridian north of 39° N, then the straight line from 39° N 120° W to the Colorado River at about 35.0019 N, 114.6333 W. The Arizona and Mexico borders are not modelled; the build prints a note for any unnamed site near them. None appeared. That leaves 2,707 waste-sector plumes in 57 one-kilometre groups.
* Names: 124 California landfill records from EPA GHGRP (subparts HH and TT; reporting years 2011, 2014, 2017, 2020, 2023, each facility's latest kept). 45 of the 57 groups match one within 3 km (9 from the hand-checked list). **The 32 new names were matched by distance only and not checked one by one.**
* Groups that match the same record are folded into one site (user decision): 4 outlying groups, 7 detections, at Sunshine Canyon (2 single detections, 1.2 and 2.7 km from the main group), Prima Deshecha (4, 1.1 km) and Guadalupe (1, 1.4 km). Result: 53 sites, 41 named, 12 unnamed. Each merged site discloses the outlying count and its furthest detection. Prima Deshecha's largest rate (1,885 kg/h, EMIT) comes from its outlying group.
* 12 sites have no record within 3 km. For several large ones the nearest EPA record is plainly the same landfill with an office or gate address (Altamont 4.7 km, Monterey Regional 3.2 km, Simi Valley 6.5 km, Johnson Canyon 3.1 km), but the app does not name them; it shows the nearest record and distance. A checked entry in `site_names.json` would name them.
* All 53 briefs were printed to PDF with headless Chrome: each is exactly one US Letter page.
* Unnamed sites now get IDs from their coordinates (`site-37-755-121-647`), so links survive a refresh.

## Verified (first-hour gate)

| Check | Result | Source |
| --- | --- | --- |
| Carbon Mapper API without a token | HTTP 200 from curl, no token. The OpenAPI spec marks the endpoint's auth as optional. | `https://api.carbonmapper.org/api/v1/openapi.json` |
| Pagination | `bbox_count` gives the total in the box; `limit` and `offset` paginate. The earlier 144 was the full count for the smaller box, not a cap. | live API |
| Snapshot | 346 CH4 plumes in the box from −122.2 to −120.8 longitude and 37.9 to 39.2 latitude: 294 in sector 6A, 40 in 1B2, 9 other, 3 in 1A1. Observed Oct 5, 2016 to Sep 15, 2026. | `data/plumes_snapshot.json` |
| Publication lag | Of the 78 plumes observed since 2025, the minimum and median lag are both 30 days. 6 were published more than 45 days later (the longest after 242 days). | computed |
| Units | `emission_auto` is kg/hr; `emission_uncertainty_auto` is ± kg/hr. **Whether it is 1σ or 95% is not stated.** | Carbon Mapper product guide v1.1.7 (https://carbonmapper.org/articles/product-guide) |
| Sector 6A | "Solid Waste Disposal On Land" | product guide |
| Rates withheld | 71 of 346 plumes have no rate (46 with `hide_emission: true`, the rest with a null rate). Shown as "rate not published". The meaning of `hide_emission` is not documented. | data, product guide |
| Platforms | Aircraft: GAO, AVIRIS-NG, AVIRIS-3. Satellites: Planet Tanager-1, and EMIT on the ISS (instrument `emi`). So the data is **not satellite-only**, and the app says "aircraft and satellites". | data |
| License | Carbon Mapper's own Terms of Use (Jan 13, 2026), not CC: non-commercial use, attribution, and redistribution only under the same terms. Bundling a trimmed snapshot in a public repo fits these terms, but the data is marked as not MIT. No logo is used (§6.2 forbids it). Credit wording used: "Source: Carbon Mapper (data.carbonmapper.org)". | https://carbonmapper.org/terms |
| Landfill names | All 9 clusters are within 0.24 to 1.55 km of a registered landfill (EPA GHGRP 2023 facility table; CalRecycle SWIS for UC Davis). Kiefer's coordinates were spot-checked against Envirofacts. | `pipeline/site_names.json` |
| Regulation | The trigger and all 11 duties were checked against CARB's unofficial clean copy effective Jan 1, 2027: each quote is verbatim (an ellipsis marks one trimmed quote) and each page number was confirmed. An independent audit re-checked all 12 passages. | https://ww2.arb.ca.gov/sites/default/files/2026-08/Unofficial%20Clean%20LMR%20Effective%201-1-2027.pdf |
| Duty trigger | § 95469(b): "When notified by the Executive Officer of a methane emission plume detection … any owner or operator shall perform the actions…". **The duty is triggered by CARB's notification, not by public data.** The sentence the spec asked to confirm is confirmed. | regulation p. 26 |

## Fixed after the independent evaluation (about 01:20)

Three reviewers ran separately: a data and legal audit, a Hallmark design review and a judge-style usability and accessibility pass. Their objective findings, and what was done about each:

* **Keller Canyon record truncated.** The first box's south edge (38.0) cut through the landfill, so 89 of its 96 detections were missing. The box was widened to 37.9 S and −120.8 E (Foothill sat 2.7 km from the east edge; nothing new appeared there), and `build_sites.py` now warns when a site lies within 3 km of the box edge, with a test.
* **Legal wording.** The surface-exceedance duty now carries the conditional one-month re-test and the second- and third-exceedance steps. The 15-day report now lists the follow-up date and instrument, the *initial mitigation plan* and possible contributing activities. Recordkeeping moved under controlled landfills, because § 95470(a)(1)(G) covers § 95465 exceedances, and the group title now includes "landfill gas control system". The README states the 30-day survey at uncontrolled landfills, and the duty count is 11, not 12.
* **Display.** The brief's "Prepared" date now uses the local date, not UTC. Single-detection sites say "on [date]", not "between X and X". Same-day dots are spread a few pixels so each is visible. Axis ticks use 1, 2, 2.5 or 5 steps. Non-waste plumes within 1 km of a site are counted and disclosed. The rail's date range uses waste plumes only.
* **Brief.** It is now laid out at its printed width on every screen and auto-fits to one page (the chart shrinks first, then the spacing). The type was enlarged, and all 9 sites print on one page.
* **Accessibility and robustness.** The whole-panel `aria-live` was replaced with a short status message, and focus moves to the site heading. The map has `role="region"` and is out of the keyboard order (the list is the control). A bad `#site=` id is corrected with a note. The wordmark link works from disk. The empty state is not styled as an error. The rail stays in view on long pages. The selected row no longer flashes blank text. New-tab hints were added.
* **CI** now fails if the committed `sites.js` differs from a rebuild (ignoring `generated_at`).

Left as is (unverified or subjective): two possible duplicate detections (same scene and position: Potrero Hills on Jun 17, 2017; Kiefer on Oct 5, 2017) are counted as Carbon Mapper lists them, and this is disclosed in the README. Hierarchy suggestions for the checklist were not adopted.

## Changed from the spec

* **"Repairs within 3 days" is not in the regulation.** The spec and a county factsheet said this. The amended text says: survey within 10 calendar days of the notice (controlled landfills), start corrective action within 5 days of a reading over 500 ppmv, repair leaking components within 10 days, and report within 15 days. The README, app and brief use the regulation's numbers. Do not say "3 days" in the video.
* The § 95469(b) heading is "Remotely Detected **Emission** Plumes", not "Methane Plumes".
* The data is aircraft and satellite, not satellite-only, so the wording was adjusted everywhere.
* The CalSMP dashboard is link-out only. Its Tableau download was not tried (time-boxed; it adds notification status but needs scraping a Tableau view).
* The EPA emissions comparison (stretch goal) was dropped. GHGRP IDs are recorded in `pipeline/site_names.json` for later.
* Plume images are not used. Their URLs are signed and expire, and the Terms say nothing about images.
* Clustering is a pure-Python 1 km single-linkage rule instead of DBSCAN (no scikit-learn dependency).

## Not verified

* Whether the ± uncertainty is 1σ or a 95% interval.
* The webinar's claim that "22 local air districts" implement the rule (from the Nov 2025 news release, possibly stale). It is not used in the app.
* Whether real city or county staff want this (the user is an inference).
* Two GHGRP facilities (North County, Foothill) have stopped reporting, so their registered names may be dated. The closed UC Davis landfill has only one detection, so that match is weak, and the app says so.

## Decisions

* Theme: Hallmark "Wayfind" (light, signage-style, Chivo Mono). It was chosen over the dark options because the brief must print.
* Data ships as `web/data/sites.js` (`window.LMB_DATA = …`), so `index.html` opens straight from disk without a server.
* Rates are rounded to 2 significant figures, because the published uncertainty is a median 32% of the rate (10th to 90th percentile 18% to 56%).
* The brief uses shorter `brief` wordings of each duty (still cited) so it fits one page; the app shows the full wording and the verbatim quote.
