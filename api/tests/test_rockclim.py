import unittest

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


if __name__ == "__main__":
    unittest.main()
