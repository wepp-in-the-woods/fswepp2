# Agent Notes

## Dev environment networking
- Caddy listens on `:8091` without TLS by design.
- This is intentional for the dev stack where TLS is terminated upstream (e.g., HAProxy).

## UI CSS workflow
- `ui/public/app.css` is generated (Tailwind). Use `bun run dev:all` in `ui/` or `docker compose up ui` to keep it built in dev; `bun run build` for CI.
