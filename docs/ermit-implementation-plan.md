# ERMiT Implementation Plan (FSWEPP2 UI)

> Scope: **UI only** (`ui/…`). Backend already exists in `api/ermit.py`.
> Goal: Match legacy ERMiT behavior per `docs/ui-fswepp2-spec.md` and `api/DEVIATIONS.md`.

---

## Phase Checklist (GitHub-style)

### Phase 0 — References + Defaults
- [x] Confirm ERMiT UI/results spec sections used: `docs/ui-fswepp2-spec.md` → “ERMiT Tool Specification” → “Results Display”.
- [x] Confirm gnuplot plot spec and deviations: `api/DEVIATIONS.md` → “Legacy ERMiT gnuplot specification”.
- [x] Lock in canonical default values (UI defaults):
  - [x] Soil texture: **clay loam** (`soil_texture: "clay"`)
  - [x] Rock fragment content: **20%** (`rfg_pct: 20`)
  - [x] Slope gradients: **top 0.001%**, **middle 50%**, **bottom 30%**
  - [x] Hillslope length: **300 ft** (store canonical metric in state)
  - [x] Vegetation: **Chaparral**
  - [x] Burn severity: **Low**
  - [x] Prefire community: **80% shrub**, **0% grass**, **20% bare**
- [x] Confirm scope: **UI only** (Hono app in `ui/`).

### Phase 1 — State + Bootstrapping
- [x] Add ERMiT state module: `ui/public/js/core/ermit-state.js`.
  - [x] Storage key: `fswepp_ermit_state`.
  - [x] Include URL override support via `getConfigFromUrl()` (keys aligned with other tools: `ermit_pars`, `ermit`, `ermit_state`, plus `simulation_years` + `wepp_version`).
  - [x] Normalize ranges consistent with API: slopes 0.001–100, length 0–300, rfg 5–85, cover 0–100, sum ≤ 100 for non‑forest.
  - [x] Store **canonical metric values** only.
- [x] Add ERMiT tool mount in `ui/public/js/app.js` (e.g., `mountErmitTool`).
- [x] Update ERMiT route in `ui/src/server.ts` to include tool root (e.g., `<section id="ermit-root" class="space-y-8"></section>`).

### Phase 2 — Control Panel UI (ordered groups)
- [x] **1) RockClime component**
  - [x] Reuse `mountRockClimControl` for climate selection and cookie hydration.
- [x] **2) Soil-properties component**
  - [x] Reuse `createSoilProperties` with ERMiT ranges (`rfgMin=5`, `rfgMax=85`).
- [x] **3) Vegetation/Burn Severity**
  - [x] Build component (suggested: `ui/public/js/components/vegetation-burn-severity.js`).
  - [x] Vegetation radios: Forest / Range / Chaparral.
  - [x] Conditional Range/Chaparral description visible only when vegetation is Range or Chaparral.
  - [x] On vegetation change, **apply defaults**:
    - [x] Range → shrub 15 / grass 75 / bare 10
    - [x] Chaparral → shrub 80 / grass 0 / bare 20
  - [x] Bare ground auto-calculated `100 - shrub - grass` (read-only).
  - [x] Burn severity radios: High / Moderate / Low / Unburned (with severity color badges).
- [x] **4) Hillslope**
  - [x] Numeric inputs for top/middle/bottom gradient (%) and horizontal length.
  - [x] Unitizer attributes for length input, store canonical meters in state.
- [x] **5) Simulation-options component**
  - [x] Reuse `createSimulationOptions` for Simulation Years + WEPP version selector.

### Phase 3 — Validation + Defaults
- [x] Implement validation in the ERMiT form:
  - [x] Slopes: 0.001–100 (%).
  - [x] Length: 0–300 m.
  - [x] Rock fragment content: 5–85 (%).
  - [x] Cover inputs: 0–100, sum ≤ 100 for non‑forest.
- [x] Use blur-first + debounced validation (shared spec).
- [x] Initialize fields from defaults + localStorage + URL override precedence (same as other tools).

### Phase 4 — API Wiring
- [x] Assemble request payload: `{ climate, ermit_pars, wepp_version }`.
- [x] `POST /api/ermit/RUN/wepp` for main execution.
- [x] Use client-side pre-fire cover calculation (no `/api/ermit/GET/pre_fire_covers`).
- [x] Handle loading states: disable inputs, spinner, show errors.
- [x] Optional: If progress API not present, show “Running…” only.

### Phase 5 — Results Rendering (Legacy Parity)
- [x] **Inputs summary** table:
  - [ ] Climate name + CLIGEN summary.
  - [x] Soil texture + rfg%.
  - [x] Slopes (top/avg/toe) + length.
  - [x] Burn severity + vegetation.
  - [x] Prefire community (only for Range/Chaparral).
- [x] **{years2sim} - YEAR MEAN ANNUAL AVERAGES** table from `summary.annual_averages`.
- [x] **Rainfall Event Rankings and Characteristics** table from `ebe_events.annual_maxima_events`.
  - [x] Use ranks 5, 10, 20, 50, 75 (per legacy behavior), reduce if needed when fewer events exist.
