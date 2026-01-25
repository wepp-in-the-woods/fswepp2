# FSWEPP2 Implementation Plan

> Owner: FSWEPP2 UI Lead
> Status: Multi-phase, checkbox-tracked

## Phase 0 — Baseline Alignment
- [x] Confirm routing base path is `/fswepp2` and Caddy routes align with migration plan
- [x] Confirm API base path is `/api` for all tool endpoints
- [x] Decide whether any legacy UI endpoints need temporary forwarding or explicit 404s

## Phase 1 — Shared Foundations
- [x] Set up `/ui/public/js/app.js` entrypoint and module loading strategy
- [x] Implement cookie helpers (`fswepp_climate`, `fswepp_user_climates`, `fswepp_units`)
- [x] Implement localStorage helpers (tool states)
- [x] Implement URL config (base64url encode/decode + precedence)
- [x] Implement validators (range, required, coordinate)
- [x] Implement API client + error normalization
- [x] Port and adapt Unitizer client for `/public/js/unitizer_map.js`
- [ ] Generate trimmed `unitizer_map.js` for FSWEPP-only categories (deferred; keeping full map)
- [ ] Build Unitizer preference modal (custom modal component) — deferred (global toggle only)
- [x] Add Unitizer DOM conventions and registration helpers

## Phase 2 — Shared UI Components
- [x] Custom modal component (focus trap, ESC close, ARIA)
- [x] FormField component variants + validation state
- [x] RunButton with loading/error/success states
- [x] CollapsibleSection with localStorage persistence
- [x] TabPanel with keyboard navigation
- [x] DataTable with sorting + pagination + CSV export
- [x] StatCard component
- [x] Unit toggle in header wired to Unitizer preferences
- [x] Component gallery endpoint with theme lab and contrast metrics report

## Phase 3 — RockClim Control
- [ ] RockClimControl layout + cookie hydration
- [ ] Database/Cligen selects + persistence
- [ ] Location fields (lon/lat) with validation + debounce
- [ ] Map integration (deck.gl, self-hosted)
- [ ] Station fetch (`/api/rockclim/GET/closest_stations`)
- [ ] Stations GeoJSON fetch with bbox from view
- [ ] Station select + PRISM toggle
- [ ] Climate customization modal + cookie storage
- [ ] Saved climates dropdown + delete/rename

## Phase 4 — Charting + Visualizations
- [ ] Chart core (canvas setup, resize, scales)
- [ ] Renderers (line, bar, scatter, area, text)
- [ ] Interactions (hover tooltips, legend toggle)
- [ ] Chart types (line, bar, exceedance, histogram, scatter)
- [ ] SlopeProfile renderer (WEPP Road + Disturbed)

## Phase 5 — Tool Pages
- [ ] WEPP Road UI + slope profile
- [ ] WEPP Road results (stats, charts, tables)
- [ ] Disturbed WEPP UI + slope profile
- [ ] Disturbed results (return period, time series, tables)
- [ ] ERMiT UI + conditional pre-fire community
- [ ] ERMiT results (tabs, exceedance, tables)

## Phase 6 — Testing & Quality Gates
- [ ] Unit tests for utils (>=90%)
- [ ] Integration tests for components (>=80%)
- [ ] Playwright E2E flows for all tools
- [ ] Accessibility checks (keyboard, ARIA, contrast)
- [ ] Performance benchmarks (charts/tables)

## Phase 7 — Polish & Delivery
- [ ] Visual regression checks
- [ ] Bundle size verification
- [ ] Final spec reconciliation and doc updates
- [ ] Release checklist + deployment notes
