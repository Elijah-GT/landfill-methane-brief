# Build notes

Status, decisions and what was or was not verified. All times PST, Sun Nov 22, 2026.

## Status

* **Core build complete** (data pipeline, app, cited checklist, one-page brief), well ahead of the 9:00 AM freeze.
* Tests: 25 passing (`python -m pytest pipeline/tests -q`).
* Brief: prints on exactly one US Letter page for all 9 sites (checked by printing each to PDF with headless Chrome and counting pages).
* Deployed to GitHub Pages from `web/` by `.github/workflows/pages.yml`.

## Verified (first-hour gate)

| Check | Result | Source |
| --- | --- | --- |
| Carbon Mapper API without a token | HTTP 200 from curl, no token. The OpenAPI spec marks the endpoint's auth as optional. | `https://api.carbonmapper.org/api/v1/openapi.json` |
| Pagination | `bbox_count` gives the total in the box; `limit` and `offset` paginate. The earlier 144 was the full count for the smaller box, not a cap. | live API |
| Snapshot | 230 CH4 plumes in the box from −122.2 to −120.9 longitude and 38.0 to 39.2 latitude: 205 in sector 6A, 13 in 1B2, 9 other, 3 in 1A1. Observed Jun 17, 2017 to Aug 18, 2026. | `data/plumes_snapshot.json` |
| Publication lag | Of the 62 plumes observed since 2025, the minimum and median lag are both 30 days. 6 were published more than 45 days later (the longest after 241 days). | computed |
| Units | `emission_auto` is kg/hr; `emission_uncertainty_auto` is ± kg/hr. **Whether it is 1σ or 95% is not stated.** | Carbon Mapper product guide v1.1.7 (https://carbonmapper.org/articles/product-guide) |
| Sector 6A | "Solid Waste Disposal On Land" | product guide |
| Rates withheld | 53 of 230 plumes have no rate (40 with `hide_emission: true`, 13 with a null rate). Shown as "rate not published". The meaning of `hide_emission` is not documented. | data, product guide |
| Platforms | Aircraft: GAO, AVIRIS-NG, AVIRIS-3. Satellites: Planet Tanager-1, and EMIT on the ISS (instrument `emi`). So the data is **not satellite-only**, and the app says "aircraft and satellites". | data |
| License | Carbon Mapper's own Terms of Use (Jan 13, 2026), not CC: non-commercial use, attribution, and redistribution only under the same terms. Bundling a trimmed snapshot in a public repo fits these terms, but the data is marked as not MIT. No logo is used (§6.2 forbids it). Credit wording used: "Source: Carbon Mapper (data.carbonmapper.org)". | https://carbonmapper.org/terms |
| Landfill names | All 9 clusters are within 0.24 to 1.55 km of a registered landfill (EPA GHGRP 2023 facility table; CalRecycle SWIS for UC Davis). Kiefer's coordinates were spot-checked against Envirofacts. | `pipeline/site_names.json` |
| Regulation | All 12 checklist items were checked against CARB's unofficial clean copy effective Jan 1, 2027: each quote is verbatim (an ellipsis marks one trimmed quote) and each page number was confirmed. | https://ww2.arb.ca.gov/sites/default/files/2026-08/Unofficial%20Clean%20LMR%20Effective%201-1-2027.pdf |
| Duty trigger | § 95469(b): "When notified by the Executive Officer of a methane emission plume detection … any owner or operator shall perform the actions…". **The duty is triggered by CARB's notification, not by public data.** The sentence the spec asked to confirm is confirmed. | regulation p. 26 |

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
* Rates are rounded to 2 significant figures, because the uncertainty is about 15 to 40%.
* The brief uses shorter `brief` wordings of each duty (still cited) so it fits one page; the app shows the full wording and the verbatim quote.
