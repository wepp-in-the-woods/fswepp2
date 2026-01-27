# FuME UI Spec Plan

## Purpose
- Define the FuME UI that matches established FSWEPP2 UX, interaction patterns, styling, and coding conventions.
- Keep the UI consistent with `docs/ui-fswepp2-spec.md` and the tool implementations in `ui/public/js/tools`.
- Drive the UI strictly from the FuME API contract in `api/fume.py` and the FuME API spec in `docs/fume-api-spec-plan.md`.

## References (Patterns and Contracts)
- Global UX, units, state, and component conventions: `docs/ui-fswepp2-spec.md`.
- FuME API schema and outputs: `api/fume.py`.
- FuME behavior and legacy defaults: `docs/fume-api-spec-plan.md`.
- Existing tool implementations for interaction and layout patterns:
  - `ui/public/js/tools/wepproad.js`
  - `ui/public/js/tools/disturbed.js`
  - `ui/public/js/tools/ermit.js`
- Shared UI components and styling utilities:
  - `ui/public/js/components/*`
  - `ui/public/app.css` (generated Tailwind; do not hand-edit).

## Page Structure (Match Existing Tool Pages)
- Use the standard layout from `ui/src/server.ts` (header, unit toggle, RockClim control, tool root).
- Add a FuME page route and root mount:
  - `ui/src/server.ts`: add `/fswepp2/fume` and a nav link (same style as other tools).
  - `ui/public/js/app.js`: mount `mountFumeTool` into `#fume-root`.
- Structure:
  - Rock Climate Control (collapsible): reuse `rockclim-control.js` and `fswepp_climate` cookie.
  - FuME control panel (inputs + run button).
  - Results section (initially hidden, shown on successful run).

## State and Persistence
- Climate: read from cookie `fswepp_climate` using `readClimateState` (`ui/public/js/core/rockclim-state.js`).
- Units: use global unit toggle + Unitizer; API stays SI (`docs/ui-fswepp2-spec.md`).
- Tool state: localStorage key `fswepp_fume_state` (pattern from `ui/public/js/core/*-state.js`).
- URL sharing: allow `?config=<base64url>` overrides using `getConfigFromUrl` (`ui/public/js/utils/url.js`).

### Suggested `fume_state` shape
- `soil_texture`: "clay" | "silt" | "sand" | "loam".
- `total_length_m`, `buffer_length_m` (SI; defaults derived from legacy).
- `top_slope_pct`, `mid_slope_pct`, `bottom_slope_pct`.
- `wildfire_cycle_years`, `rx_fire_cycle_years`, `thinning_cycle_years`.
- `road_density_km_per_km2`.
- `simulation_years` (for ClimatePars.input_years; cap at 100).
- `wepp_version` (default "wepp2010").

## Control Panel Layout (Conform to Existing Sections)
Use the same section styling pattern as other tools:
- Section container: `rounded-lg border border-border bg-card p-6 space-y-4`.
- Headings: `text-base font-semibold`.

### Section 1: Soil & Road Context
- Soil Texture dropdown: reuse `createSoilProperties` style or a simpler select (`createSelectField`).
- Road Density input:
  - Label: "Road density".
  - Canonical SI: `km/km^2`.
  - UI shows user-preferred units via Unitizer (mi/mi^2 for English).
  - Extend Unitizer with a new `road-density` category that supports `km/km^2` (canonical) and `mi/mi^2` (English).
    - Conversion: `1 mi/mi^2 = 1 / 1.609344 km/km^2`.
  - Use `data-unitizer-category="road-density"` and `data-unitizer-unit="km/km^2"` per Unitizer conventions.

### Section 2: Hillslope Geometry
- Total hillslope length (canonical m, display via Unitizer).
- Buffer length (canonical m, display via Unitizer).
- Treated hillslope length (read-only derived = total - buffer).
  - Display as non-editable field; update live when total/buffer change.
- Slopes (%): top, middle, bottom.
  - These are plain percent inputs; no unit conversion.

### Section 3: Disturbance Return Periods
- Wildfire cycle (years).
- Prescribed fire cycle (years).
- Thinning cycle (years).

### Section 4: Simulation Options
- Simulation years (maps to ClimatePars.input_years, capped at 100 in API).
- Optional WEPP version select (follow `createSimulationOptions` pattern from `ui/public/js/components/simulation-options.js`).

### Run Button
- Use `createRunButton` for consistent states (idle/running/error/success).
- Include error `<details>` block consistent with `wepproad.js` / `disturbed.js`.

## Defaults (Align with Legacy, Stored as SI)
- Total length: 200 ft -> 60.96 m.
- Buffer length: 50 ft -> 15.24 m.
- Slopes: top 0%, middle 30%, bottom 15%.
- Cycles: wildfire 40 years, prescribed fire 20 years, thinning 20 years.
- Road density: 4 mi/mi^2 -> 2.4856 km/km^2.
- Simulation years: 50 (capped at 100).

Source mapping: `docs/fume-api-spec-plan.md` and `api/fume.py`.

## Validation and Interaction Rules
- Use the established "blur then input" validation pattern (`createFormField` + custom validators).
- Apply legacy UI ranges for inputs:
  - Total length: 1.1–1500 ft (0.33528–457.2 m).
  - Buffer length: 1–1000 ft (0.3048–304.8 m).
  - Slopes: 0.5–90%.
  - Road density: 0–20 mi/mi^2 (0–12.4274 km/km^2).
  - Cycles: wildfire 1–400, prescribed fire 1–200, thinning 1–200.
  - Simulation years: 1–100 (cap at 100).
