# FSWEPP2 API

FastAPI backend that re-implements parts of the legacy FSWEPP web stack as JSON/CLI-friendly endpoints.

This API currently covers:
- Rock:Clime (climate station lookup and climate generation)
- WEPP:Road
- Disturbed WEPP
- ERMiT
- Lightweight run logging

The API is exposed under the `/api` prefix (except `/health`).

## Quick start

Using the fswepp2 docker-compose setup:

```
docker compose up --build
```

Then:
- Base URL: `http://localhost:8090`
- Swagger UI: `http://localhost:8090/docs`

The container mounts a tmpfs at `/dev/shm` (see `docker-compose.yml`). All generated WEPP/CLIGEN artifacts are written under `/dev/shm`.

## Runtime layout

- `api/`: FastAPI routers and shared models
- `api/db/`: model data files (soils, managements, YAML databases)
- `api/db/users/rockclim/`: per-user JSON storage for user-defined climate parameter mods
- `api/logs/`: binary run logs (one per model/year)
- `/dev/shm/`: temp work area for generated WEPP/CLIGEN files

## Dependencies

- FastAPI + Uvicorn
- wepppy2 (cligen + wepp runner bindings)
- all_your_base (stats utilities for return-period calculations)
- numpy, pandas, pyyaml

The Dockerfile clones `wepppy2` and `all_your_base` into the venv. The API calls WEPP binaries under `wepppy2/wepp_runner/bin` and CLIGEN binaries under `wepppy2/climates/cligen/bin`.

## Conventions

- All API routes are prefixed with `/api`.
- Most endpoints use `POST` even when the path includes `GET` (historical naming).
- Output content types:
  - `application/json` for JSON responses
  - `application/text` for raw WEPP/CLIGEN/soil/slope/management files
- Errors:
  - Some endpoints raise FastAPI `HTTPException` with a status code
  - A global exception handler returns JSON with `detail`, `error`, and `stack_trace`
    only when `FSWEPP_DEBUG` is enabled; otherwise it returns a generic 500 payload

## Shared models

### SoilTexture

Allowed values:
- `clay`
- `silt`
- `sand`
- `loam`

### ClimatePars

```
{
  "database": "legacy" | "2015" | "au" | "ghcn" | null,
  "state_code": "WA",
  "par_id": "WA459074",
  "input_years": 100,
  "cligen_version": "5.3.2" | "4.3",
  "location": {"longitude": -116.0, "latitude": 47.0},
  "use_prism": false,
  "user_defined_par_mod": {
    "description": "my custom par",
    "ppts": [12 monthly floats],
    "tmaxs": [12 monthly floats],
    "tmins": [12 monthly floats]
  }
}
```

Notes:
- `database` defaults to `legacy`
- `cligen_version` defaults to `5.3.2`
- `location` is required for `use_prism` and for `GET/closest_stations`
- `user_defined_par_mod` is optional and only used when saving/modifying user-specific station parameters

## Health

### GET /health

Returns:
```
{"status": "ok"}
```

## Rock:Clime endpoints

All routes under `/api/rockclim/...`.

### POST /rockclim/GET/available_state_codes

Request body:
```
{"database": "ghcn"}
```

Response: JSON map of state code to state name.

### POST /rockclim/GET/stations_geojson

Request body:
```
{
  "database": "2015",
  "bbox": [-120, 48, -115, 42]
}
```

Response: GeoJSON FeatureCollection of stations within the bbox.

### POST /rockclim/GET/stations_in_state

Request body:
```
{"database": "legacy", "state_code": "WA"}
```

Response: list of station metadata objects.

### POST /rockclim/GET/closest_stations

Request body:
```
{
  "database": "legacy",
  "location": {"longitude": -116, "latitude": 47}
}
```

Response: list of nearest station metadata objects.

### POST /rockclim/GET/station_par

Request body:
```
{"par_id": "WA459074"}
```

Response: `.par` file contents (text).

### POST /rockclim/GET/station_par_monthlies

Request body:
```
{
  "par_id": "WA459074",
  "location": {"longitude": -117.0, "latitude": 47.0},
  "use_prism": true
}
```

Response: JSON monthlies (includes `cumulative_nwds`).

### POST /rockclim/GET/climate

Request body:
```
{"par_id": "WA459074", "input_years": 10}
```

Response: `.cli` file contents (text).

### POST /rockclim/GET/climate_monthlies

Request body:
```
{"par_id": "WA459074", "input_years": 10}
```

Response: JSON monthlies computed from the generated climate file.

### POST/PUT /rockclim/PUT/user_defined_par

Request body:
```
{
  "par_id": "WA459074",
  "user_defined_par_mod": {
    "description": "my custom par",
    "ppts": [0.34, 0.36, 0.48, 0.54, 0.53, 0.4, 0.45, 0.26, 0.28, 0.43, 0.34, 0.33],
    "tmaxs": [36.31, 40.42, 47.86, 55.38, 64.82, 70.74, 82.29, 83.43, 73.74, 58.84, 43.67, 35.31],
    "tmins": [24.55, 25.54, 29.29, 33.7, 39.99, 44.99, 48.65, 47.92, 41.87, 35.02, 29.38, 24.04]
  }
}
```

