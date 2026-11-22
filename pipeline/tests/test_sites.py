import math

import pytest

from pipeline.sites import (
    cluster_points,
    haversine_km,
    match_name,
    site_stats,
)


def p(lat, lon, ts="2024-05-01T18:00:00Z", rate=100.0, unc=20.0, pub=None, pid=None, platform="AVIRIS-NG"):
    return {
        "plume_id": pid or f"{lat:.4f},{lon:.4f},{ts}",
        "lat": lat, "lon": lon,
        "scene_timestamp": ts,
        "published_at": pub,
        "emission_auto": rate,
        "emission_uncertainty_auto": unc,
        "platform": platform,
        "sector": "6A",
    }


# ~1 km of latitude is 1/111.195 degrees
KM = 1 / 111.195


class TestHaversine:
    def test_zero(self):
        assert haversine_km(38.5, -121.2, 38.5, -121.2) == 0

    def test_one_degree_latitude(self):
        assert haversine_km(38.0, -121.0, 39.0, -121.0) == pytest.approx(111.195, rel=1e-3)

    def test_longitude_shrinks_with_latitude(self):
        d = haversine_km(38.5, -121.0, 38.5, -120.0)
        assert d == pytest.approx(111.195 * math.cos(math.radians(38.5)), rel=1e-2)


class TestCluster:
    def test_close_points_merge(self):
        pts = [p(38.5, -121.2), p(38.5 + 0.9 * KM, -121.2)]
        assert cluster_points(pts, 1.0) == [[0, 1]]

    def test_far_points_split(self):
        pts = [p(38.5, -121.2), p(38.5 + 1.1 * KM, -121.2)]
        assert sorted(cluster_points(pts, 1.0)) == [[0], [1]]

    def test_chain_merges_transitively(self):
        pts = [p(38.5 + i * 0.8 * KM, -121.2) for i in range(4)]
        assert cluster_points(pts, 1.0) == [[0, 1, 2, 3]]

    def test_largest_cluster_first(self):
        pts = [p(38.0, -121.0), p(38.5, -121.2), p(38.5 + 0.1 * KM, -121.2)]
        assert cluster_points(pts, 1.0) == [[1, 2], [0]]

    def test_empty(self):
        assert cluster_points([], 1.0) == []


class TestStats:
    def test_counts_dates_and_rates(self):
        pts = [
            p(38.5, -121.2, "2019-07-01T18:00:00Z", 100, 10),
            p(38.5, -121.2, "2021-08-01T18:00:00Z", 300, 50),
            p(38.5, -121.2, "2021-09-01T18:00:00Z", 200, 30),
        ]
        s = site_stats(pts)
        assert s["plume_count"] == 3
        assert s["first_date"] == "2019-07-01"
        assert s["last_date"] == "2021-09-01"
        assert s["quantified_count"] == 3
        assert s["median_rate_kg_h"] == 200
        assert s["max_rate_kg_h"] == 300
        assert s["max_rate_uncertainty_kg_h"] == 50
        assert s["max_rate_date"] == "2021-08-01"
        assert s["per_year"] == {"2019": 1, "2021": 2}

    def test_unquantified_plumes_are_counted_but_not_in_rates(self):
        pts = [p(38.5, -121.2, rate=None, unc=None), p(38.5, -121.2, rate=50, unc=5)]
        s = site_stats(pts)
        assert s["plume_count"] == 2
        assert s["quantified_count"] == 1
        assert s["median_rate_kg_h"] == 50

    def test_all_unquantified(self):
        s = site_stats([p(38.5, -121.2, rate=None, unc=None)])
        assert s["median_rate_kg_h"] is None
        assert s["max_rate_kg_h"] is None

    def test_even_count_median(self):
        pts = [p(38.5, -121.2, rate=r) for r in (10, 20, 30, 40)]
        assert site_stats(pts)["median_rate_kg_h"] == 25

    def test_centroid(self):
        pts = [p(38.0, -121.0), p(38.2, -121.2)]
        s = site_stats(pts)
        assert s["lat"] == pytest.approx(38.1)
        assert s["lon"] == pytest.approx(-121.1)

    def test_platforms_sorted_by_count(self):
        pts = [p(38, -121, platform="A"), p(38, -121, platform="B"), p(38, -121, platform="B")]
        assert site_stats(pts)["platforms"] == [["B", 2], ["A", 1]]


class TestMatchName:
    NAMES = [
        {"name": "Alpha Landfill", "lat": 38.50, "lon": -121.20},
        {"name": "Beta Landfill", "lat": 38.60, "lon": -121.70},
    ]

    def test_nearest_within_radius(self):
        assert match_name(38.505, -121.205, self.NAMES, 2.0)["name"] == "Alpha Landfill"

    def test_none_when_too_far(self):
        assert match_name(38.0, -121.0, self.NAMES, 2.0) is None


def test_in_california_border():
    from pipeline.sites import in_california
    assert in_california(38.52, -121.19)        # Kiefer Landfill, Sacramento County
    assert in_california(33.23, -115.99)        # Salton Sea area, Imperial County
    assert in_california(39.5, -120.05)         # just west of the 120th meridian
    assert not in_california(39.5, -119.9)      # Reno side of the meridian
    assert not in_california(36.375, -114.865)  # Apex area, Clark County, Nevada
    assert not in_california(42.1, -122.0)      # Oregon
