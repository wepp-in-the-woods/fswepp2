# BAER Reports infrastructure guide

## Purpose

BAER Reports is a separately deployable frontend application. It does **not**
depend on the FSWEPP2 API. The browser downloads a compressed JSON dataset and
opens report PDFs from static URLs served by Caddy.

FSWEPP2 and BAER Reports remain in one source monorepo, but they build, release,
and run as independent containers. Shared UI code is a workspace package, never
a dependency on another application's built files.

## Target repository layout

```text
apps/
  fswepp2-ui/                 # existing FSWEPP2 Bun/Hono UI, moved from ui/
  baer-reports-ui/            # BAER Bun/Hono UI
packages/
  ui-kit/                     # reusable components and Unitizer integration
  ui-styles/                  # Tailwind theme, design tokens, fonts, base CSS
  api-client/                 # optional; BAER Reports does not use this
docker-compose.yml
Caddyfile
```

The root `package.json` uses Bun workspaces:

```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

Both UIs consume the shared packages through workspace dependencies:

```json
{
  "dependencies": {
    "@fswepp/ui-kit": "workspace:*",
    "@fswepp/ui-styles": "workspace:*"
  }
}
```

Move generic components from the current `ui/public/js/components/` directory
into `@fswepp/ui-kit`: buttons, fields, tabs, data tables, collapsibles, and
Unitizer helpers. Keep report schemas, filtering, map behavior, and BAER page
composition inside `apps/baer-reports-ui`.

The shared package should expose source modules and a shared Tailwind theme or
stylesheet. Each app builds its own CSS while Tailwind scans its local sources
and the shared package. Do not copy `app.css` or modules from one app image
into the other.

## Static data contract

Store BAER-owned static data outside the repository. This keeps large report
assets out of Git and lets operations replace report data without rebuilding
either UI image.

Expected host directory layout:

```text
/srv/fswepp-data/baer-reports/
  data/
    reports.json.gz
    reports.metadata.json.gz
  pdfs/
    1988/
      example-report.pdf
    1989/
      another-report.pdf
```

Use URL-safe, immutable relative paths in the JSON:

```json
{
  "id": "1988-example-fire",
  "pdf_url": "/baer-reports/pdfs/1988/example-report.pdf"
}
```

The BAER frontend fetches `/baer-reports/data/reports.json.gz`, decompresses
it in the browser, and reads its records. Use `DecompressionStream("gzip")`
where supported, with a small gzip fallback library only if the
supported-browser policy requires it.

Caddy must return the file as stored. Do **not** add
`Content-Encoding: gzip`: this design intentionally hands the gzip stream to
the application for decompression. Set the content type to
`application/gzip` instead.

## Compose services and external data mount

Define the host directory in an untracked `.env` file next to Compose:

```dotenv
BAER_REPORTS_DATA_DIR=/srv/fswepp-data/baer-reports
```

Use an absolute path. The mount is read-only; neither Caddy nor either UI
container needs permission to modify reports or PDFs.

Add a BAER app service and mount the external directory into Caddy:

```yaml
services:
  ui:
    build:
      context: .
      dockerfile: apps/fswepp2-ui/Dockerfile
    ports:
      - "5173:5173"
    environment:
      PORT: 5173

  baer-reports:
    build:
      context: .
      dockerfile: apps/baer-reports-ui/Dockerfile
    ports:
      - "5174:5174"
    environment:
      PORT: 5174

  caddy:
    # Retain existing build, ports, and mounts.
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./api/prism_data:/srv/prism_data:ro
      - ${BAER_REPORTS_DATA_DIR:?Set BAER_REPORTS_DATA_DIR in .env}:/srv/baer-reports:ro
    depends_on:
      - api
      - ui
      - baer-reports
