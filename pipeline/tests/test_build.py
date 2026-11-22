from pipeline.build_sites import build, km_to_bbox_edge, publication_lag_days, slugify

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
    assert other["id"] == "site-38-900-121-900"  # from its coordinates, so links survive a data refresh


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


def test_nearby_other_sector_plumes_are_reported_not_counted():
    snap = dict(SNAP, plumes=SNAP["plumes"] + [
        plume("x", 38.5 + 0.3 * KM, -121.2, "2025-06-01T18:00:00Z", "2025-07-01T18:00:00Z", sector="other")])
    top = build(snap, NAMES)["sites"][0]
    assert top["plume_count"] == 3
    assert top["nearby_other_sector"] == 1


def test_waste_only_date_range():
    out = build(SNAP, NAMES)
    assert out["waste_oldest_observation"] == "2024-01-01"
    assert out["waste_newest_observation"] == "2025-06-01"


def test_km_to_bbox_edge():
    assert km_to_bbox_edge(38.0 + 1 * KM, -121.5, [-122, 38, -121, 39]) < 1.01
    assert km_to_bbox_edge(38.5, -121.5, [-122, 38, -121, 39]) > 40


def test_edge_site_warns(capsys):
    snap = dict(SNAP, bbox=[-121.3, 38.499, -121.1, 38.6])
    build(snap, NAMES)
    assert "fetch box edge" in capsys.readouterr().err


def test_fallback_names_and_out_of_state_sites():
    from pipeline.build_sites import build
    def plume(pid, lat, lon):
        return {"plume_id": pid, "scene_timestamp": "2024-01-01T00:00:00Z", "published_at": "2024-02-01T00:00:00Z",
                "sector": "6A", "lat": lat, "lon": lon, "emission_auto": 100.0, "emission_uncertainty_auto": 30.0,
                "platform": "GAO", "hide_emission": False}
    snap = {"fetched_at": "2026-01-01T00:00:00Z", "plumes": [
        plume("a", 38.0, -121.0), plume("b", 37.0, -120.0), plume("nv", 36.375, -114.865)]}
    curated = [{"name": "A", "short_name": "Curated A", "lat": 38.001, "lon": -121.0}]
    epa = [{"name": "A EPA", "short_name": "EPA A", "lat": 38.0, "lon": -121.0},
           {"name": "B", "short_name": "EPA B", "lat": 37.05, "lon": -120.0, "source_url": "u"}]
    data = build(snap, curated, epa)
    names = [s["name"] for s in data["sites"]]
    assert "Curated A" in names and "EPA A" not in names          # hand-checked names win
    unnamed = [s for s in data["sites"] if s["official_name"] is None][0]
    assert unnamed["nearest_record"]["name"] == "EPA B"            # 5.6 km away: shown, not used as the name
    assert unnamed["id"] == "site-37-000-120-000"
    assert data["outside_california"] == [{"lat": 36.375, "lon": -114.865, "plume_count": 1}]
    assert data["waste_plumes"] == 2
