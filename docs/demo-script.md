# Demo video script (2 min 30 s target)

Slides for the problem and the solution, then every feature shown live in the app, then one closing slide.

**Setup:** one browser window, two tabs. Tab 1: the slide deck in Present mode. Tab 2: the live app at
https://elijah-gt.github.io/methane-docket/#site=sunshine-canyon-landfill (press Ctrl+Shift+R once, then scroll to the top).
Full screen with F11; switch tabs with Ctrl+Tab. Record at 1920×1080 if you can.

| Time | Screen | Say (roughly) |
| --- | --- | --- |
| 0:00 to 0:10 | Slide 1: cover | “This is Methane Docket, a tool for the city and county staff who oversee California’s landfills.” |
| 0:10 to 0:30 | Slide 2: “Methane plumes and the climate” | “Inside a landfill, microbes break down food waste and make methane. When it escapes, it drifts downwind as a plume that aircraft and satellites can now see. Methane is about 80 times as potent as carbon dioxide, landfill gas carries toxic compounds to neighbours, and landfills are California’s second-largest methane source. Cutting it slows warming this decade.” |
| 0:30 to 0:45 | Slide 3: “A CARB notice starts the clock” | “From January 1, 2027, when CARB notifies an operator of a plume, the clock starts: survey in 10 days, report in 15. But the plume history, the legal duties and the site records live in three different places.” |
| 0:45 to 1:00 | Slide 4: “The solution” | “Methane Docket puts them in one place. See every landfill’s plumes, find where on the site they keep repeating, and follow up after a notice. Let me show you.” |
| 1:00 to 1:15 | App: click **Expand map**, then **Close map**; point at the list and the **Last 24 months / Full history** switch | “Every waste-sector plume in California from Carbon Mapper’s public data: 2,707 detections at 53 landfills, named from EPA records. It opens on the last 24 months, because older totals mostly reflect when aircraft happened to fly over. The full history is one click away.” |
| 1:15 to 1:40 | App: Sunshine Canyon is selected; show the four figures and the chart, then scroll to **Where detections repeat** | “Sunshine Canyon: 32 detections in the last two years, with the rate and uncertainty of each. And here is what you can’t get anywhere else: 17 of those 32 came from one spot, within 200 metres, on 7 different days. That’s a question for the operator: what is at this spot, and has it been checked or repaired since?” |
| 1:40 to 2:00 | App: search “Kiefer” and pick it; scroll to **After a CARB notice**; enter **03/04/2027**, pick **Controlled** | “If CARB has notified the operator, enter the date the notice arrived. You get each due date, the rule behind it with section and page, and what to ask. A passed date is a prompt to ask, never a finding.” |
| 2:00 to 2:15 | App: scroll up, click **Generate one-page brief**; show the page, then **Print or save as PDF** | “One click makes a one-page brief for a manager or a meeting with the operator, with the due dates first and space to write the operator’s answers.” |
| 2:15 to 2:30 | Back to the deck: last slide, “Pick your landfill” | “Every legal line is cited to CARB’s text, checked word for word, and the tool never says a landfill is in violation. Only CARB’s notice starts the duties. Methane Docket: pick your landfill at the link.” |

The notice date shows “This date is in the future” because any 2027 notice is in the future today. That is expected; you can say “for a notice after the rule starts”.

## Do not say

* “Repairs within 3 days.” The regulation does not say that.
* “Violation”, “non-compliant” or “safe”.
* “Satellite data” alone. The data is from aircraft and satellites.
* That a spot is a leak. Say “detections repeat at this spot”; locations are estimated plume origins.

## Backup plan

If the network drops: open `web/index.html` from the cloned repo. Everything works except the map tiles (the list still drives the flow).
