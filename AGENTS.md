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
