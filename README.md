# FSWEPP2

FSWEPP2 is a Hono/Bun UI with a FastAPI backend that re-implements the legacy
FSWEPP tools (WEPP:Road, Disturbed WEPP, ERMiT) with a shared RockClim control.

## Links

- **Legacy FSWEPP:** https://forest.moscowfsl.wsu.edu/fswepp/
- **FSWEPP2 Repo:** https://github.com/wepp-in-the-woods/fswepp2
- **FSWEPP2 Dev:** https://fswepp2-dev.bearhive.duckdns.org/

## Quick start (Docker Compose)

```
docker compose up --build
```

Then:
- UI (via Caddy): `http://localhost:8091/fswepp2/wepproad`
- UI (direct): `http://localhost:5173/fswepp2/wepproad`
- API: `http://localhost:8090/api`
- API docs: `http://localhost:8090/docs`

## Repo layout

- `ui/`: Bun + Hono UI, vanilla JS modules, Tailwind CSS
- `api/`: FastAPI backend (WEPP/CLIGEN execution)
- `docs/`: UI + architecture specs
- `parity-runs/`: legacy parity baselines

## Testing

- Unit tests (UI): `docker compose exec -T ui bun test --preload ./tests/setup.ts`
- Playwright deps (first run): `docker compose exec -T ui node /app/node_modules/@playwright/test/cli.js install-deps chromium`
- Playwright browsers (first run): `docker compose exec -T ui bunx playwright install chromium`
- Playwright (UI): `docker compose exec -T ui node /app/node_modules/@playwright/test/cli.js test --config /app/playwright.config.cjs`

## Notes

- RockClim is embedded in each tool page (WEPP:Road, Disturbed WEPP, ERMiT).
- User-defined climate modifications are stored client-side in cookies.
- Unit conversions are handled by the Unitizer client in the UI.

If you need legacy React reference components, see `frontend/` (not part of the
current runtime).
