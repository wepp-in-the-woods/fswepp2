# FSWEPP2 API Deviations From Legacy FSWEPP CGI

This document lists intentional or current deviations between the FastAPI backend in
`/workdir/fswepp2/api` and the legacy FSWEPP Perl CGI implementation in
`/workdir/fswepp-docker/var/www/cgi-bin/fswepp`.

Scope: functional parity, not byte-for-byte output alignment. The goal is to
normalize around API-native parameters for new frontends.

## Cross-cutting differences

- **API-first responses**: The API returns JSON or raw text files, not HTML pages.
- **Routing**: All endpoints are mounted under `/api` (except `/health`). Many
  routes use `POST` even if the path includes `GET`.
- **Units**: API models assume meters for lengths and percent for slopes. Legacy
  CGI supports both feet and meters and does explicit conversion.
- **CLIGEN default**: API defaults to `cligen_version = "5.3.2"`; legacy CGI uses
  CLIGEN 4.3 by default. This can change outputs even with identical inputs.
- **Database selection**: API supports multiple climate databases
  (`legacy`, `2015`, `au`, `ghcn`) via `ClimatePars.database`. Legacy CGI uses the
  local `.par` files only.
- **Error responses**: API global exception handler returns stack traces only
  when `FSWEPP_DEBUG` is enabled; otherwise it returns a generic 500 payload.
  Legacy CGI typically returns generic HTML errors (with optional debug behavior).
- **Hash-based caching**: API names cached files using a deterministic SHA-256
  hash of request models. Hashes are stable across interpreter restarts.
- **WEPP filename length limits**: The WEPP 2010 binary truncates long file
  paths/names (Fortran input handling). The API mitigates this by using a short
  hash (12 chars) for generated filenames and by copying climate `.cli` files
  into the tool-specific TMP directory before writing `.run` files.
- **User identification**: API sets a `user_id` cookie in middleware after the
  request completes. The cookie is currently unused by RockClim endpoints.

## Parity runs (legacy baselines)

Legacy capture runs live under `/workdir/fswepp2/parity-runs/`. Each model has a
`cases.yaml` file with the real legacy curl payloads (copied from browser form
submissions) plus optional API requests for comparison. We are currently
capturing legacy-only runs.

- WEPP:Road: `/workdir/fswepp2/parity-runs/wepproad/cases.yaml`
- Disturbed WEPP: `/workdir/fswepp2/parity-runs/disturbed/cases.yaml`
- ERMiT: `/workdir/fswepp2/parity-runs/ermit/cases.yaml`

Payloads referenced in those cases are stored in:

- `/workdir/fswepp2/parity-runs/wepproad/curl-payloads.md`
- `/workdir/fswepp2/parity-runs/disturbed/curl-payloads.md`
- `/workdir/fswepp2/parity-runs/ermit/curl-payloads.md`

Each run is saved as:

```
/workdir/fswepp2/parity-runs/<model>/<run_id>/
```

and contains:

- `legacy/<curl_name>.response.body`
- `legacy/working/wepp-<pid>.*`
- `run.json` summary

Use `python /workdir/fswepp2/scripts/collect_representative_runs.py --cases <cases.yaml> --out /workdir/fswepp2/parity-runs --skip-api`
for legacy-only capture.

## Rock:Clime (RockClim)

- **Station sources**: API uses the bundled CLIGEN station manager and exposes stations
  by bbox, state, or proximity. Legacy CGI relies on local `.par` files and
  provides a file-browser style interface.
- **User-defined parameters**: FSWEPP2 UI stores user-defined climate parameter
  modifications client-side in cookies. Legacy CGI stores personal climates as
  `.par` files in `../working`.
- **Response format**: API returns JSON metadata and raw `.par`/`.cli` content.
  Legacy CGI returns HTML pages and file downloads.

### Parameter mapping (Rock:Clime)

Rock:Clime in legacy CGI is mostly a UI for file selection/management; the API
exposes a parameterized climate generation service. Use the API fields below
directly in the new frontend.

| API field | Legacy CGI input | Legacy validation range | Notes / deviations |
| --- | --- | --- | --- |
| `database` | none | n/a | API supports multiple station databases; legacy uses local `.par` files only. |
| `state_code` | UI selection | n/a | Legacy uses station lists by region; API accepts explicit state code. |
| `par_id` | station file path (`Climate`) | n/a | API uses station IDs; legacy uses file paths to `.par` files. |
| `input_years` | `years` / `climyears` | UI: 1–200 | API explicit; legacy passes years to CLIGEN. |
| `cligen_version` | fixed 4.3 | n/a | API default 5.3.2; legacy fixed 4.3. |
| `location` | UI map / lat-long | n/a | API requires explicit coordinates for prism or nearest station queries. |
| `use_prism` | UI toggle | n/a | API boolean; legacy uses separate flow for PRISM-adjusted climates. |
| `user_defined_par_mod.*` | custom `.par` file edits | n/a | UI stores JSON in cookies; legacy stores `.par` files. |