```

The `:?…` interpolation causes `docker compose config` and
`docker compose up` to fail clearly when the local data directory is not
configured. In development, mount the BAER source into `baer-reports` just
as the existing UI source is mounted; that does not change the external data
mount.

Build each UI image from the repository root so its Dockerfile can copy its
application and `packages/ui-*`. Neither image should copy report data; data
is mounted only at runtime.

## Caddy routes

Keep BAER on the existing host under `/baer-reports/`. Place these handlers
before the broad `/public/*`, `/fswepp2*`, and catch-all handlers in the
current Caddyfile:

```caddy
# Static gzip files. "handle" preserves the full request URI, so this maps
# /baer-reports/data/... to /srv/baer-reports/data/....
handle /baer-reports/data/* {
  header Cache-Control "public, max-age=3600"
  header Content-Type "application/gzip"
  root * /srv
  file_server
}

# Browser PDF viewing and range requests are handled by Caddy's file_server.
# Published PDFs are immutable and may be cached aggressively.
handle /baer-reports/pdfs/* {
  header Cache-Control "public, max-age=31536000, immutable"
  root * /srv
  file_server
}

# The BAER application. handle_path removes /baer-reports before proxying,
# allowing the app to serve /, /assets/..., and /health normally.
handle_path /baer-reports/* {
  reverse_proxy baer-reports:5174
}
```

With `root * /srv`, Caddy resolves the data URL to
`/srv/baer-reports/data/reports.json.gz` and PDF URLs to
`/srv/baer-reports/pdfs/<year>/<filename>.pdf`. Keep the URL and mounted
directory shapes aligned. Do not add rewrites that could expose files outside
`/srv/baer-reports`.

No CORS rule is required: the BAER application, JSON, and PDFs share a Caddy
origin. If BAER later moves to `reports.example.org` while static data remains
on another host, add a tightly scoped CORS rule for that origin to the static
handlers.

## App URL behavior

Because this app is reverse-proxied at a path prefix, its HTML must emit
prefix-aware asset URLs. Prefer relative URLs such as `assets/app.js` and
`assets/app.css`, or configure `BASE_PATH=/baer-reports`.

Do not use the current FSWEPP2-style absolute `/public/...` URLs. The existing
Caddy configuration routes that namespace to the FSWEPP2 UI, so assets would
collide.

Update the FSWEPP2 landing-page card to link to `/baer-reports/`. It remains
a same-origin navigation but BAER is independently deployable.

The simplest long-term isolation is a separate hostname:

```caddy
reports.example.org {
  reverse_proxy baer-reports:5174
}
```

In that model, serve the data and PDFs from the same hostname as BAER (or add
narrow CORS), and the app may use root-relative asset paths without conflicting
with FSWEPP2.

## Delivery sequence

1. Add the Bun workspace root and extract the shared UI and styling packages.
2. Make the existing FSWEPP2 UI use those packages without changing behavior.
3. Create `apps/baer-reports-ui`, move BAER-specific code there, and remove
   BAER's route and import from FSWEPP2.
4. Add the `baer-reports` Compose service and its read-only external-data
   mount.
5. Add Caddy's JSON, PDF, and application routes. Verify a PDF range response
   and a gzip data download.
6. Point the FSWEPP2 tool card to `/baer-reports/`. Deploy the two UI images
   independently from then on.

## Verification

After configuring `.env`, validate configuration before starting the stack:

```sh
docker compose config
docker compose up -d --build baer-reports caddy
curl -I http://localhost:8091/baer-reports/data/reports.json.gz
curl -I -H 'Range: bytes=0-1023' \
  http://localhost:8091/baer-reports/pdfs/1988/example-report.pdf
```

Expect the gzip endpoint to return `Content-Type: application/gzip`. Expect
the range request to return `206 Partial Content` with
`Accept-Ranges: bytes` and `Content-Range`. Finally, load
`http://localhost:8091/baer-reports/` and confirm it fetches the compressed
dataset and opens a report PDF without calling `/fswepp2/api/`.