- [x] **Sediment delivery exceedance plot**
  - [x] Implement with `ui/public/js/components/canvas-chart.js` using gnuplot spec mapping (`api/DEVIATIONS.md`).
  - [x] Use untreated curve (or unburned single curve).
- [x] **Sediment Delivery table**
  - [x] Exceedance probability selector (default 20%).
  - [x] Columns for years 1–5 after fire.
  - [x] Rows for Untreated/Seeding/Mulch (47/72/89/94)/Logs&Wattles, or Unburned only if severity = Unburned.
  - [x] Logs & Wattles row includes diameter/spacing inputs in-table.
- [ ] **Footer metadata**: observed annual precip, JAS precip, monsoonal classification (if available in API response; otherwise mark as missing).
- [x] Re-render results on `unitizer:preferences-changed` (unit display sync).

### Phase 6 — File Download Collapsibles (ERMiT)
- [x] Add collapsible sections in results panel (prefetch + download):
  - [x] `/api/ermit/GET/management/{spatial_severity}`
  - [x] `/api/ermit/GET/soil/{spatial_severity}/{k}`
  - [x] `/api/ermit/GET/slope/{spatial_severity}`
  - [x] `/api/ermit/GET/wepp_output`
  - [x] `/api/ermit/GET/wepp_ebe`
- [x] Document spatial severity variants in UI (e.g., hhh/lll/uuu + mixed variants for severity cases).

### Phase 7 — Testing + Parity Checks
- [x] Unit tests:
  - [x] `ui/tests/ermit-state.test.js` (defaults, normalization, URL overrides).
  - [x] `ui/tests/ermit-tool.test.js` (payload assembly, validation gating, veg defaults).
  - [x] Component test if new vegetation/burn component is added.
- [x] E2E: add `ui/playwright-tests/ermit.pw.cjs` (smoke flow + results visible + unit toggle).
- [x] E2E: add `ui/playwright-tests/ermit-logs-wattles.pw.cjs` (logs & wattles computation across years).
- [x] Parity runs using `parity-runs/ermit/cases.yaml`.
  - [x] Compare annual averages, rainfall rankings, sediment table at 20% exceedance, exceedance curve shape.

### Phase 8 — Logs & Wattles
- [x] Implement Logs & Wattles row calculation (legacy regression + efficiencies).
- [x] Add diameter/spacing inputs using shared form-field component with explicit unit labels.
- [x] Keep canonical metric values in state; convert only for display.
- [x] Compute weighted i10 from ranked storms (5/10/20/50/75 with legacy weights).
- [x] Update results on unitizer preference changes.
- [x] Add E2E coverage for multi-year Logs & Wattles results.

---

## UI Control Groups Mapping (required order)
1) **RockClime component** → `mountRockClimControl` (climate state from cookies)
2) **Soil-properties component** → `createSoilProperties`
3) **Vegetation/Burn Severity** → new component
4) **Hillslope** → slopes + length inputs
5) **Simulation-options component** → `createSimulationOptions`

---

## State + API Mapping

**State (localStorage + URL overrides):**
- `fswepp_ermit_state` → `{ soil_texture, rfg_pct, slopes, length_m, vegetation_type, burn_severity, user_shrub_pct, user_grass_pct, user_bare_pct, simulation_years, wepp_version }`
- Climate from `fswepp_climate` cookie (shared).

**API Request:**
```
POST /api/ermit/RUN/wepp
{
  climate: ClimatePars,
  ermit_pars: {
    top_slope_pct,
    middle_slope_pct,
    bottom_slope_pct,
    length_m,
    soil_texture,
    rfg_pct,
    vegetation_type,
    burn_severity,
    user_shrub_pct,
    user_grass_pct,
    user_bare_pct
  },
  wepp_version
}
```

---

## Unit Handling (Unitizer)
- Store canonical **metric** values in state + API.
- Use `data-unitizer-category` + `data-unitizer-unit` on numeric inputs.
- Convert for display only; re-render results on `unitizer:preferences-changed`.

---

## Validation Rules (UI mirrors API)
- Slopes: 0.001–100 (%).
- Length: 0–300 m.
- Rock fragments: 5–85 (%).
- Cover inputs: 0–100; sum ≤ 100 for non‑forest.

---

## Risks / Gaps
- API `summary` object shape must match tables; confirm fields for climate summary + JAS precip + monsoonal class.
- Probability array mapping to sediment exceedance table must be verified against `sed_results` ordering.
- UI defaults are now fixed (see Phase 0); confirm legacy parity impact.

---

## Notes / Decisions
- **UI only** implementation.
- **Client-side** pre-fire cover calculation (no `/api/ermit/GET/pre_fire_covers`).
- Include ERMiT file-download collapsibles as part of planned scope (Phase 6).
- Candidate endpoint removal: `/api/ermit/GET/pre_fire_covers` can be deprecated/removed once UI no longer uses it.
