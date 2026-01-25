# FSWEPP2 Replacement – Infrastructure Architecture
**Date:** January 23, 2026

## Objectives
- Ship a functional replacement UI quickly while we decommission the legacy stack.
- Use Bun + Hono for a simple server-rendered experience (no React), with Tailwind for styling.
- Keep look/feel consistent across tools by reusing the existing design tokens.
- Vanilla JS for client behavior (no React/SPA runtime).
- Align with `docs/security-policies.md` and the decommissioning recommendation (risk containment, versioned API surface).

## Constraints & Guardrails
- Security: follow the allowlists, no-shell, safe file handling, and debug-gating rules in `docs/security-policies.md`.
- UX: utility-first; forms-first, minimal interactivity, fast load; works without JS but can progressively enhance.
- Client runtime: vanilla JS only; avoid React or other SPA frameworks.
- Compatibility: keep existing API contracts stable; no changes to model execution paths (we own the API but will preserve current behavior to avoid regressions). External path will be `/fswepp2/api` (optional temporary `/api` alias during transition).
- Operability: containerized, reproducible locally via Docker Compose; logs to STDOUT for centralized collection.
- Data: no new databases; UI stays stateless aside from in-memory/session data.

## Target Architecture
- **FastAPI service (api)**: existing `/api` routes and WEPP/CLIGEN execution; runs under Uvicorn; temp artifacts in `/dev/shm/<model>/`.
- **Hono UI service (ui)**: Bun runtime; server-rendered routes for WEPP:Road, Disturbed WEPP, and ERMiT with a shared RockClim control embedded on each tool page. Fetches data from the API over the internal network; handles form validation and error shaping; serves static assets (CSS/JS) from `public/`.
- **Edge/proxy (Caddy)**: runs behind HAProxy TLS termination on `fswepp2.bearhive.duckdns.org`; HAProxy → Caddy is HTTP-only. Caddy proxies `/fswepp2/api` → FastAPI and `/fswepp2/*` → Hono UI (app pages live under `/fswepp2/...`); proxies `/public/*` → Hono UI for static assets; injects security headers (HSTS, CSP, X-Content-Type-Options, Referrer-Policy) and enforces CORS to the frontend origin. Optional transitional `/api` alias may be left briefly.
- **State & storage**: No persistent DB in the UI. User-defined climate modifications are stored client-side in cookies. Temp artifacts remain on tmpfs.
- **Observability**: Structured JSON logs from both services; request IDs propagated via `X-Request-ID`. Health endpoints: `/health` (api) and `/health` (ui) returning minimal JSON.

### Request flow (text map)
1. Browser → HAProxy (TLS termination for `fswepp2.bearhive.duckdns.org`) → Caddy (`/fswepp2/*` routes) → Hono UI (feature pages under `/fswepp2/...`; root can later host landing/index from legacy backfill).
2. UI renders form, POSTs back to UI → UI calls API at `/fswepp2/api/...` (internal HTTP) → API runs WEPP/CLIGEN → UI returns shaped JSON/file responses.
3. Browser/programmatic client → HAProxy → Caddy (`/fswepp2/api/...`) → API; optional temporary alias `/api/...` during transition.

## Repository & Build Layout
- Keep `api/` as-is.
- Add `ui/` (Bun + Hono) with `src/routes/*.ts`, `public/`, and shared styles under `ui/styles/`.
- Shared design tokens extracted from the current frontend live in `ui/styles/theme.css` and `ui/tailwind.config.ts` (see Styling Reuse).
- Remove the legacy React `frontend/` and its `Dockerfile.frontend` once the UI is scaffolded and styling migrated.
- Add `Caddyfile` and `Dockerfile.ui` (Bun build → minimal runtime).
- Local dev: `docker compose up api ui caddy` (new service replaces `frontend` and nginx).
- Production images: multi-stage `Dockerfile.ui` and existing `Dockerfile` for the API.
- Primary user-facing flows live under `/fswepp2/...`; root `/` is reserved to backfill the legacy index and other pages as needed.

### Docker Compose (dev) sketch
- `api`: existing definition (port 8090, tmpfs `/dev/shm`).
- `ui`: build `Dockerfile.ui`, mount `ui/` for live reload, expose `5173` (or align to `8091` for prod parity). Pages live under `/fswepp2/...`.
- `caddy`: proxies `/fswepp2/api` (and optional `/api`) → `api:8090`, `/fswepp2/*` → `ui:5173`, `/public/*` → `ui:5173`; serves security headers and CORS; runs HTTP only (HAProxy handles external TLS).

## Styling Reuse Plan (answering “can we take the existing styling?”)
- Yes. Reuse the Tailwind theme and CSS variables defined in `frontend/src/index.css` and `frontend/tailwind.config.js`.
- Extract the tokens into `ui/styles/theme.css` (CSS custom properties) and mirror them in `ui/tailwind.config.ts` via `theme.extend.colors`, fonts, and utilities.
- Preserve the light/dark palettes, typography (Inter), and component utility classes (e.g., `.page-container`, `.dialog-container`, `.reference`).
- Bundle CSS with Tailwind CLI via Bun: `bunx @tailwindcss/cli -i ./styles/theme.css -o ./public/app.css --watch` for dev; `--minify` for prod.
- Result: consistent look across old/new tools without keeping the React component layer.

## Delivery Plan (functional-first)
- **Phase 0 (branch cut, 1–2 days):** Create `hono-bun` branch; scaffold `ui/` (Hono app, Tailwind via Bun, health check); extract and port design tokens/assets from `frontend/`; add `Caddyfile`; drop nginx config and remove `frontend/` from compose.
- **Phase 1 (3–5 days):** Implement server-rendered forms + result pages for WEPP:Road (priority usage) and embed RockClim control across tool pages; handle file downloads and JSON renders; add API error normalization; ensure vanilla JS enhancements only.
- **Phase 2 (3–4 days):** Add Disturbed WEPP and ERMiT flows; introduce minimal client-side enhancements (input masking, loading states) with vanilla JS modules.
- **Phase 3 (2–3 days):** Hardening—CSP, CORS, rate limits at edge; structured logging; basic uptime checks; align with `docs/security-policies.md` test list (bandit, pip-audit, etc.).
- **Phase 4 (2 days):** Cutover prep—announce new base URL, keep legacy frontend behind `/legacy` during transition, collect telemetry, schedule removal.

## Security Alignment
- Enforce strict input schemas in UI before calling the API (mirroring allowlists/ranges).
- No shell invocation in UI; outbound calls restricted to the internal API host.
- Production runs with `FSWEPP_DEBUG=0`; sanitize error payloads; no path leakage.
- CORS locked to the UI origin; cookies (if used later) set `Secure`, `HttpOnly`, `SameSite=Lax`.

## Testing
- Backend: continue `python -m pytest`; run `pip-audit`, `bandit -r api`.
- UI: `bun test` (or `vitest` via Bun) for route handlers; Playwright smoke script for form submissions against `api` in docker-compose.
- Integration: docker-compose e2e job that posts representative payloads to all four model flows and verifies deterministic hashes/outputs.

## Open Decisions / Next Inputs
- Map/geo UI elements: keep Leaflet-based views or defer to JSON-only downloads initially?
- Telemetry backend (CloudWatch, Loki, or filebeat → Elasticsearch).
