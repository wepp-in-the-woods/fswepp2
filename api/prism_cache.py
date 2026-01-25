# Copyright (c) 2026, University of Idaho
# All rights reserved.
#
# In-memory cache for PRISM monthly normals.

from __future__ import annotations

import logging
import math
import os
import threading
from typing import Optional, Tuple

import numpy as np
from osgeo import gdal


logger = logging.getLogger(__name__)

_NODATA_INT16 = np.int16(-9999)
_MONTHS = tuple(range(1, 13))
_LOAD_LOCK = threading.Lock()


class PrismCache:
    def __init__(self, data_root: str) -> None:
        self.data_root = data_root
        self._ppt: Optional[np.ndarray] = None
        self._tmax: Optional[np.ndarray] = None
        self._tmin: Optional[np.ndarray] = None
        self._geo_transform: Optional[Tuple[float, float, float, float, float, float]] = None
        self._width: Optional[int] = None
        self._height: Optional[int] = None

    def load(self) -> None:
        logger.info("PRISM cache: loading monthly normals into memory...")

        ppt_dir = os.path.join(self.data_root, "ppt_normals")
        tmax_dir = os.path.join(self.data_root, "tmax_normals")
        tmin_dir = os.path.join(self.data_root, "tmin_normals")

        self._ppt = self._load_stack(ppt_dir, "ppt", scale=1.0)
        self._tmax = self._load_stack(tmax_dir, "tmax", scale=10.0)
        self._tmin = self._load_stack(tmin_dir, "tmin", scale=10.0)

        logger.info(
            "PRISM cache: loaded ppt/tmax/tmin stacks with shape %s.",
            self._ppt.shape,
        )

    def _month_tif(self, normals_dir: str, var: str, month: int) -> str:
        dirname = f"prism_{var}_us_30s_2020{month:02d}_avg_30y"
        tif = f"{dirname}.tif"
        path = os.path.join(normals_dir, dirname, tif)
        if not os.path.exists(path):
            raise FileNotFoundError(path)
        return path

    def _load_stack(self, normals_dir: str, var: str, scale: float) -> np.ndarray:
        stack = None
        for i, month in enumerate(_MONTHS):
            tif = self._month_tif(normals_dir, var, month)
            ds = gdal.Open(tif, gdal.GA_ReadOnly)
            if ds is None:
                raise RuntimeError(f"Could not open PRISM raster: {tif}")

            if self._geo_transform is None:
                self._geo_transform = ds.GetGeoTransform()
                self._width = ds.RasterXSize
                self._height = ds.RasterYSize
            else:
                if ds.RasterXSize != self._width or ds.RasterYSize != self._height:
                    raise ValueError(f"Raster shape mismatch for {tif}")

            if stack is None:
                stack = np.empty((12, self._height, self._width), dtype=np.int16)

            band = ds.GetRasterBand(1)
            nodata = band.GetNoDataValue()
            buf = band.ReadRaster(0, 0, ds.RasterXSize, ds.RasterYSize, buf_type=gdal.GDT_Float32)
            if buf is None:
                raise RuntimeError(f"Could not read raster data from {tif}")
            data = np.frombuffer(buf, dtype=np.float32).reshape((ds.RasterYSize, ds.RasterXSize))

            quant = np.rint(data * scale).astype(np.int16)
            if nodata is not None:
                quant[data == nodata] = _NODATA_INT16

            stack[i] = quant

        assert stack is not None
        return stack

    def _lnglat_to_rowcol(self, lng: float, lat: float) -> Optional[Tuple[int, int]]:
        if self._geo_transform is None or self._width is None or self._height is None:
            return None

        inv = gdal.InvGeoTransform(self._geo_transform)
        if isinstance(inv, tuple) and len(inv) == 2 and isinstance(inv[0], (bool, int)):
            success, inv_gt = inv
            if not success:
                return None
        else:
            inv_gt = inv

        px, py = gdal.ApplyGeoTransform(inv_gt, lng, lat)
        col = int(math.floor(px))
        row = int(math.floor(py))

        if col < 0 or row < 0 or col >= self._width or row >= self._height:
            return None

        return row, col

    def _extract(self, stack: np.ndarray, lng: float, lat: float, scale: float) -> np.ndarray:
        rowcol = self._lnglat_to_rowcol(lng, lat)
        if rowcol is None:
            return np.full((12,), np.nan)

        row, col = rowcol
        vals = stack[:, row, col].astype(np.float32)
        mask = vals == _NODATA_INT16
        vals = vals / scale
        if np.any(mask):
            vals[mask] = np.nan
        return vals

    def get_monthly_ppt(self, lng: float, lat: float) -> np.ndarray:
        assert self._ppt is not None
        return self._extract(self._ppt, lng, lat, scale=1.0)

    def get_monthly_tmax(self, lng: float, lat: float) -> np.ndarray:
        assert self._tmax is not None
        return self._extract(self._tmax, lng, lat, scale=10.0)

    def get_monthly_tmin(self, lng: float, lat: float) -> np.ndarray:
        assert self._tmin is not None
        return self._extract(self._tmin, lng, lat, scale=10.0)


_CACHE: Optional[PrismCache] = None


def load() -> None:
    global _CACHE
    if _CACHE is not None:
        return

    with _LOAD_LOCK:
        if _CACHE is not None:
            return
        data_root = os.path.join(os.path.dirname(__file__), "prism_data")
        cache = PrismCache(data_root)
        cache.load()
        _CACHE = cache


def _ensure_loaded() -> PrismCache:
    if _CACHE is None:
        load()
    assert _CACHE is not None
    return _CACHE


def get_prism_monthly_ppt(lng: float, lat: float) -> np.ndarray:
    """
    Return PRISM monthly precipitation totals in millimeters.
    """
    cache = _ensure_loaded()
    return cache.get_monthly_ppt(lng, lat)


def get_prism_monthly_tmax(lng: float, lat: float) -> np.ndarray:
    """
    Return PRISM monthly maximum temperature in degrees Celsius.
    """
    cache = _ensure_loaded()
    return cache.get_monthly_tmax(lng, lat)


def get_prism_monthly_tmin(lng: float, lat: float) -> np.ndarray:
    """
    Return PRISM monthly minimum temperature in degrees Celsius.
    """
    cache = _ensure_loaded()
    return cache.get_monthly_tmin(lng, lat)
