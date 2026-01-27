# FuME API Spec Plan

## Purpose
- Implement a FastAPI-backed FuME runner that mirrors legacy behavior and output structure while following existing router patterns in `api/ermit.py`, `api/wepproad.py`, and `api/disturbed.py` (`/workdir/fswepp2/api/ermit.py`, `/workdir/fswepp2/api/wepproad.py`, `/workdir/fswepp2/api/disturbed.py`).
- Orchestrate multiple Disturbed WEPP + WEPP:Road runs and return structured results that match legacy summary tables, narrative calculations, and detail tables (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).

## Legacy References (Source of Truth)
- Input UI: `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`.
- Runner + calculations: `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`.
- Unit conversions and equation diagrams: `/workdir/fswepp-docker/var/www/fswepp/docs/fume/equations.html`.
- FuME documentation and scenario assumptions: `/workdir/fswepp-docker/var/www/fswepp/docs/fume/WEPP_FuME.pdf`.

## Inputs, Defaults, and Validation (Legacy)

### Climate
- `Climate` (climate parameter file basename) is selected from the climate list built by `GetClimates($user_ID)` (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
- `climyears` is a hidden input with default `50` years (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
- `years2sim = climyears`, capped to `100` years for Disturbed WEPP runs (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- Climate station metadata is read from the `.par` file via `GetStationName` and `GetParSummary` (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).

### Soil Texture
- `SoilType` options: `clay`, `silt`, `sand`, `loam` (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
- Server-side validation rejects anything outside those four values (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).

### Hillslope Geometry
- Total hillslope length (`totall`, ft): min `1.1`, default `200`, max `1500` (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
- Buffer length (`buffl`, ft): min `1`, default `50`, max `1000` (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
- Client-side rule: `buffer_length < total_length`; if violated, buffer is coerced to `total_length - 0.1` and never below `buff_l_min` (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
- Treated hillslope length is derived: `hilll = totall - buffl` and shown as a disabled field (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
- Slope inputs (%):
  - `ofe1_top_slope` default `0`, min `0.5`, max `90` (client checks in `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
  - `ofe1_mid_slope` default `30`, min `0.5`, max `90` (client checks in `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
  - `ofe2_bot_slope` default `15`, min `0.5`, max `90` (client checks in `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
- Server-side validation allows slope values up to `1000%` (likely to guard WEPP input), which is wider than the UI constraints (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- `ofe2_mid_slope` is set equal to `ofe1_mid_slope` in the runner (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).

### Disturbance Return Periods (years)
- Wildfire (`wildfire_cycle`): min `1`, default `40`, max `400` (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
- Prescribed fire (`rx_fire_cycle`): min `1`, default `20`, max `200` (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
- Thinning (`thinning_cycle`): min `1`, default `20`, max `200` (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).

### Road Density
- `road_density` in mi/mi^2: min `0`, default `4`, max `20` (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
- Road runs are skipped when `road_density < 0.001` or `road_density == 0` (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- API contract is metric-only; convert legacy mi/mi^2 to km/km^2 at the UI boundary (`/workdir/fswepp2/docs/ui-fswepp2-spec.md`, `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).

### Units
- `units` is read by the runner, but the legacy input screen does not include a units field (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`, `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- If `units` is not `m` or `ft`, the runner defaults to `ft` and uses acres (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- Output summaries are presented in ton/mi^2 regardless of input units (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`, `/workdir/fswepp-docker/var/www/fswepp/docs/fume/equations.html`).
- API contract is SI-only; the frontend converts SI outputs to legacy display units like ton/mi^2 (`/workdir/fswepp2/docs/ui-fswepp2-spec.md`).

### Additional Inputs Read by the Runner
- `ofe_area` is read from CGI parameters but is not present in the FuME UI (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`, `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).

## Derived Parameters and Conversion Logic
- OFE lengths: `ofe1_length = total_length - buffer_length`, `ofe2_length = buffer_length` (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- OFE rock fragment % is fixed at `20` for both elements (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- Unit conversions for WEPP input when `units=ft`:
  - `ofe1_length /= 3.28084`, `ofe2_length /= 3.28` (ft -> m).
  - `ofe_area /= 2.47` (ac -> ha).
  - `ofe_width = ofe_area * 10000 / (ofe1_length + ofe2_length)` (m) (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- API decision: use the Disturbed WEPP default width (90.0 m) for FuME and derive `ofe_area_ha = width_m * slope_length_m / 10000`, then compute `ofe_width` as in legacy (`/workdir/fswepp2/api/disturbed.py`, `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- `slope_length = ofe1_length + ofe2_length` (meters) is used in sediment yield conversions (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- Gradient warning: if any slope > 50%, show a mass failure warning (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).

## Scenario Run Matrix

### Disturbed WEPP Runs (9 scenarios)
Runs and parameterization are defined in the runner arrays (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`) and described in the FuME PDF (`/workdir/fswepp-docker/var/www/fswepp/docs/fume/WEPP_FuME.pdf`).

Treatments mapping (runner):
- `tree20` -> 20-year old trees
- `tree5` -> 5-year old trees
- `low` -> low severity fire
- `high` -> high severity fire
(`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`)

| Index | Label | Upper Treatment | Lower Treatment | Upper Cover % | Lower Cover % | Used In Summary? |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Undisturbed forest | tree20 | tree20 | 100 | 100 | Yes |
| 1 | Thinned forest | tree5 | tree20 | 85 | 100 | Yes |
| 2 | Prescribed burn | low | tree20 | 85 | 100 | Yes |
| 3 | Wildfire | high | high | 30 | 40 | Yes |
| 4 | Lower thinning | tree5 | tree20 | 95 | 100 | No (detail/alt) |
| 5 | Higher Rx fire | low | low | 75 | 85 | No (detail/alt) |
| 6 | Lower Rx fire | low | tree20 | 90 | 100 | No (detail/alt) |
| 7 | Moderate wildfire | low | low | 50 | 60 | No (detail/alt) |
| 8 | Low wildfire | low | low | 70 | 80 | No (detail/alt) |

Sources: `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl` (arrays `@runheadd`, `@intreat1`, `@intreat2`, `@inofe1_pcover`, `@inofe2_pcover`) and narrative about additional runs in `/workdir/fswepp-docker/var/www/fswepp/docs/fume/WEPP_FuME.pdf`.

### WEPP:Road Runs (3 scenarios)
Configured in the runner (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`) and summarized in the equations doc (`/workdir/fswepp-docker/var/www/fswepp/docs/fume/equations.html`).

Defaults/assumptions used in the runner:
- `URL` road length = `300 ft`.
- `URW` road width = `13 ft`.
- `UBR` rock fragment = `20%`.
- `URS` road gradient = `ofe1_mid_slope / 10`.
- `UBL` buffer length = user buffer length.
- `UBS` buffer slope = `ofe2_bot_slope`.
- `UFS` fill slope = `2 * ofe1_mid_slope`.
- `UFL` fill length = `URW` (road width).
(`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`)

Scenario definitions:
- No traffic: `design=inveg`, `surface=native`, `traffic=none`.
- Low traffic: `design=inveg`, `surface=native`, `traffic=low`.
- High traffic: `design=outrut`, `surface=graveled`, `traffic=high`.
(`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`)

Note: The PDF states fill length is 30 ft and buffer slopes are half hillside steepness, but the implementation will follow the runner values (`UFL = URW`, `UBS = ofe2_bot_slope`) (`/workdir/fswepp-docker/var/www/fswepp/docs/fume/WEPP_FuME.pdf`, `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).

## Output Schema and Formulas
- Legacy formulas yield ton/mi^2 outputs; API should convert these to SI (e.g., kg/m^2) and leave unit conversion to the UI (`/workdir/fswepp2/docs/ui-fswepp2-spec.md`, `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).

### Disturbed WEPP Run Outputs
- WEPP outputs are parsed for:
  - `syr` (area of net soil loss section).
  - `syp` (off-site effects section).
  - `simyears`, precipitation/runoff stats.
  (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`)
- Annual sediment yield conversion (legacy):
  - `asypa = syp * 10 / slope_length` (kg/m width -> t/ha/y) (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
  - If `units=ft`, `asypa *= 0.445` to t/ac (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
  - Summary output uses `out_asypa * 640` -> ton/mi^2/y (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
  - Equation diagrams confirm conversion to ton/mi^2 (`/workdir/fswepp-docker/var/www/fswepp/docs/fume/equations.html`).

### WEPP:Road Run Outputs
- WEPP:Road parsing:
  - `syr` and `syp` extracted from WEPP output and converted to per-road values:
    - `syra = syr * effective_road_length * road_width`.
    - `sypa = syp * road_width`.
  - If `units=ft`, `syra` and `sypa` are converted to lb via `* 2.2046`.
  (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`)
- Road density scaling:
  - Road yield: `z_syraf = syra * 0.0088 * road_density`.
  - Buffer yield: `z_sypaf = sypa * 0.0088 * road_density`.
  (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`)
- The equations doc shows the same dimensional flow to ton/mi^2/y using road width, effective road length, and road density (`/workdir/fswepp-docker/var/www/fswepp/docs/fume/equations.html`).

### Summary Table (Legacy Output)
The main output summary table contains rows 1-6 with the following logic (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`):
- Row 1: Undisturbed forest -> `average_annual = undisturbed` (run 0).
- Row 2: Wildfire -> `year_of_disturbance = wildraw`, `average_annual = wildraw / wildfire_cycle` (run 3).
- Row 3: Prescribed fire -> `year_of_disturbance = presraw`, `average_annual = presraw / rx_fire_cycle` (run 2).
- Row 4: Thinning -> `year_of_disturbance = thinraw`, `average_annual = thinraw / thinning_cycle` (run 1).
- Row 5: Low access roads -> `min/max` from no/low traffic road & buffer outputs (`no_road_min/no_road_max`).
- Row 6: High access roads -> `min/max` from low/high traffic road & buffer outputs (`tr_road_min/tr_road_max`).

### Narrative/Analysis Calculations
The narrative builds structured values used to describe background and treatment effects (all in ton/mi^2/y) (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`):
- `undiwild = undisturbed + wildfire`.
- `notbackground = undisturbed + wildfire` (same as `undiwild`).
- `no_road_low/high = notbackground + no_road_min/max`.
- `tr_road_low/high = thinrx + tr_road_min/max`.
- `thinbackno = undisturbed + thinning`.
- `presbackno = undisturbed + prescribe`.
- `thinrxno = undisturbed + thinning + prescribe`.
- Percent-above-background fields (`thin_over_back`, `rx_over_back`, `rx_low_over_back`, etc.) derived from these totals.
- Alternative wildfire severity uses the moderate wildfire run (`run 7`) via `wildmodraw_over_wildfire_cycle = wildmodraw / wildfire_cycle`.
 - Legacy quirk: `$tr_thin_low`/`$tr_thin_high` are computed using `$thin`, which is undefined in `fume2.pl`. In Perl this evaluates to `0`, so the values collapse to `tr_road_min`/`tr_road_max` (see `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).

### Details Table
- A "Details of Inputs and Outputs" section is printed using `tempFile` and includes per-run inputs and results for all 9 disturbed runs and 3 road runs (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- A "Mean annual predicted values" table exists in code but is bypassed via `goto skipjunk` and is not currently rendered (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).

## Proposed API Shape (Aligned with Existing Patterns)

### Core Pydantic Models
- `FumeState` (analogous to `*State` classes in `/workdir/fswepp2/api/ermit.py`, `/workdir/fswepp2/api/wepproad.py`, `/workdir/fswepp2/api/disturbed.py`):
  - `climate: ClimatePars` (reuse `api/rockclim.py` model).
  - `fume_pars: FumePars`.
  - `wepp_version: str = "wepp2010"`.
- `FumePars` (SI-only; frontend converts for display per `/workdir/fswepp2/docs/ui-fswepp2-spec.md`):
  - `soil_texture` (reuse `SoilTexture`).
  - `total_length_m` and `buffer_length_m`.
  - `top_slope_pct`, `mid_slope_pct`, `bottom_slope_pct`.
  - `wildfire_cycle_years`, `rx_fire_cycle_years`, `thinning_cycle_years`.
  - `road_density_km_per_km2` (convert legacy mi/mi^2 in the UI).
- Validators should mirror the legacy ranges in `fume.pl` and `fume2.pl` (note the UI vs server max mismatch for slopes and lengths).

### Scenario IDs
- Disturbed scenarios: `undisturbed`, `thinned`, `prescribed_fire`, `wildfire`, `lower_thinning`, `higher_rx_fire`, `lower_rx_fire`, `moderate_wildfire`, `low_wildfire`.
- Road scenarios: `no_traffic`, `low_traffic`, `high_traffic`.
- Map IDs to the legacy arrays in `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`.

### Primary Run Endpoint
`POST /api/fume/RUN/wepp`
- Request: `FumeState`.
- Response (structured, UI-friendly):
  - `inputs` (canonical metric values).
  - `disturbed_runs[]` (per scenario: inputs, syp, slope_length_m, sediment_yield_kg_m2_yr).
  - `wepproad_runs[]` (per scenario: inputs, sediment_yield_road_kg_m2_yr, sediment_yield_buffer_kg_m2_yr).
  - `summary_table[]` (rows 1-6 with min/max ranges in SI; UI converts to legacy ton/mi^2).
  - `analysis` (structured fields corresponding to narrative calculations).
  - `warnings` (e.g., slope > 50%).
  - `units` (SI-only labels).

### File Endpoints (Pattern Consistency)
Follow `GET/soil`, `GET/management`, `GET/slope`, `GET/run_file`, `GET/wepp_output` pattern used in other modules, but include scenario selectors:
- `POST /api/fume/GET/disturbed/soil` `{ scenario_id }`
- `POST /api/fume/GET/disturbed/management` `{ scenario_id }`
- `POST /api/fume/GET/disturbed/slope` `{ scenario_id }`
- `POST /api/fume/GET/disturbed/run_file` `{ scenario_id }`
- `POST /api/fume/GET/disturbed/wepp_output` `{ scenario_id }`
- `POST /api/fume/GET/wepproad/run_file` `{ road_scenario_id }`
- `POST /api/fume/GET/wepproad/wepp_output` `{ road_scenario_id }`

Implementation should follow the hash-based cache + tmpfs pattern used in `/workdir/fswepp2/api/ermit.py`, `/workdir/fswepp2/api/wepproad.py`, and `/workdir/fswepp2/api/disturbed.py`.

## Testing Plan
- Unit tests:
  - Input validation and buffer < total length rule (UI behavior from `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
  - Disturbed and road scenario mapping arrays (runner constants from `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
  - Unit conversions and summary-table formulas vs `equations.html` and `fume2.pl`.
  - `years2sim` capped at 100 for FuME runs (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- Integration tests:
  - Execute `/api/fume/RUN/wepp` and compare summary table results to legacy HTML outputs for a fixed climate/soil/topography (use the same climate in `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- Regression tests:
  - Verify road-density=0 skips WEPP:Road runs but still returns placeholders consistent with legacy (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).

## Resolved Decisions
- Derive `ofe_area` from width and slope length (inverse of the legacy `ofe_width` formula), rather than leaving it unset (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- Do not expose width in the FuME API/UI; use the Disturbed WEPP default width (90.0 m) (`/workdir/fswepp2/api/disturbed.py`).
- Follow the runner values for WEPP:Road defaults (`UFL = URW`, `UBS = ofe2_bot_slope`) over PDF wording (`/workdir/fswepp-docker/var/www/fswepp/docs/fume/WEPP_FuME.pdf`, `/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- Cap `years2sim` at `100` for FuME runs (align with `fume2.pl` behavior) (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
- API is metric-only per UI spec; UI converts to legacy display units like ton/mi^2 (`/workdir/fswepp2/docs/ui-fswepp2-spec.md`).
- Convert legacy road density inputs (mi/mi^2) to metric for API use (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume.pl`).
- Keep only the summary + narrative outputs; do not expose the skipped mean-annual table (`/workdir/fswepp-docker/var/www/cgi-bin/fswepp/fume/fume2.pl`).
