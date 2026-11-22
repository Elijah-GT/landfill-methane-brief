"""Due dates after a CARB notice (web/notice.js), run through Node.

The regulation's clocks: controlled landfills survey within 10 calendar days of receiving the
notice and report within 15 (§ 95469(b)(2)(A), § 95470(b)(7)(A)); uncontrolled landfills survey
within 30 and report within 35 (§ 95469(b)(3)(A), § 95470(b)(7)(C)). Days are counted as the
receipt date plus N calendar days, with no weekend or holiday shift (see notice.js)."""
import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

NOTICE = Path(__file__).resolve().parents[2] / "web" / "notice.js"
CHECKLIST = Path(__file__).resolve().parents[2] / "web" / "data" / "checklist.js"
NODE = shutil.which("node")
pytestmark = pytest.mark.skipif(NODE is None, reason="Node.js is not installed")


def run(expr: str):
    script = f"const N = require({json.dumps(str(NOTICE))}); console.log(JSON.stringify({expr}));"
    out = subprocess.run([NODE, "-e", script], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def test_controlled_due_dates():
    s = run('N.steps("2027-03-04", "controlled")')
    assert [(d["days"], d["due"], d["item"]) for d in s["dated"]] == [
        (10, "2027-03-14", "survey-surface"), (15, "2027-03-19", "report-controlled")]
    assert [c["item"] for c in s["conditional"]] == ["fix-surface", "fix-components", "report-repairs"]


def test_uncontrolled_due_dates_cross_a_month_end():
    s = run('N.steps("2027-01-20", "uncontrolled")')
    assert [(d["days"], d["due"]) for d in s["dated"]] == [(30, "2027-02-19"), (35, "2027-02-24")]
    assert [c["item"] for c in s["conditional"]] == ["uncontrolled-200"]
    assert "200 ppmv" in s["dated"][1]["what"]


def test_not_sure_shows_both_sets_in_date_order():
    s = run('N.steps("2027-12-20", "unknown")')
    assert [(d["type"], d["days"], d["due"]) for d in s["dated"]] == [
        ("controlled", 10, "2027-12-30"), ("controlled", 15, "2028-01-04"),
        ("uncontrolled", 30, "2028-01-19"), ("uncontrolled", 35, "2028-01-24")]


def test_leap_year():
    assert run('N.addDays("2028-02-25", 10)') == "2028-03-06"
    assert run('N.addDays("2027-02-25", 10)') == "2027-03-07"


def test_standing_is_neutral():
    assert run('N.standing("2027-03-14", "2027-03-10")') == {"key": "ahead", "text": "in 4 days"}
    assert run('N.standing("2027-03-14", "2027-03-14")')["key"] == "today"
    passed = run('N.standing("2027-03-14", "2027-03-17")')
    assert passed["key"] == "passed" and "ask whether it was done" in passed["text"]


def test_hash_round_trip_and_bad_input():
    st = run('N.fromHash("#site=kiefer-landfill&notice=2027-03-04&type=controlled&carb=LMR-123")')
    assert st == {"date": "2027-03-04", "type": "controlled", "carb": "LMR-123"}
    assert run('N.toHash({date: "2027-03-04", type: "controlled", carb: "LMR-123"})') == \
        "&notice=2027-03-04&type=controlled&carb=LMR-123"
    assert run('N.fromHash("#site=x&notice=2027-02-30")') is None          # impossible date
    assert run('N.fromHash("#site=x&notice=2027-03-04&type=bogus")')["type"] == "unknown"
    assert run('N.fromHash("#site=x&notice=2027-03-04&carb=%3Cscript%3E")')["carb"] == "script"


def test_every_step_points_at_a_cited_checklist_item():
    ids = set(re.findall(r'id: "([a-z0-9-]+)"', CHECKLIST.read_text(encoding="utf-8")))
    s = run('N.steps("2027-03-04", "unknown")')
    for step in s["dated"] + s["conditional"]:
        assert step["item"] in ids, step["item"]


def test_malformed_escapes_do_not_throw():
    assert run('N.fromHash("#site=x&notice=2027-03-04&type=controlled&carb=50%")') ==         {"date": "2027-03-04", "type": "controlled", "carb": ""}
    assert run('N.fromHash("#site=x&notice=2027-03-04&carb=%E0%A4")')["carb"] == ""
    assert run('N.fromHash("#site=x&notice=%E0%A4")') is None


def test_inherited_property_names_are_not_types():
    for bad in ("toString", "__proto__", "constructor", "hasOwnProperty"):
        assert run(f'N.fromHash("#notice=2027-03-04&type={bad}")')["type"] == "unknown"
        steps = run(f'N.steps("2027-03-04", "{bad}")')
        assert len(steps["dated"]) == 4          # treated as "not sure": both sets


def test_round_trip_with_spaces_and_partial_form():
    st = {"date": "2027-03-04", "type": "uncontrolled", "carb": "LMR 12.3"}
    h = run(f'N.toHash({json.dumps(st)})')
    assert run(f'N.fromHash({json.dumps("#site=x" + h)})') == st
    # while the date is still being typed, the type and ID are kept but no notice is made
    partial = run('N.formToHash({date: "", type: "controlled", carb: "A1"})')
    assert partial == "&type=controlled&carb=A1"
    assert run(f'N.fromHash({json.dumps("#site=x" + partial)})') is None
    assert run(f'N.formFromHash({json.dumps("#site=x" + partial)})') == {"date": "", "type": "controlled", "carb": "A1"}
    assert run('N.toHash({date: "", type: "controlled"})') == ""


def test_notice_year_range():
    assert run('N.validNoticeDate("0202-03-04")') is False      # a year typed digit by digit
    assert run('N.validNoticeDate("2019-12-31")') is False
    assert run('N.validNoticeDate("2020-01-01")') is True
    assert run('N.validNoticeDate("2099-12-31")') is True
    assert run('N.fromHash("#notice=0202-03-04")') is None


def test_standing_tomorrow_and_yesterday():
    assert run('N.standing("2027-03-14", "2027-03-13")') == {"key": "ahead", "text": "tomorrow"}
    y = run('N.standing("2027-03-14", "2027-03-15")')
    assert y["key"] == "passed" and y["text"].startswith("date passed yesterday")

