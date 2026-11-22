# Demo video script (2 min 30 s target)

Record at 1280×800 or larger, browser zoom 100%. Open the live site first:
https://elijah-gt.github.io/landfill-methane-brief/ (or `web/index.html` from disk if the network is shaky; serve it with `python -m http.server 8000 --directory web` so map tiles load).

Before recording: close other tabs, start on `index.html#site=keller-canyon-landfill` (the site with the most detections), scroll to the top. If you would rather lead with Sacramento County's own landfill, use `#site=kiefer-landfill` and swap the numbers below for the ones on screen.

| Time | Screen | Say (roughly) |
| --- | --- | --- |
| 0:00 to 0:20 | The app, Keller Canyon selected | "From January 1, 2027, California landfill operators must investigate methane plumes that CARB detects from aircraft and satellites and notifies them about, starting with a ground survey within 10 days. But the plume history, each site's record and the new duties live in different places. This tool puts them on one page for the city and county staff who oversee landfills." |
| 0:20 to 0:40 | Point at the list, then the map; click Kiefer Landfill on the map, then Keller Canyon in the list | "Here are nine landfills in the Sacramento Valley and Delta, built from 294 waste-sector plumes in Carbon Mapper's public data, grouped within one kilometre and named from EPA records. Keller Canyon has the most detections: 96, from 2016 to this September." |
| 0:40 to 1:10 | Stats row, then the timeline; hover a dot; open "All 96 detections as a table" | "Count, dates, median and largest rate. The largest was about 2,600 kilograms of methane an hour, plus or minus 750. Every dot is one detection, with its uncertainty bar; squares are detections where no rate was published. Nothing is hidden, and the whole record is in this table." |
| 1:10 to 1:40 | Scroll to the checklist; the black sign; expand one "Regulation text" | "This is what the 2027 rule asks after a CARB notice: survey within 10 days, start fixes within 5 days of a high reading, report within 15. Every line cites its section and opens the exact page of the regulation, with the verbatim text." |
| 1:40 to 2:05 | Click "Generate one-page brief"; show the page; click Print, show the preview as one page | "One click makes a one-page brief: the history, the chart, the duties, and the caveats. It prints or saves as a PDF for a manager or a meeting with the operator." |
| 2:05 to 2:30 | Back in the app, scroll to "What this tool is, and what it is not" | "And it is honest about its limits. Public data runs about 30 days behind, so this is a history, not an alert. A nearby plume may not come from the landfill. Only CARB's notification triggers the operator's duties, so every site links to CARB's CalSMP dashboard for official status. It complements that dashboard; it does not replace it." |

## Do not say

* "Repairs within 3 days." The regulation does not say that. Use "survey within 10 days of CARB's notice" (30 days at uncontrolled landfills).
* "Violation", "non-compliant" or "safe".
* "Satellite data" alone. The data is from aircraft and satellites.

## Backup plan

If the network drops: open `web/index.html` from the cloned repo. Everything works except the map tiles (the list still drives the flow).
