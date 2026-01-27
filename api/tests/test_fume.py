import unittest

from api.fume import (
    BUFFER_LENGTH_MIN_M,
    DISTURBED_SCENARIOS,
    FumePars,
    FEET_TO_M,
    MI_PER_MI2_TO_KM_PER_KM2,
    ROAD_DENSITY_SKIP_THRESHOLD_KM_PER_KM2,
    _cap_years,
    _round_half_up,
)
from api.shared_models import SoilTexture


class FumeUnitTests(unittest.TestCase):
    def test_buffer_length_coerces(self):
        pars = FumePars(
            soil_texture=SoilTexture.CLAY,
            total_length_m=10.0,
            buffer_length_m=20.0,
            top_slope_pct=10.0,
            mid_slope_pct=10.0,
            bottom_slope_pct=10.0,
            wildfire_cycle_years=40,
            rx_fire_cycle_years=20,
            thinning_cycle_years=20,
            road_density_km_per_km2=1.0,
        )
        expected = 10.0 - (0.1 * FEET_TO_M)
        self.assertAlmostEqual(pars.buffer_length_m, expected, places=6)
        self.assertGreaterEqual(pars.buffer_length_m, BUFFER_LENGTH_MIN_M)

    def test_years2sim_cap(self):
        self.assertEqual(_cap_years(150), 100)
        self.assertEqual(_cap_years(80), 80)
        self.assertEqual(_cap_years(None), 100)

    def test_scenario_mapping(self):
        self.assertEqual(len(DISTURBED_SCENARIOS), 9)
        self.assertEqual(DISTURBED_SCENARIOS[0]["id"], "undisturbed")
        self.assertEqual(DISTURBED_SCENARIOS[3]["id"], "wildfire")
        self.assertEqual(DISTURBED_SCENARIOS[-1]["id"], "low_wildfire")

    def test_road_density_threshold(self):
        expected = 0.001 * MI_PER_MI2_TO_KM_PER_KM2
        self.assertAlmostEqual(ROAD_DENSITY_SKIP_THRESHOLD_KM_PER_KM2, expected, places=9)

    def test_round_half_up(self):
        self.assertEqual(_round_half_up(1.25, 1), 1.3)
        self.assertEqual(_round_half_up(1.15, 1), 1.2)
        self.assertEqual(_round_half_up(2.5, 0), 3.0)


if __name__ == "__main__":
    unittest.main()