## WEPP:Road

- **Supported surfaces**: API accepts `gravel` and `paved` only. Legacy CGI
  accepts `graveled`, `paved`, and `native`.
- **Units**: API expects meters only and does not convert from feet.
- **Input validation**: Legacy CGI enforces range checks (e.g., road length,
  slopes, years). API currently does not enforce these ranges.
- **Batch mode**: Legacy has WEPP:Road batch workflows. API does not.
- **Parity note (2026-01-26)**: For the representative WEPP:Road runs under
  `/workdir/fswepp2/parity-runs/wepproad`, slope and soil files match legacy
  output (excluding the legacy HTML-extraction artifact line at the top of
  `*.sol`). Run files differ by design (`97.3`/`.in`/`.out` in legacy vs
  `m`/`.run`/`.dat` in API). Annual averages in `*.out` show small numeric
  differences; these are acceptable and attributed to PRISM monthly normals
  drift (legacy uses an older 30-year normal dataset).
- **Filename handling**: WEPP:Road writes `.run` files that reference short
  local filenames (e.g., `wr_<hash>.cli`) to avoid WEPP truncation. Climate
  outputs are copied into `/dev/shm/wepproad` before execution.

### Parameter mapping (WEPP:Road)

| API field | Legacy CGI input | Legacy validation range | Notes / deviations |
| --- | --- | --- | --- |
| `wepproad_pars.soil_texture` | `SoilType` | allowlist | Same logical values (`clay`, `silt`, `sand`, `loam`). |
| `wepproad_pars.rfg_pct` | `Rock` | not validated | Same meaning; API expects percent as float. |
| `wepproad_pars.road.slope_pct` | `RS` | 0.1–40% (metric UI/server) | API expects percent. Legacy validates range. |
| `wepproad_pars.road.length_m` | `RL` | 1–300 m (metric UI/server) | API expects meters only; legacy accepts feet or meters. |
| `wepproad_pars.road.width_m` | `RW` | 0.3–100 m (metric UI/server) | API expects meters only. |
| `wepproad_pars.road.surface` | `surface` | allowlist | API accepts `gravel`/`paved`; legacy accepts `graveled`/`paved`/`native`. |
| `wepproad_pars.road.design` | `SlopeType` | allowlist | API uses `inveg`, `outunrut`, `outrut`, `inbare`. Same logical values. |
| `wepproad_pars.road.traffic` | `traffic` | allowlist | API uses `high`/`low`/`none`; same as legacy. |
| `wepproad_pars.fill.slope_pct` | `FS` | 0.1–150% (metric UI/server) | API expects percent. |
| `wepproad_pars.fill.length_m` | `FL` | 0.3–100 m (metric UI/server) | API expects meters only. |
| `wepproad_pars.buffer.slope_pct` | `BS` | 0.1–100% (metric UI/server) | API expects percent. |
| `wepproad_pars.buffer.length_m` | `BL` | 0.3–300 m (metric UI/server) | API expects meters only. |
| `climate.par_id` | `Climate` | allowlist | Legacy uses path to `.par` file; API expects station ID. |
| `climate.input_years` | `years` | 1–200 | API explicit; legacy validates range. |
| `wepp_version` | `weppversion` | allowlist | API accepts a string; should be allowlisted in hardening pass. |

## Disturbed WEPP

- **Landuse values**: API uses `OldForest`, `YoungForest`, `Shrub`, `Bunchgrass`,
  `Sod`, `LowFire`, `HighFire`, `Skid`. Legacy CGI accepts abbreviated values
  (`tree20`, `tree5`, `shrub`, etc.) and maps them internally.
- **Units**: API expects meters only; legacy supports feet or meters.
- **Response format**: API returns JSON and raw files; legacy CGI returns HTML.
- **Filename handling**: Disturbed WEPP uses short hashed filenames and copies
  climate `.cli` files into `/dev/shm/disturbed` before execution to avoid
  WEPP truncation of long file paths.
- **Return periods/probabilities**: FSWEPP2 derives return periods and first-year
  occurrence probabilities from the event-by-event (EBE) file using annual maxima
  (Weibull annual-maxima method, no Gringorten correction). Legacy CGI derives
  return periods from the annual detailed `.out` summaries instead.

