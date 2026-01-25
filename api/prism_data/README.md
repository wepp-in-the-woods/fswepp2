# PRISM Climate Data

This directory contains PRISM (Parameter-elevation Regressions on Independent Slopes Model) climate normals data for the contiguous United States.

## Data Source

- **Provider**: PRISM Climate Group, Oregon State University
- **Dataset Version**: M4
- **PRISM Code Version**: 16.1-20210412-1020
- **Normals Period**: 1991-2020 (30-year average)
- **Created**: August 2022

## Geospatial Properties

All datasets share the same geospatial properties:

| Property | Value |
|----------|-------|
| **CRS** | EPSG:4269 (NAD83) |
| **Resolution** | 30 arc-seconds (~800m) |
| **Pixel Size** | 0.00833333° × 0.00833333° |
| **Width × Height** | 7025 × 3105 pixels |
| **Data Type** | Float32 |
| **NoData Value** | -9999.0 |

### Bounds (Geographic Coordinates)

| Boundary | Value |
|----------|-------|
| **West** | -125.0208° |
| **East** | -66.4792° |
| **North** | 49.9375° |
| **South** | 24.0625° |

### Affine Transform

```
| 0.00833333,  0.00000000, -125.02083333 |
| 0.00000000, -0.00833333,   49.93750000 |
| 0.00000000,  0.00000000,    1.00000000 |
```

## Datasets

### 1. Annual Precipitation (`prism_ppt_us_30s_2020_avg_30y/`)

Annual total precipitation (sum of all 12 months).

| Property | Value |
|----------|-------|
| **Units** | millimeters (mm) |
| **Min Value** | 45.54 |
| **Max Value** | 6210.98 |

### 2. Monthly Precipitation Normals (`ppt_normals/`)

Monthly average precipitation for each month (January-December).

**Units**: millimeters (mm)

| Month | Directory | Min (mm) | Max (mm) |
|-------|-----------|----------|----------|
| January | `prism_ppt_us_30s_202001_avg_30y/` | 4.05 | 1005.71 |
| February | `prism_ppt_us_30s_202002_avg_30y/` | 4.11 | 771.89 |
| March | `prism_ppt_us_30s_202003_avg_30y/` | 4.78 | 764.48 |
| April | `prism_ppt_us_30s_202004_avg_30y/` | 1.38 | 529.27 |
| May | `prism_ppt_us_30s_202005_avg_30y/` | 0.36 | 323.32 |
| June | `prism_ppt_us_30s_202006_avg_30y/` | 0.00 | 301.98 |
| July | `prism_ppt_us_30s_202007_avg_30y/` | 0.00 | 244.33 |
| August | `prism_ppt_us_30s_202008_avg_30y/` | 0.00 | 283.33 |
| September | `prism_ppt_us_30s_202009_avg_30y/` | 0.48 | 359.18 |
| October | `prism_ppt_us_30s_202010_avg_30y/` | 1.62 | 658.17 |
| November | `prism_ppt_us_30s_202011_avg_30y/` | 1.24 | 1258.03 |
| December | `prism_ppt_us_30s_202012_avg_30y/` | 3.28 | 1021.27 |

### 3. Monthly Maximum Temperature Normals (`tmax_normals/`)

Monthly average daily maximum temperature for each month.

**Units**: degrees Celsius (°C)

| Month | Directory | Min (°C) | Max (°C) |
|-------|-----------|----------|----------|
| January | `prism_tmax_us_30s_202001_avg_30y/` | -12.65 | 25.24 |
| February | `prism_tmax_us_30s_202002_avg_30y/` | -13.12 | 26.55 |
| March | `prism_tmax_us_30s_202003_avg_30y/` | -12.73 | 28.84 |
| April | `prism_tmax_us_30s_202004_avg_30y/` | -10.62 | 33.95 |
| May | `prism_tmax_us_30s_202005_avg_30y/` | -5.73 | 38.33 |
| June | `prism_tmax_us_30s_202006_avg_30y/` | -2.07 | 44.18 |
| July | `prism_tmax_us_30s_202007_avg_30y/` | 3.42 | 47.63 |
| August | `prism_tmax_us_30s_202008_avg_30y/` | 3.61 | 46.83 |
| September | `prism_tmax_us_30s_202009_avg_30y/` | 1.13 | 42.22 |
| October | `prism_tmax_us_30s_202010_avg_30y/` | -4.24 | 34.35 |
| November | `prism_tmax_us_30s_202011_avg_30y/` | -10.74 | 28.11 |
| December | `prism_tmax_us_30s_202012_avg_30y/` | -13.21 | 26.21 |

### 4. Monthly Minimum Temperature Normals (`tmin_normals/`)

Monthly average daily minimum temperature for each month.

**Units**: degrees Celsius (°C)

| Month | Directory | Min (°C) | Max (°C) |
|-------|-----------|----------|----------|
| January | `prism_tmin_us_30s_202001_avg_30y/` | -22.80 | 19.07 |
| February | `prism_tmin_us_30s_202002_avg_30y/` | -21.39 | 19.52 |
| March | `prism_tmin_us_30s_202003_avg_30y/` | -22.09 | 20.85 |
| April | `prism_tmin_us_30s_202004_avg_30y/` | -21.15 | 22.89 |
| May | `prism_tmin_us_30s_202005_avg_30y/` | -17.39 | 24.86 |
| June | `prism_tmin_us_30s_202006_avg_30y/` | -14.44 | 26.88 |
| July | `prism_tmin_us_30s_202007_avg_30y/` | -10.42 | 30.31 |
| August | `prism_tmin_us_30s_202008_avg_30y/` | -10.08 | 29.90 |
| September | `prism_tmin_us_30s_202009_avg_30y/` | -11.76 | 26.69 |
| October | `prism_tmin_us_30s_202010_avg_30y/` | -14.96 | 25.36 |
| November | `prism_tmin_us_30s_202011_avg_30y/` | -18.00 | 22.65 |
| December | `prism_tmin_us_30s_202012_avg_30y/` | -19.68 | 20.74 |

## File Structure

Each monthly dataset directory contains:

| File | Description |
|------|-------------|
| `*.tif` | GeoTIFF raster data |
| `*.prj` | Projection file (WKT format) |
| `*.stx` | Statistics file |
| `*.info.txt` | PRISM metadata |
| `*.xml` | XML metadata |
| `*.stn.csv` | Station data used in interpolation |
| `*.tif.aux.xml` | GDAL auxiliary metadata |

## Data Completeness

All 12 months (January-December) are present for:
- `ppt_normals/` (precipitation)
- `tmax_normals/` (maximum temperature)
- `tmin_normals/` (minimum temperature)

## Usage Example (Python)

```python
import rasterio

# Read a monthly precipitation normal
with rasterio.open("ppt_normals/prism_ppt_us_30s_202001_avg_30y/prism_ppt_us_30s_202001_avg_30y.tif") as src:
    data = src.read(1)
    # Get value at a specific coordinate
    row, col = src.index(-116.5, 43.5)  # lon, lat
    value = data[row, col]
    print(f"January precipitation: {value} mm")
```
