# Devpost submission text (draft; edit freely)

**Project name:** Landfill methane brief

**Tagline (under 200 characters):** One-page methane briefs for Sacramento-area landfills: every aircraft and satellite plume detection, its uncertainty, and what California's 2027 rule asks of the operator.

## Inspiration

From January 1, 2027, California's amended Landfill Methane Regulation requires landfill operators to investigate methane plumes that CARB detects remotely and notifies them about. The plume data is public, but it sits in a research catalog, the legal duties sit in a 74-page regulation, and the city and county staff who oversee or contract with landfills have no quick way to see one site's record.

## What it does

* Groups 294 waste-sector methane plumes (Oct 2016 to Sep 2026) from Carbon Mapper's public catalog into nine landfill sites in the Sacramento Valley and Delta, each named from EPA and CalRecycle records.
* For each site: count, dates, median and largest emission rate with its published uncertainty, and a timeline with one dot per detection, an uncertainty bar, and detections with no published rate shown as well.
* A plain-language checklist of the operator's duties after a CARB notice, each with its deadline, its section, a link to the exact page of the regulation and the verbatim text.
* One click makes a print-ready, one-page brief with data dates, the 30-day publication lag, caveats and credits.
* It complements CARB's CalSMP dashboard (the official source for notification status) rather than replacing it, and links to it from every site.

## How we built it

* **Data pipeline (Python, standard library only):** fetches the Carbon Mapper plume API with pagination, saves a trimmed snapshot, keeps sector 6A (solid waste), clusters detections with 1 km single-linkage, computes per-site statistics and matches names within 3 km. It is covered by pytest tests, including a wording guard that fails the build if any page says "violation", "non-compliant" or "safe".
* **Front end:** static HTML, CSS and JavaScript with no build step, Leaflet for the map, and a hand-drawn SVG timeline that prints sharply and has a text alternative. Data ships as a JS file, so the app opens straight from disk and the demo cannot fail on an API outage.
* **Regulation checklist:** every item was checked against CARB's clean copy of the amended regulation, with section, page and a verbatim quote.
* **Deployment:** GitHub Pages via GitHub Actions, with tests running on every push.

## Challenges we ran into

* **Getting the law right.** Secondary summaries said repairs must start "within 3 days". The regulation actually says a ground survey within 10 days of CARB's notice (30 at uncontrolled landfills), corrective action within 5 days of a high reading, and a report within 15 days. We built only from the primary text.
* **Not overclaiming.** A plume near a landfill may not come from it, rates carry their published uncertainty, 71 of 346 plumes in the region have no published rate, and the public data runs about 30 days behind. Every one of those caveats is on the screen and on the brief.
* **Checking our own data.** An independent audit caught that our first bounding box cut through one landfill and dropped most of its record; the pipeline now warns when a site sits near the box edge.
* Fitting a cited legal checklist, a chart and the caveats on one printed page. We checked it by printing every site's brief to PDF and counting pages.

## Accomplishments we are proud of

* Every number traces to a public record, and every legal line traces to a section and a page.
* It works offline, by keyboard, on a phone, and on paper.

## What we learned

* The duty is triggered by CARB's notification, not by a plume appearing in public data. That distinction shaped the whole product.
* The data is from aircraft as well as satellites. Both count as remote monitoring.

## What's next

* Add CARB's notification status from CalSMP if its data export allows.
* Compare detections with EPA-reported landfill emissions. The GHGRP facility IDs are already matched.
* Cover other California regions; the pipeline takes any bounding box.
* Test with real county solid-waste staff.

## Built with

python, javascript, html, css, leaflet, openstreetmap, svg, github-actions, github-pages, carbon-mapper-api

## Credits

Plume data: Source: Carbon Mapper (data.carbonmapper.org), used non-commercially under the Carbon Mapper Terms of Use. Regulation: California Air Resources Board. Landfill names: U.S. EPA GHGRP and CalRecycle SWIS. Map: © OpenStreetMap contributors.