### Parameter mapping (Disturbed WEPP)

| API field | Legacy CGI input | Legacy validation range | Notes / deviations |
| --- | --- | --- | --- |
| `disturbedwepp_pars.soil_texture` | `SoilType` | allowlist | Same logical values. |
| `disturbedwepp_pars.upper_ofe.landuse` | `UpSlopeType` | allowlist | Legacy values like `tree20`, `tree5`, etc. map to API enums. |
| `disturbedwepp_pars.lower_ofe.landuse` | `LowSlopeType` | allowlist | Same mapping as above. |
| `disturbedwepp_pars.upper_ofe.slope_point1_pct` | `ofe1_top_slope` | UI: 0–100%; server: 0–1000% | Percent. |
| `disturbedwepp_pars.upper_ofe.slope_point2_pct` | `ofe1_mid_slope` | UI: 0–100%; server: 0–1000% | Percent. |
| `disturbedwepp_pars.lower_ofe.slope_point1_pct` | `ofe2_top_slope` | UI: 0–100%; server: 0–1000% | Percent. |
| `disturbedwepp_pars.lower_ofe.slope_point2_pct` | `ofe2_bot_slope` | UI: 0–100%; server: 0–1000% | Percent. |
| `disturbedwepp_pars.upper_ofe.length_m` | `ofe1_length` | UI: 0.5–400 m; server: 0–3000 m | API expects meters only; legacy supports feet. |
| `disturbedwepp_pars.lower_ofe.length_m` | `ofe2_length` | UI: 0.5–400 m; server: 0–3000 m | API expects meters only. |
| `disturbedwepp_pars.upper_ofe.cover_pct` | `ofe1_pcover` | UI: 0–150%; server: not validated | Percent. |
| `disturbedwepp_pars.lower_ofe.cover_pct` | `ofe2_pcover` | UI: 0–150%; server: not validated | Percent. |
| `disturbedwepp_pars.upper_ofe.rfg_pct` | `ofe1_rock` | UI: 0–75%; server: not validated | Percent. |
| `disturbedwepp_pars.lower_ofe.rfg_pct` | `ofe2_rock` | UI: 0–75%; server: not validated | Percent. |
| `disturbedwepp_pars.width_m` | derived from `ofe_area` | n/a | Legacy derives width from area and lengths; API accepts width directly. |
| `climate.par_id` | `Climate` | allowlist | Legacy uses path to `.par` file; API expects station ID. |
| `climate.input_years` | `climyears` / `years2sim` | UI: 1–200 | API explicit; legacy validates in UI. |
| `wepp_version` | `weppversion` | allowlist | API accepts a string; should be allowlisted in hardening pass. |

## ERMiT

- **Burn severity values**: API uses `High`, `Moderate`, `Low`, `Unburned`.
  Legacy CGI uses `h`, `m`, `l`, `u` and maps to labels.
- **Vegetation values**: API uses `Forest`, `Range`, `Chaparral`.
- **rfg_pct handling**: API validates rfg_pct between 5 and 85 (error on
  out-of-range). Legacy CGI clamps into that range.
- **Units**: API expects meters only; legacy supports feet or meters.
- **Response format**: API returns JSON structures (summary, selected dates,
  sediment results, probabilities). Legacy CGI returns HTML and generated files.

### Parameter mapping (ERMiT)

| API field | Legacy CGI input | Legacy validation range | Notes / deviations |
| --- | --- | --- | --- |
| `ermit_pars.top_slope_pct` | `top_slope` | UI: 0–100% | Percent. |
| `ermit_pars.middle_slope_pct` | `avg_slope` | UI: 0–100% | Percent. |
| `ermit_pars.bottom_slope_pct` | `toe_slope` | UI: 0–100% | Percent. |
| `ermit_pars.length_m` | `length` | UI: 0–300 m | API expects meters only; legacy supports feet. |
| `ermit_pars.soil_texture` | `SoilType` | allowlist | Same logical values. |
| `ermit_pars.rfg_pct` | `rfg` | UI: 0–50%; server: clamps 5–85 | API validates 5–85 (error); legacy clamps. |
| `ermit_pars.vegetation_type` | `vegetation` | allowlist | Legacy values `forest`, `range`, `chap` map to API enums. |
| `ermit_pars.burn_severity` | `severity` | allowlist | Legacy uses `h/m/l/u`; API uses `High/Moderate/Low/Unburned`. |
| `ermit_pars.user_shrub_pct` | `pct_shrub` | UI: 0–100% | Optional; API uses for non-forest vegetation. |
| `ermit_pars.user_grass_pct` | `pct_grass` | UI: 0–100% | Optional. |
| `ermit_pars.user_bare_pct` | `pct_bare` | UI: 0–100% | Optional. |
| `climate.par_id` | `Climate` | allowlist | Legacy uses path to `.par` file; API expects station ID. |
| `climate.input_years` | derived from `climyears` | UI: 1–200 | API explicit. |
| `climate.cligen_version` | fixed 4.3 | n/a | API default 5.3.2; legacy fixed 4.3. |
| `wepp_version` | `weppversion` | allowlist | API accepts a string; should be allowlisted in hardening pass. |

