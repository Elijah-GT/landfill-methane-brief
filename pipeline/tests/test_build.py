from pipeline.build_sites import build, publication_lag_days, slugify

KM = 1 / 111.195


def plume(pid, lat, lon, ts, pub, sector="6A", rate=100.0, unc=10.0, hidden=False):
    return {
        "plume_id": pid, "lat": lat, "lon": lon, "scene_timestamp": ts, "published_at": pub,
        "sector": sector, "emission_auto": rate, "emission_uncertainty_auto": unc,
        "hide_emission": hidden, "platform": "Planet Tanager 1",
        "wind_speed_avg_auto": 3.0, "wind_direction_avg_auto": 270.0,
    }


SNAP = {
    "fetched_at": "2026-11-22T08:45:00+00:00",
    "source": "test", "source_url": "https://example.test", "bbox": [-122, 38, -121, 39],
    "plumes": [
        plume("a", 38.5, -121.2, "2025-03-01T18:00:00Z", "2025-03-31T18:00:00Z"),
        plume("b", 38.5 + 0.5 * KM, -121.2, "2025-05-01T18:00:00Z", "2025-05-31T18:00:00Z", rate=300, unc=40),
        plume("c", 38.5, -121.2, "2024-01-01T18:00:00Z", "2024-01-31T18:00:00Z", rate=None, unc=None, hidden=True),
        plume("d", 38.9, -121.9, "2025-06-01T18:00:00Z", "2025-07-01T18:00:00Z"),
        plume("og", 38.7, -121.5, "2025-06-01T18:00:00Z", "2025-07-01T18:00:00Z", sector="1B2"),
    ],
}
NAMES = [{"name": "Alpha Sanitary Landfill", "short_name": "Alpha Landfill", "lat": 38.501, "lon": -121.201,
          "county": "Sacramento", "operator": "Alpha Co", "confidence": "confirmed", "source_url": "https://x.test"}]


def test_only_waste_sector_is_clustered():
    out = build(SNAP, NAMES)
    assert out["total_plumes"] == 5
    assert out["waste_plumes"] == 4
    assert sum(s["plume_count"] for s in out["sites"]) == 4


def test_named_site_first_and_unnamed_fallback():
    out = build(SNAP, NAMES)
    top, other = out["sites"]
    assert top["id"] == "alpha-landfill"
    assert top["name"] == "Alpha Landfill"
    assert top["plume_count"] == 3
    assert top["quantified_count"] == 2
    assert top["max_rate_kg_h"] == 300
    assert other["name"].startswith("Unnamed waste site near")
    assert other["id"] == "site-2"


def test_plume_rows_flag_withheld_rates_and_sorted_by_date():
    rows = build(SNAP, NAMES)["sites"][0]["plumes"]
    assert [r["plume_id"] for r in rows] == ["c", "a", "b"]
    assert rows[0]["rate_withheld"] is True
    assert rows[1]["rate_withheld"] is False
    assert rows[2]["km_from_center"] > 0


def test_publication_lag():
    lag = publication_lag_days(SNAP["plumes"], since="2025-01-01")
    assert lag["n"] == 4
    assert lag["min"] == 30.0
    assert lag["median"] == 30.0


def test_slugify():
    assert slugify("Kiefer Landfill (Sacramento)") == "kiefer-landfill-sacramento"
