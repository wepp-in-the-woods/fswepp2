import os
import tempfile
import unittest

import numpy as np
from osgeo import gdal

from api.prism_cache import PrismCache


def _write_tif(path, data, geotransform, nodata):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    driver = gdal.GetDriverByName("GTiff")
    ysize, xsize = data.shape
    ds = driver.Create(path, xsize, ysize, 1, gdal.GDT_Float32)
    ds.SetGeoTransform(geotransform)
    band = ds.GetRasterBand(1)
    band.SetNoDataValue(nodata)
    band.WriteRaster(0, 0, xsize, ysize, data.astype(np.float32).tobytes())
    band.FlushCache()
    ds.FlushCache()
    ds = None


def _build_prism_normals(root):
    geotransform = (0.0, 1.0, 0.0, 2.0, 0.0, -1.0)
    nodata = -9999.0

    ppt_offsets = (0.2, 0.8, 1.2)
    tmax_offsets = (0.34, 0.76, 1.14)
    tmin_offsets = (0.26, 0.74, 1.16)

    for month in range(1, 13):
        base = float(month)

        ppt_data = np.array(
            [
                [base + ppt_offsets[0], base + ppt_offsets[1]],
                [base + ppt_offsets[2], nodata],
            ],
            dtype=np.float32,
        )
        tmax_data = np.array(
            [
                [base + tmax_offsets[0], base + tmax_offsets[1]],
                [base + tmax_offsets[2], nodata],
            ],
            dtype=np.float32,
        )
        tmin_data = np.array(
            [
                [-(base + tmin_offsets[0]), -(base + tmin_offsets[1])],
                [-(base + tmin_offsets[2]), nodata],
            ],
            dtype=np.float32,
        )

        for var, data in ("ppt", ppt_data), ("tmax", tmax_data), ("tmin", tmin_data):
            dirname = f"prism_{var}_us_30s_2020{month:02d}_avg_30y"
            tif = f"{dirname}.tif"
            path = os.path.join(root, f"{var}_normals", dirname, tif)
            _write_tif(path, data, geotransform, nodata)


class PrismCacheTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        _build_prism_normals(cls._tmp.name)
        cls.cache = PrismCache(cls._tmp.name)
        cls.cache.load()

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_quantization_and_lookup(self):
        ppt = self.cache.get_monthly_ppt(0.0, 2.0)
        ppt_shifted = self.cache.get_monthly_ppt(1.0, 2.0)
        tmax = self.cache.get_monthly_tmax(0.0, 2.0)
        tmin = self.cache.get_monthly_tmin(0.0, 2.0)

        self.assertEqual(len(ppt), 12)
        self.assertEqual(len(tmax), 12)
        self.assertEqual(len(tmin), 12)

        expected_ppt = [float(month) for month in range(1, 13)]
        expected_ppt_shifted = [float(month + 1) for month in range(1, 13)]
        expected_tmax = [month + 0.3 for month in range(1, 13)]
        expected_tmin = [-(month + 0.3) for month in range(1, 13)]

        for got, expected in zip(ppt, expected_ppt):
            self.assertAlmostEqual(got, expected, places=4)
        for got, expected in zip(ppt_shifted, expected_ppt_shifted):
            self.assertAlmostEqual(got, expected, places=4)
        for got, expected in zip(tmax, expected_tmax):
            self.assertAlmostEqual(got, expected, places=4)
        for got, expected in zip(tmin, expected_tmin):
            self.assertAlmostEqual(got, expected, places=4)

    def test_nodata_returns_nan(self):
        ppt = self.cache.get_monthly_ppt(1.0, 1.0)
        tmax = self.cache.get_monthly_tmax(1.0, 1.0)
        tmin = self.cache.get_monthly_tmin(1.0, 1.0)

        self.assertTrue(np.isnan(ppt).all())
        self.assertTrue(np.isnan(tmax).all())
        self.assertTrue(np.isnan(tmin).all())

    def test_out_of_bounds_returns_nan(self):
        ppt = self.cache.get_monthly_ppt(10.0, 10.0)
        self.assertTrue(np.isnan(ppt).all())


if __name__ == "__main__":
    unittest.main()