### Legacy ERMiT gnuplot specification

Legacy CGI generates a sediment delivery exceedance plot using gnuplot. The
specification below is from `var/www/cgi-bin/fswepp/ermit/erm.pl` and can be
used to reproduce equivalent plots if needed in the new frontend.

**Data file format (`*.gnudata`)**
- Columns: `sediment_delivery`, `prob_year1`, `prob_year2`, `prob_year3`, `prob_year4`, `prob_year5`
- Values are cumulative probabilities (percent) computed from sorted
  sediment deliveries.
- Sediment delivery units are derived via:
  - metric: `sedu = sedval / (hillslope_length_m / 10)`
  - english: `sedu = sedval / (hillslope_length_m / 4.45)`
- `alt_sedunits` mapping:
  - metric: `t / ha`
  - english: `ton / ac`

**Plot specification (untreated, burned)**
```
set terminal pngcairo size 800,600 enhanced font 'sans,10' fontscale 1.1
set output '<graph.png>'
set title 'Sediment Delivery Exceedance Probability for untreated <climate_name>'
set xlabel 'Sediment Delivery (<alt_sedunits>)'
set ylabel 'Probability (%)'
set noautoscale y
set yrange [0:100]
set key top
set grid ytics
set grid xtics
set timestamp "<mm-dd-YYYY -- soil; rfg% rock; top, avg, toe slope; length units; severity [run_id]>"
plot [] [1:] \
     '<datafile>' using 1:2 t '1st year' with lines linewidth 3,\
     ''           using 1:3 t '2nd year' with lines linewidth 3,\
     ''           using 1:4 t '3rd year' with lines linewidth 3,\
     ''           using 1:5 t '4th year' with lines linewidth 3,\
     ''           using 1:6 t '5th year' with lines linewidth 3
```

**Plot specification (unburned)**
```
set terminal pngcairo size 800,600 enhanced font 'sans,10' fontscale 1.1
set output '<graph.png>'
set title 'Sediment Delivery Exceedance Probability for unburned <climate_name>'
set xlabel 'Sediment Delivery (<alt_sedunits>)'
set ylabel 'Probability (%)'
set noautoscale y
set yrange [0:100]
set key top
set grid ytics
set grid xtics
set timestamp "<mm-dd-YYYY -- soil; rfg% rock; top, avg, toe slope; length units; severity [run_id]>"
plot [] [1:] \
     '<datafile>' using 1:2 t '1st year' with lines linewidth 3
```

**Timestamp string (exact legacy format)**

Burned (treated as soil burn severity):
```
set timestamp "%m-%d-%Y -- <soil_texture>; <rfg>% rock; <top>%, <avg>%, <toe>% slope; <length> <units>; <severity> soil burn severity [<run_id>]"
```

Unburned:
```
set timestamp "%m-%d-%Y -- <soil_texture>; <rfg>% rock; <top>%, <avg>%, <toe>% slope; <length> <units>; <severity> [<run_id>]"
```

Notes:
- `severity` uses legacy label strings: `high`, `moderate`, `low`, `unburned`.
- `units` is `m` or `ft` as selected in the legacy UI.

**Appendix: severity mapping and sediment unit conversion**

Legacy severity code mapping (`severityclass_x`):
- `h` -> `high`
- `m` -> `moderate`
- `l` -> `low`
- `u` -> `unburned` (default)

Sediment delivery unit conversion (`sedu`):
- If `units = m`: `sedu = sedval / (hillslope_length_m / 10)` -> `t / ha`
- If `units = ft`: `sedu = sedval / (hillslope_length_m / 4.45)` -> `ton / ac`

## Logger

- **Storage**: API writes binary logs under `api/logs/<year>/<model>.log`.
  Legacy CGI uses text logs in `../working` directories.
- **Access**: API exposes only a minimal abbreviated stats endpoint.

## Not implemented in API

- Legacy HTML workflows, download pages, and documentation pages
- Legacy batch utilities (WEPP:Road batch, web UIs for WEPP tools)