- Enforce `buffer_length < total_length`:
  - When violated, coerce as legacy UI (`total - 0.1 ft`, not below min) and update the UI.
  - If the buffer hits its minimum, bump total to `buffer + 0.1 ft` to preserve separation.
- Show slope warning when any slope > 50%:
  - Use `createAlert({ variant: "warning" })` (`ui/public/js/components/alert.js`).
- Road density 0 or below threshold:
  - Still allow run; in results, show "Roads disabled" note and omit road rows/tables (legacy behavior).
- Re-render results on `unitizer:preferences-changed` to keep units in sync.

## Results Section
Results are hidden until a successful run (consistent with `wepproad.js` and `disturbed.js`).

### Summary Table
- Render `summary_table` from `api/fume.py`.
- Columns: Line, Source, Year of Disturbance, Return Period, Average Annual.
- Units:
  - Use SI in data (kg/m^2 or kg/m^2/yr).
  - Put units in column headers in parentheses; keep cells unitless.
  - Use Unitizer conversion at render time, matching `docs/ui-fswepp2-spec.md`.
- When roads are disabled, omit the road rows (lines 5–6) to match legacy output.

### Narrative Summary
- Render a textual narrative using `analysis` fields from the API.
- Keep structure aligned with legacy narrative order (background, thinning, prescribed fire, combined effects).
- Use short paragraphs; avoid HTML `<pre>`; format numeric values with Unitizer conversions.

### Detail Tables
- Disturbed WEPP runs table:
  - Columns: Scenario, Treatments, Covers, Slope Length, Sediment Yield.
  - Use `createDataTable` for pagination + CSV export (`ui/public/js/components/data-table.js`).
- WEPP:Road runs table:
  - Columns: Scenario, Design/Surface/Traffic, Road/Fill/Buffer inputs, Road & Buffer yields.
  - Use `createDataTable` only when roads are enabled; otherwise omit and show a short "Roads disabled" note.

### Model Files (Optional, Consistent with Other Tools)
- Provide collapsibles for Disturbed and WEPP:Road files following the pattern in `wepproad.js` and `disturbed.js`:
  - Use `createCollapsibleSection` + `createPreformattedBlock`.
  - Use download buttons that are disabled until content is loaded.
- For FuME, add a scenario selector per file type (disturbed vs road) to fetch the correct endpoint:
  - Disturbed: `/api/fume/GET/disturbed/*`
  - Road: `/api/fume/GET/wepproad/*`

## Unitizer Integration (Required)
- Use `data-unitizer-category` / `data-unitizer-unit` on numeric inputs.
- Store canonical values in `data-unitizer-canonical-value` (see `wepproad.js`).
- Add `data-unitizer-label` attributes for unit labels so Unitizer updates text.
- Re-render tables on `unitizer:preferences-changed` (pattern in `disturbed.js`).
- Extend Unitizer to support `road-density` with `km/km^2` and `mi/mi^2`, and regenerate `ui/public/js/unitizer_map.js`.

### Unitizer Extension Checklist (road-density)
1. **Backend registry**: add a `road-density` category in `/workdir/wepppy/wepppy/nodb/unitizer.py`.
   - Add converters:
     - `("km/km^2", "mi/mi^2")`: multiply by `1.609344`.
     - `("mi/mi^2", "km/km^2")`: multiply by `0.621371`.
   - Add precisions (suggest: 3 decimals for both units).
2. **Regenerate map**: run `/workdir/wepppy/wepppy/weppcloud/controllers_js/build_controllers_js.py` (or `unitizer_map_builder.py`) to rebuild `unitizer_map.js`.
3. **Copy map**: replace `/workdir/fswepp2/ui/public/js/unitizer_map.js` with the regenerated file.
4. **Smoke check**: verify `window.UnitizerClient` can convert `road-density` units and labels update on toggle.

## Coding Conventions (Match Existing Tools)
- Implement in `ui/public/js/tools/fume.js` as an ES module.
- Use DOM builder functions (`document.createElement`) and shared components (`createFormField`, `createRunButton`, `createCollapsibleSection`, `createDataTable`, `createAlert`).
- Use `apiPost` for all API calls (`ui/public/js/utils/api-client.js`).
- Keep UI state normalized in a dedicated `ui/public/js/core/fume-state.js` (pattern from `wepproad-state.js`).
- Avoid inline CSS; rely on Tailwind utility classes in `ui/public/app.css`.
- Keep tables and charts responsive; avoid fixed widths except where existing components already enforce them.

## Error Handling
- Use `createRunButton` error state and the shared `<details>` error block pattern.
- For HTTP status handling, show user-friendly messages consistent with other tools (`wepproad.js`, `disturbed.js`).
- Provide a short guidance string when climate is missing (e.g., "Select a climate station in Rock Climate Control").

## Testing Requirements
- Add unit tests for `fume-state` normalization and derived field behavior (buffer coercion, default conversions).
- Add UI-level tests mirroring existing tool tests in `ui/tests`:
  - Validate form inputs and unit conversions.
  - Run a mock API response and verify summary + detail tables render.
  - Ensure `unitizer:preferences-changed` updates results.

## Deliverables (UI Implementation Checklist)
- `ui/public/js/tools/fume.js` with input sections, run flow, results rendering.
- `ui/public/js/core/fume-state.js` for localStorage + URL overrides.
- `ui/src/server.ts` route + nav link for FuME.
- `ui/public/js/app.js` mounting hook.
- Tests for state + UI rendering in `ui/tests` and/or `ui/playwright-tests`.
