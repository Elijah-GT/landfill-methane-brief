# Devpost submission text (draft; edit freely)

**Project name:** Methane Docket

**Tagline (under 200 characters):** Where California’s landfills leak methane, where on the site it keeps happening, and what the 2027 rule asks the operator once CARB sends a notice.

## Inspiration

**Why it matters.** Inside a landfill, microbes break down food and yard waste without oxygen and make methane. Where it escapes, it drifts downwind as a plume that aircraft and satellites can now see and measure. Methane is about 80 times as potent as carbon dioxide (U.S. EPA) and lasts only 7 to 12 years in the air, so cutting it slows warming this decade. Landfills are California's second-largest methane source, about a fifth of the total, and their gas also carries toxic air contaminants and odour-causing compounds to the people who live nearby (CARB). Finding and fixing the biggest plumes is one of the fastest climate wins available, and the local staff who oversee landfills are the people best placed to follow up.

From January 1, 2027, California’s amended Landfill Methane Regulation requires landfill operators to act when CARB detects a methane plume remotely and notifies them: a ground survey within 10 days and a report within 15 (30 and 35 days at uncontrolled landfills). The plume data is public, but it sits in a research catalog, the duties sit in a 74-page regulation, and the city and county staff who oversee landfills have no quick way to see one site’s record or follow a notice.

## What it does

* **Every California landfill.** Groups 2,707 waste-sector methane plumes seen by aircraft and satellites (Sep 2016 to Oct 2026, Carbon Mapper’s public catalog) into 53 landfill sites, names 41 of them from EPA records, and shows them on a searchable list and a map.
* **Recent first.** Opens on the last 24 months (249 detections at 35 sites, mostly by satellite), because ten-year totals mostly track when aircraft flew over. The full history is one switch away.
* **Where detections repeat.** Finds spots within 200 m with detections on two or more different days. At Sunshine Canyon, 17 of 32 recent detections came from one spot, on 7 days. Each spot comes with a question for the operator.
* **After a CARB notice.** Enter the date the notice arrived and the landfill type; get each due date, where it stands today, the rule behind it (section, page, verbatim text) and what to ask the operator.
* **A one-page brief** for a manager or a meeting: key figures, timeline, repeat spots, the latest detections with coordinates, and after a notice, the due dates with space for the operator’s answers.

## How we built it

* **Data pipeline (Python, standard library only):** fetches the Carbon Mapper plume API for a box around California, keeps sector 6A (solid waste), clusters detections at 1 km, folds outlying groups into the landfill they match, drops sites outside California’s border, names sites from EPA GHGRP landfill records within 3 km, and computes statistics for the full record and the last 24 months.
* **Front end:** static HTML, CSS and JavaScript with no build step, Leaflet for the map, and a hand-drawn SVG timeline. Data ships as a JS file, so it opens straight from disk and the demo cannot fail on an API outage.
* **Regulation:** every duty was checked word for word against CARB’s clean copy of the amended rule, with section and page.
* **Quality:** 51 tests (Python and, for the browser logic, Node), a wording guard that fails the build if any page says “violation”, “non-compliant” or “safe”, every printable brief variant (265) checked to fit one page, and independent reviews of the data, the law and the after-notice feature.
* **Deployment:** GitHub Pages via GitHub Actions, tests on every push.

## Challenges we ran into

* **Getting the law right.** Secondary summaries said repairs must start “within 3 days”. The regulation says survey within 10 days of the notice, start corrective action within 5 days of a high reading, and report within 15. An audit also caught that uncontrolled landfills report readings of 200 ppmv or more, a different threshold.
* **Not overclaiming.** A plume near a landfill may come from a neighbour, rates are estimates, public data lags about 30 days, and a gap means no flyover, not no leak. The rule also never says how to count days around weekends, so the app says so.
* **Totals that mislead.** 56% of all detections come from 2024, mostly two months of aircraft flights. That is why the app opens on the last 24 months and finds repeat spots by distinct days.

## Accomplishments we are proud of

* A finding you cannot get elsewhere: where on a landfill detections keep recurring.
* Every number traces to a public record, and every legal line to a section and a page.

## What we learned

* The duty is triggered by CARB’s notification, not by a plume appearing in public data. That distinction shaped the whole product.
* What a page is for matters more than what it can hold.

## What’s next

* CARB’s notification status beside each site, if CalSMP’s data allows.
* EPA-reported landfill emissions alongside the detections (facility IDs are already matched).
* Testing with county solid-waste staff.

## Built with

python, javascript, html, css, leaflet, openstreetmap, svg, node, github-actions, github-pages, carbon-mapper-api

## Credits

Plume data: Source: Carbon Mapper (data.carbonmapper.org), used non-commercially under the Carbon Mapper Terms of Use. Regulation: California Air Resources Board. Landfill names: U.S. EPA GHGRP and CalRecycle SWIS. Map: © OpenStreetMap contributors.
