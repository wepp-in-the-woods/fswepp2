# Peak Flow (FSWEPP2 UI) Spec + Plan

Goal: standardize Peak Flow to the FSWEPP2 Hono/Bun UI conventions, reuse existing shared UI components, and add Unitizer-based unitization. The only logic to reuse from React is the calculation module in `frontend/src/pages/PeakFlow/peakFlowCalculations.ts` (ported TS → JS).

## Scope
- New Peak Flow tool under Hono/Bun UI (no React, no CSV export).
- Client-side calculations using a JS port of `peakFlowCalculations.ts`.
- Unitizer-driven unit labels and conversions (canonical metric state).
- Use existing shared components and chart utilities.

## Non-Goals
- CSV export.
- React UI reuse.
- API endpoint or server-side calculation.

## Inputs and Outputs (Canonical)
Canonical (metric) state for calculations:
- Q: storm runoff (mm)
- P: storm precipitation (mm)
- A: watershed area (ha)
- L: watershed flow length (m)
- Sg: average watershed gradient (m/m) [decimal, not percent]
- Tc: time of concentration (hours)
- CN: curve number (dimensionless)
- Fp: ponding adjustment factor (0-1)
- h: culvert distance/height (m)

Outputs:
- S (mm), Ia (mm), Ia/P, qu (m^3/s per ha/mm x 10^-3), q (m^3/s), D (cm)

## UI Sections
1) Header: title + short description + optional “About” panel.
2) Methods + References: collapsible sections.
3) Inputs:
   - From ERMiT: Q, P
   - From wepp.cloud: A, L, Sg
   - Manual Entry: CN, Tc, Fp, h
   - Buttons: Run, Clear, Use Mica Creek example
4) Results:
   - Disclaimer alert
   - Stat cards for S, Ia, Ia/P, qu, q, D
5) Optional chart: hydrograph or unit peak flow surface.
   - Reuse `createCanvasChart` with a line or contour-style surrogate if data exists.
   - If no reliable data, omit chart.

## UI Component Mapping
- Form inputs: `createFormField`
- Buttons: `createRunButton` (primary) + `createButton` (secondary)
- Collapsibles: `createCollapsibleSection`
- Alerts: `createAlert`
- Results: `createStatCard`
- Charts: `createCanvasChart` (optional)

## Unitization Requirements (Canonical Patterns)
- Store all input values in canonical metric units.
- Apply `data-unitizer-category` and `data-unitizer-unit` attributes on numeric inputs.
- Use Unitizer preferences (and global toggle override) for labels and display.
- For results:
  - Store canonical metric outputs.
  - Display using Unitizer conversions.
  - Re-render display on `unitizer:preferences-changed`.
  - Put units in labels (not in values) where applicable.

Suggested Unitizer categories:
- Q, P (mm): `xs-distance` with unit `mm`
- A (ha): `area` with unit `ha`
- L, h (m): `sm-distance` with unit `m`
- Sg: unitless decimal (no unitizer)
- Tc (hours): use `time` category if available; otherwise unitless with “hr” label
- qu/q: no direct category in unitizer map; display with manual label and unitizer conversion if implemented (optional)
- D (cm): `xs-distance` with unit `cm` if supported; else `mm` + convert display label to cm or keep in mm.

If categories are missing for time or flow rate, keep canonical values and label units explicitly.

## Assets
Copy/move these assets into `ui/public/`:
- `frontend/public/peak-flow-icon.svg`
- `frontend/public/culvertgraphic.png`
- `frontend/public/fangmeier.gif`
- `frontend/public/stormtypes.gif`

## Validation and Edge Cases
Align validations with `peakFlowCalculations.ts`:
- Q, P, A, L > 0
- Sg in [0, 1] (decimal)
- Tc in [0.1, 10] hours
- CN in [15, 100]
- Fp in [0, 1]
- h in [0.3, 18.3] meters (1–60 ft)

Note: React UI currently allows Sg as 0–100 and h as 1–60 meters; those must be corrected for canonical usage or require conversion.

## Implementation Plan
1) **Port calculation module**
   - Copy `frontend/src/pages/PeakFlow/peakFlowCalculations.ts` to `ui/public/js/tools/peakflow-calculations.js`.
   - Strip TypeScript types and ensure exports are ES module friendly.

2) **Create Peak Flow tool**
   - New module: `ui/public/js/tools/peakflow.js`.
   - Use shared UI components for fields, sections, results.
   - Implement canonical state and validation.
   - Wire Run/Clear/Example buttons.

3) **Add route + mount**
   - Add `/fswepp2/peakflow` route in `ui/src/server.ts`.
   - Add `mountPeakFlowTool` in `ui/public/js/app.js`.

4) **Unitizer integration**
   - Apply `data-unitizer-category` and `data-unitizer-unit` on numeric inputs.
   - Implement a `renderResults()` that converts and re-renders on `unitizer:preferences-changed`.

5) **Info content (collapsibles)**
   - Convert selected content from `PeakFlowFieldsInfo.tsx` into inline collapsible help blocks.
   - Use brief always-visible hint text per field (1–2 lines).
   - Use collapsibles for longer explanations, tables, and figures.
   - Prefer section-level help for shared concepts; use per-field collapsibles only where guidance is essential.

6) **Assets**
   - Copy required images to `ui/public/`.
   - Update references in modal content to `/public/...`.

7) **(Optional) Charts**
   - If a chart is needed, use `createCanvasChart`.
   - Ensure chart data uses canonical units and listens to unitizer changes for labels.

## Risks / Decisions
- Decide how to represent Sg in the UI: percent input vs decimal. Prefer decimal input with helper copy.
- Decide whether to include long info dialogs now vs later.
- Decide if D output should be displayed in cm only or converted by Unitizer.

## Acceptance Criteria
- Peak Flow available at `/fswepp2/peakflow`.
- Inputs and results use Unitizer patterns and update on unit preference changes.
- No React dependencies.
- Calculations match `peakFlowCalculations.ts`.
- UI consistent with WEPP:Road conventions and components.
