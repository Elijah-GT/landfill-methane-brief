// Operator duties under the amended California Landfill Methane Regulation
// (title 17 CCR 95460 et seq.), effective January 1, 2027, for remotely detected
// methane plumes. Every item was checked against the regulation text; each quote
// is verbatim from CARB's unofficial clean copy (page numbers refer to that PDF).
// Hand-written; see NOTES.md for how each item was verified.
window.LMB_CHECKLIST = {
  regulation: {
    title: "Landfill Methane Regulation (amended), unofficial clean copy",
    url: "https://ww2.arb.ca.gov/sites/default/files/2026-08/Unofficial%20Clean%20LMR%20Effective%201-1-2027.pdf",
    landing: "https://ww2.arb.ca.gov/resources/documents/landfill-methane-regulation",
    official: "http://oal.ca.gov/publications/ccr/",
    effective: "2027-01-01",
    note: "CARB states the official legal edition (California Code of Regulations, published by OAL) takes precedence over this unofficial copy."
  },
  trigger: {
    text: "These duties start when CARB emails the operator a plume notification. A plume appearing in public Carbon Mapper data does not, by itself, create any duty.",
    section: "§ 95469(b)",
    quote: "When notified by the Executive Officer of a methane emission plume detection pursuant to section 95469(b)(1), any owner or operator shall perform the actions specified in sections 95469(b)(2)-(4).",
    page: 26,
    detail: "CARB may send the notice (§ 95469(b)(1)). It goes by email within seven business days of CARB receiving the data and includes a CARB ID number, the estimated plume origin coordinates, a plume image, and the detection date and time (§ 95469(b)(1)(B), pp. 26–27)."
  },
  groups: [
    {
      id: "controlled",
      title: "If the landfill has a gas collection and control system",
      items: [
        {
          id: "survey-surface",
          duty: "Walk and test the ground surface for methane across a 600 ft by 600 ft square centered on CARB's estimated plume location.",
          deadline: "Within 10 calendar days of the notice",
          section: "§ 95469(b)(2)(A)1.–2.",
          quote: "Within 10 calendar days of receiving a notification pursuant to section 95469(b)(1), the owner or operator shall perform surface emissions and component leak monitoring",
          page: 27
        },
        {
          id: "survey-components",
          duty: "In the same square, check every gas-system component (pipes, valves, fittings) for leaks, whatever its pressure.",
          deadline: "Within 10 calendar days of the notice",
          section: "§ 95469(b)(2)(A)3.",
          quote: "include monitoring of all components in the monitoring area, regardless of whether the components are expected to be under positive or negative pressure.",
          page: 27
        },
        {
          id: "fix-surface",
          duty: "If a surface reading is over the 500 ppmv limit (§ 95465(a)(1)), start corrective action within 5 days, re-test within 10 days, and re-test again one month after the first high reading.",
          deadline: "Start within 5 days; re-test within 10 days and at one month",
          section: "§ 95469(b)(2)(B), applying § 95469(a)(1)(B)",
          quote: "Initiate corrective action within five calendar days of a measured exceedance ... and the location shall be re-monitored within 10 calendar days of the measured exceedance.",
          page: 22
        },
        {
          id: "fix-components",
          duty: "If a component is leaking, tag it, repair it, and re-test it to show it is below the leak standard.",
          deadline: "Repair and re-test within 10 calendar days",
          section: "§ 95469(b)(2)(C), applying § 95469(c)(1)–(2)",
          quote: "The component leak shall be repaired and re-monitored to demonstrate it is below the leak standard in section 95464(b)(1)(B) within 10 calendar days",
          page: 28
        },
        {
          id: "report-controlled",
          duty: "Report to CARB: the notice date and CARB ID number, the monitoring results, where each problem was found, and the initial corrective action.",
          deadline: "Within 15 calendar days of the notice",
          section: "§ 95470(b)(7)(A)",
          quote: "Within 15 calendar days after receiving the notification at a controlled MSW landfill: the date of the CARB notification; identification number provided by CARB in the notification",
          page: 48
        },
        {
          id: "report-repairs",
          duty: "When a re-test first shows a problem fixed, report the repair date, re-test dates and re-test readings.",
          deadline: "Within 5 calendar days of that re-test",
          section: "§ 95470(b)(7)(B)",
          quote: "Within five calendar days after the re-monitoring that first shows each exceedance or component leak to be corrected: repair date, re-monitoring dates, and re-monitoring concentrations in ppmv.",
          page: 49
        }
      ]
    },
    {
      id: "uncontrolled",
      title: "If the landfill is uncontrolled (covered by § 95463(b)(2)(B))",
      items: [
        {
          id: "survey-uncontrolled",
          duty: "Test the entire landfill surface for methane.",
          deadline: "Within 30 calendar days of the notice",
          section: "§ 95469(b)(3)(A)",
          quote: "Within 30 calendar days after receiving a notification pursuant to section 95469(b)(1), the owner or operator shall perform instantaneous surface emissions monitoring",
          page: 28
        },
        {
          id: "report-uncontrolled",
          duty: "Report to CARB: the notice date and CARB ID number, the test date, the instrument used, and each high reading with its location.",
          deadline: "Within 35 calendar days of the notice",
          section: "§ 95470(b)(7)(C)",
          quote: "Within 35 calendar days after receiving the notification at an uncontrolled MSW landfill: the date of the CARB notification; identification number provided by CARB in the notification",
          page: 49
        }
      ]
    },
    {
      id: "all",
      title: "For every notified landfill",
      items: [
        {
          id: "submit-online",
          duty: "Submit reports electronically through CARB's Landfill Methane Regulation reporting webpage.",
          deadline: null,
          section: "§ 95470(b)(9)",
          quote: "All reports, notifications, and requests to the Executive Officer shall be submitted electronically through the Landfill Methane Regulation reporting webpage",
          page: 49
        },
        {
          id: "certify",
          duty: "Have a responsible official certify each report as true, accurate and complete.",
          deadline: null,
          section: "§ 95470(b)(10)",
          quote: "Any report, or information submitted pursuant to this subarticle shall contain certification by a responsible official of truth, accuracy, and completeness.",
          page: 50
        },
        {
          id: "keep-records",
          duty: "Keep electronic records of each exceedance and leak, its repair and re-tests, and the CARB ID number, for at least five years, stored in California.",
          deadline: "Keep 5 years; provide to CARB within 5 business days on request",
          section: "§ 95470(a)(1), (a)(1)(G), (a)(3)",
          quote: "An owner or operator shall maintain the following records in electronic format for at least five years",
          page: 37
        }
      ]
    }
  ]
};
