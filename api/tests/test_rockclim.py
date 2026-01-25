import unittest
from unittest.mock import patch

import numpy as np
from fastapi import HTTPException
from pydantic import ValidationError

from api.rockclim import ClimatePars, UserDefinedParMod, get_station, get_station_par_monthlies


class RockClimUnitTests(unittest.TestCase):
    def test_station_par_monthlies_units(self):
        pars = ClimatePars(par_id="AK500352", database="legacy")
        station = get_station(pars)
        monthlies = get_station_par_monthlies(pars)

        expected_ppts_mm = [v * 25.4 for v in station.ppts]
        expected_tmax_c = [(v - 32.0) * (5.0 / 9.0) for v in station.tmaxs]
        expected_tmin_c = [(v - 32.0) * (5.0 / 9.0) for v in station.tmins]
        expected_cumulative = sum(
            v_mm * days for v_mm, days in zip(expected_ppts_mm, station.nwds)
        )

        self.assertEqual(len(monthlies["ppts"]), 12)
        self.assertEqual(len(monthlies["tmaxs"]), 12)
        self.assertEqual(len(monthlies["tmins"]), 12)

        for got, expected in zip(monthlies["ppts"], expected_ppts_mm):
            self.assertAlmostEqual(got, expected, places=4)
        for got, expected in zip(monthlies["tmaxs"], expected_tmax_c):
            self.assertAlmostEqual(got, expected, places=4)
        for got, expected in zip(monthlies["tmins"], expected_tmin_c):
            self.assertAlmostEqual(got, expected, places=4)

        self.assertAlmostEqual(monthlies["cumulative_ppts"], expected_cumulative, places=4)

    def test_user_defined_par_mod_unit_conversion(self):
        mod = UserDefinedParMod(
            description="unit-test-mod",
            ppts=[25.4] * 12,  # 1.0 inch after conversion
            tmaxs=[0.0] * 12,  # 32F after conversion
            tmins=[-10.0] * 12,  # 14F after conversion
        )
        pars = ClimatePars(par_id="AK500352", database="legacy", user_defined_par_mod=mod)
        station = get_station(pars)

        self.assertAlmostEqual(station.ppts[0], 1.0, places=2)
        self.assertAlmostEqual(station.tmaxs[0], 32.0, places=1)
        self.assertAlmostEqual(station.tmins[0], 14.0, places=1)

    def test_prism_disallowed_database(self):
        with self.assertRaises(ValidationError):
            ClimatePars(
                par_id="AK500352",
                database="au",
                use_prism=True,
                location={"longitude": -116.0, "latitude": 47.0},
            )

    @patch("api.cligen.get_prism_monthly_ppt", return_value=np.array([np.nan] * 12))
    @patch("api.cligen.get_prism_monthly_tmax", return_value=np.zeros(12))
    @patch("api.cligen.get_prism_monthly_tmin", return_value=np.zeros(12))
    def test_prism_nodata_raises(self, *_):
        pars = ClimatePars(
            par_id="AK500352",
            database="legacy",
            use_prism=True,
            location={"longitude": -116.0, "latitude": 47.0},
        )
        with self.assertRaises(HTTPException) as ctx:
            get_station(pars)
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("PRISM data unavailable", str(ctx.exception.detail))

    @patch("api.cligen.get_prism_monthly_ppt", return_value=np.ones(12) * 25.4)
    @patch("api.cligen.get_prism_monthly_tmax", return_value=np.zeros(12))
    @patch("api.cligen.get_prism_monthly_tmin", return_value=np.zeros(12))
    def test_prism_mod_clamps_zero_nwds(self, *_):
        pars = ClimatePars(par_id="AK500352", database="legacy")
        station = get_station(pars)
        station.nwds = np.zeros(12)
        modified = station.prism_mod(-116.0, 47.0)
        self.assertTrue(np.isfinite(modified.ppts).all())


if __name__ == "__main__":
    unittest.main()
