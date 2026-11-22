// Renders window.LMB_CHECKLIST: the trigger as a sign, then each group of duties
// with its deadline, section link and (in the app) the verbatim regulation text.
(function () {
  "use strict";

  function sectionLink(section, page) {
    var L = window.LMB;
    return L.el("a", { href: L.regPageUrl(page), rel: "noopener", target: "_blank", class: "cite" }, [
      section, L.el("span", { class: "visually-hidden", text: " (regulation page " + page + ", opens in a new tab)" })
    ]);
  }

  function render(container, opts) {
    opts = opts || {};
    var C = window.LMB_CHECKLIST, L = window.LMB;
    container.textContent = "";
    if (!C) {
      container.appendChild(L.el("p", { class: "state state--error", text: "The checklist file (web/data/checklist.js) did not load, so the rule summary is not shown." }));
      return;
    }

    var sign = L.el("div", { class: "sign" }, [
      L.el("p", { class: "sign-head", text: "Duties start with CARB’s notice" }),
      L.el("p", { class: "sign-text", text: C.trigger.text }),
      L.el("p", { class: "sign-cite" }, [sectionLink(C.trigger.section, C.trigger.page)])
    ]);
    container.appendChild(sign);
    if (!opts.compact) container.appendChild(L.el("p", { class: "note", text: C.trigger.detail }));

    C.groups.forEach(function (g) {
      var block = L.el("div", { class: "duty-group" }, [L.el("h3", { class: "duty-group-title", text: g.title })]);
      var list = L.el("ol", { class: "duties" });
      g.items.forEach(function (it) {
        var children = [
          L.el("p", { class: "duty-when", text: it.deadline || "Every report" }),
          L.el("p", { class: "duty-what", text: opts.compact && it.brief ? it.brief : it.duty }),
          L.el("p", { class: "duty-cite" }, [sectionLink(it.section, it.page)])
        ];
        if (!opts.compact) {
          children.push(L.el("details", { class: "duty-quote" }, [
            L.el("summary", { text: "Regulation text" }),
            L.el("blockquote", {}, [
              L.el("p", { text: "“" + it.quote + "”" }),
              L.el("footer", { text: it.section + ", page " + it.page })
            ])
          ]));
        }
        list.appendChild(L.el("li", { class: "duty", id: "duty-" + it.id }, children));
      });
      block.appendChild(list);
      container.appendChild(block);
    });

    if (!opts.compact) container.appendChild(L.el("p", { class: "note" }, [
      "Summarised from CARB’s ",
      L.el("a", { href: C.regulation.url, rel: "noopener", target: "_blank" }, ["unofficial clean copy of the amended regulation", L.el("span", { class: "visually-hidden", text: " (opens in a new tab)" })]),
      ", effective January 1, 2027. " + C.regulation.note
    ]));
  }

  window.LMBChecklist = { render: render };
})();
