import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();

// Static assets (compiled Tailwind, favicon, etc.)
app.use("/public/*", serveStatic({ root: "./" }));

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

const cssLink =
  '<link rel="stylesheet" href="/public/app.css" /><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
const jsLinks = `
  <script src="/public/js/unitizer/unitizer_client.js"></script>
  <script type="module" src="/public/js/app.js"></script>
`;

const renderLayout = (title: string, body: string) => `
  ${cssLink}${jsLinks}
  <div class="layout-shell">
    <header class="layout-header">
      <div class="layout-header__inner">
        <div class="flex items-center gap-3">
          <img src="/public/fswepp-logo.png" alt="FSWEPP logo" class="h-7 w-auto" />
        </div>
        <div class="flex items-center gap-4">
          <nav class="layout-nav" aria-label="Primary">
            <a href="/fswepp2/rockclim">Rock:Clim</a>
            <a href="/fswepp2/wepproad">WEPP:Road</a>
            <a href="/fswepp2/disturbed">Disturbed WEPP</a>
            <a href="/fswepp2/ermit">ERMiT</a>
            <a href="/fswepp2/docs">Documentation</a>
            <a href="/fswepp2/about">About/Help</a>
            <a href="/fswepp2/ui-component-gallery">UI Gallery</a>
          </nav>
          <div class="flex items-center gap-2 text-sm" data-unit-toggle>
            <button type="button" class="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground" data-climate-badge>
              Climate: Not set
            </button>
            <button type="button" class="text-muted-foreground px-1 py-1" data-unit-label="metric">Metric</button>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" id="unit_toggle_input" />
              <div class="h-5 w-9 rounded-full bg-primary transition-colors"></div>
              <div class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow peer-checked:translate-x-4 transition-transform"></div>
            </label>
            <button type="button" class="text-muted-foreground px-1 py-1" data-unit-label="english">English</button>
          </div>
        </div>
      </div>
    </header>
    <main class="layout-main">
      <section class="page-container">
        <h1>${title}</h1>
        ${body}
      </section>
    </main>
  </div>
`;

// Placeholder landing (root reserved for future backfill)
app.get("/", (c) =>
  c.html(
    `${cssLink}<main class="page-container">
      <h1>FSWEPP2 UI (Bun + Hono)</h1>
      <p>This is a placeholder. Core tools will live under <code>/fswepp2/…</code>.</p>
    </main>`
  )
);

// Entry point for the new utility flows
app.get("/fswepp2", (c) =>
  c.html(
    renderLayout(
      "FSWEPP2 Tools",
      `<ul class="list-disc pl-6">
        <li><a href="/fswepp2/rockclim">Rock:Clim</a></li>
        <li><a href="/fswepp2/wepproad">WEPP:Road</a></li>
        <li><a href="/fswepp2/disturbed">Disturbed WEPP</a></li>
        <li><a href="/fswepp2/ermit">ERMiT</a></li>
      </ul>`
    )
  )
);

app.get("/fswepp2/rockclim", (c) =>
  c.html(
    renderLayout("Rock:Clim", "<p>Shell page for Rock Climate Control.</p>")
  )
);

app.get("/fswepp2/wepproad", (c) =>
  c.html(renderLayout("WEPP Road", "<p>Shell page for WEPP Road tool.</p>"))
);

app.get("/fswepp2/disturbed", (c) =>
  c.html(
    renderLayout("Disturbed WEPP", "<p>Shell page for Disturbed WEPP tool.</p>")
  )
);

app.get("/fswepp2/ermit", (c) =>
  c.html(renderLayout("ERMiT", "<p>Shell page for ERMiT tool.</p>"))
);

app.get("/fswepp2/docs", (c) =>
  c.html(
    renderLayout("Documentation", "<p>Documentation stub for FSWEPP2.</p>")
  )
);

app.get("/fswepp2/about", (c) =>
  c.html(
    renderLayout("About & Help", "<p>About/help stub for FSWEPP2.</p>")
  )
);

app.get("/fswepp2/ui-component-gallery", (c) =>
  c.html(
    renderLayout(
      "FSWEPP2 UI Component Gallery",
      `<p class="text-sm text-muted-foreground">
        Shared UI components showcase with layout and accessibility metadata hooks.
      </p>
      <section id="component-gallery-root" class="space-y-8" data-contrast-suite data-theme-select></section>
      <script type="module" src="/public/js/gallery.js"></script>`
    )
  )
);

// Default export for Bun runtime
export default {
  port: Number(process.env.PORT || 5173),
  fetch: app.fetch,
};