Requires a `user_id` cookie (set automatically by the middleware). Stores the payload under `api/db/users/rockclim/<user_id>.json` keyed by a hash of the request.

### POST /rockclim/DEL/user_defined_par

Same payload as `PUT/user_defined_par`. Removes the entry for that hash from the user JSON file.

### GET /rockclim/GET/user_defined_pars

Returns the full JSON object stored for the requesting `user_id`.

## WEPP:Road endpoints

All routes under `/api/wepproad/...`.

### Data model

```
WeppRoadState:
  climate: ClimatePars
  wepproad_pars: WepproadPars
  wepp_version: "wepp2010"

WepproadPars:
  soil_texture: SoilTexture
  rfg_pct: float
  road: Road
  fill: Fill
  buffer: Buffer

Road:
  slope_pct: float
  length_m: float
  width_m: float
  surface: "gravel" | "paved"
  design: "inveg" | "outunrut" | "outrut" | "inbare"
  traffic: "high" | "low" | "none"

Fill:
  slope_pct: float
  length_m: float

Buffer:
  slope_pct: float
  length_m: float
```

Lengths are meters, slopes are percent. The `outunrut` design applies an outslope correction when generating WEPP geometry.

### POST /wepproad/GET/soil

Returns the generated soil file contents (text).

### POST /wepproad/GET/management

Returns the selected management file contents (text).

### POST /wepproad/GET/slope

Returns the generated slope file contents (text).

### POST /wepproad/RUN/wepp

Runs WEPP and returns parsed JSON summary output. The response is produced by `parse_wepp_soil_output()` and includes road-specific metrics like `road_prism_erosion_kg` and `sediment_leaving_buffer_kg`.

### POST /wepproad/GET/wepp_output

Returns the raw WEPP output file (text).

## Disturbed WEPP endpoints

All routes under `/api/disturbed...`.

### Data model

```
DisturbedWeppState:
  climate: ClimatePars
  disturbedwepp_pars: DisturbedWeppPars
  wepp_version: "wepp2010"

DisturbedWeppPars:
  soil_texture: SoilTexture
  width_m: float (default 90)
  upper_ofe: DisturbedOFE
  lower_ofe: DisturbedOFE

DisturbedOFE:
  landuse: "OldForest" | "YoungForest" | "Shrub" | "Bunchgrass" | "Sod" | "LowFire" | "HighFire" | "Skid"
  slope_point1_pct: float
  slope_point2_pct: float
  length_m: float
  cover_pct: float
  rfg_pct: float
```

### POST /disturbed/GET/soil

Returns the generated soil file (text).

### POST /disturbed/GET/management

Returns the generated management file (text).

### POST /disturbed/GET/slope

Returns the generated slope file (text).

### POST /disturbedwepp/RUN/wepp

Runs WEPP and returns parsed JSON output via `parse_wepp_soil_output()`.

### POST /disturbedwepp/GET/wepp_output

Returns the raw WEPP output file (text).

## ERMiT endpoints

All routes under `/api/ermit/...`.

### Data model

```
ErmitState:
  climate: ClimatePars
  ermit_pars: ErmitPars
  wepp_version: "wepp2010"

ErmitPars:
  top_slope_pct: float
  middle_slope_pct: float
  bottom_slope_pct: float
  length_m: float
  soil_texture: SoilTexture
  rfg_pct: float (5..85)
  vegetation_type: "Forest" | "Range" | "Chaparral"
  burn_severity: "High" | "Moderate" | "Low" | "Unburned"
  user_shrub_pct: float (optional)
  user_grass_pct: float (optional)
  user_bare_pct: float (optional)
```

### POST /ermit/GET/slope/{spatial_severity}

`spatial_severity` is one of: `hhh`, `lhh`, `hlh`, `hhl`, `llh`, `lhl`, `hll`, `lll`, `uuu`.

Returns the generated slope file (text).

### POST /ermit/GET/soil/{spatial_severity}/{k}

- `spatial_severity` as above
- `k` is a soil parameter index `0..4`

Returns the generated soil file (text).

### POST /ermit/GET/management/{spatial_severity}

Returns the selected management file (text).

### POST /ermit/GET/pre_fire_covers

Returns the derived pre-fire vegetation cover percentages based on vegetation type (or user overrides).

### POST /ermit/RUN/wepp

Runs ERMiT and returns JSON:

```
{
  "summary": { ... },
  "ebe_events": { ... },
  "selected_dates": ["m/d/yyyy", ...],
  "sed_results": [ ... ],
  "probabilities": { ... }
}
```

`summary` is the parsed WEPP output with annual aggregates. `sed_results` is sorted by sediment delivery.

## Logger

### POST /logger/GET/abbreviated_stats/{model}/{year}

Returns:
```
{"total_runs": 123, "unique_ips": 45}
```

Log files are stored under `api/logs/<year>/<model>.log`.

## Notes on file generation

- WEPP run files and outputs are stored under `/dev/shm/<model>/`.
- Slope/soil/management outputs are cached by a deterministic SHA-256 hash of the input models.
- Hashes are stable across interpreter restarts.
