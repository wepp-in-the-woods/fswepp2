# Agent Notes

## Dev environment networking
- Caddy listens on `:8091` without TLS by design.
- This is intentional for the dev stack where TLS is terminated upstream (e.g., HAProxy).

## UI CSS workflow
- `ui/public/app.css` is generated (Tailwind). Use `bun run dev:all` in `ui/` or `docker compose up ui` to keep it built in dev; `bun run build` for CI.

## UI container workflows
- The `ui` service runs with `./ui` volume-mounted to `/app` (see `docker-compose.yml`).
- Run Bun commands through the container when Bun isn't installed locally:
  - `docker compose exec -T ui bun install`
  - `docker compose exec -T ui bun test --preload ./tests/setup.ts`
  - `docker compose exec -T ui bun run build:css`

## Unitization (canonical guidance)
- Prefer UnitizerClient for conversions, labels, and preference-driven units across UI and results tables.
- Use canonical metric values in state/requests; convert only for display.
- Apply `data-unitizer-category`/`data-unitizer-unit` on numeric inputs and rely on Unitizer to manage labels.
- If a global unit toggle is present, treat it as an explicit override; otherwise honor Unitizer preferences.
- Re-render result tables on `unitizer:preferences-changed` so display units stay in sync.

## Agent prompt formatting
- Provide agent prompts inside Markdown code blocks.
