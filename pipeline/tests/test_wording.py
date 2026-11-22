"""Wording guard for everything a user reads. The tool reports detections and
what the rule requires; it never judges compliance or calls a place safe."""
import json
import re
from pathlib import Path

WEB = Path(__file__).resolve().parents[2] / "web"
AUTHORED = [p for p in list(WEB.glob("*.html")) + list(WEB.glob("*.js")) + [WEB / "data" / "checklist.js"]]
BANNED = [r"\bviolat\w*", r"\bnon-?complian\w*", r"\bout of compliance\b", r"\bsafe\b", r"\billegal\b", r"\bguilty\b"]


def test_authored_files_exist():
    names = {p.name for p in AUTHORED}
    assert {"index.html", "brief.html", "app.js", "brief.js", "checklist.js"} <= names


def test_no_compliance_or_safety_claims():
    hits = []
    for path in AUTHORED:
        text = path.read_text(encoding="utf-8")
        for pat in BANNED:
            for m in re.finditer(pat, text, flags=re.IGNORECASE):
                hits.append(f"{path.name}: {m.group(0)}")
    assert not hits, hits


def _checklist():
    text = (WEB / "data" / "checklist.js").read_text(encoding="utf-8")
    body = text[text.index("{"): text.rindex("}") + 1]
    # the file is a JS object literal with bare keys; quote them to parse as JSON
    as_json = re.sub(r"^(\s*)([a-z_]+):", r'\1"\2":', body, flags=re.MULTILINE)
    return json.loads(as_json)


def test_every_duty_cites_a_section_page_and_quote():
    data = _checklist()
    items = [it for g in data["groups"] for it in g["items"]]
    assert len(items) >= 8
    for it in items:
        assert it["section"].startswith("§ 954"), it["id"]
        assert isinstance(it["page"], int) and it["page"] > 0, it["id"]
        assert len(it["quote"].split()) >= 5, it["id"]
        assert it["brief"], it["id"]


def test_trigger_says_carb_notification_starts_duties():
    trig = _checklist()["trigger"]
    assert "notif" in trig["text"].lower()
    assert trig["section"] == "§ 95469(b)"
