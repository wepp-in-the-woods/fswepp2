import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();

// Static assets (compiled Tailwind, favicon, etc.)
app.use("/public/*", serveStatic({ root: "./" }));

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

const cssLink =
  '<link rel="stylesheet" href="/public/app.css" /><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';

// Placeholder landing (root reserved for future backfill)
app.get("/", (c) =>
  c.html(
    `${cssLink}<main class="page-container">
      <h1>FSWEPP2 UI (Bun + Hono)</h1>
      <p>This is a placeholder. Core tools will live under <code>/fswepp/…</code>.</p>
    </main>`
  )
);

// Entry point for the new utility flows
app.get("/fswepp", (c) =>
  c.html(
    `${cssLink}<main class="page-container">
      <h1>FSWEPP Tools</h1>
      <ul class="list-disc pl-6">
        <li>Rock:Clime (coming soon)</li>
        <li>WEPP:Road (coming soon)</li>
        <li>Disturbed WEPP (coming soon)</li>
        <li>ERMiT (coming soon)</li>
      </ul>
    </main>`
  )
);

// Default export for Bun runtime
export default {
  port: Number(process.env.PORT || 5173),
  fetch: app.fetch,
};
