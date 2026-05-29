import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { requestId } from "hono/request-id";

const app = new Hono();

app.use("*", requestId());

// Logging middleware
app.use("*", async (c, next) => {
    const start = performance.now();
    await next();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    if (c.req.path === "/health") return;
    console.log(
        JSON.stringify({
            ts: Date.now() / 1000,
            level: "info",
            msg: "request",
            method: c.req.method,
            path: c.req.path,
            status: c.res.status,
            duration_ms: durationMs,
        })
    );
});

// Serve compiled CSS and static assets
app.use("/public/*", serveStatic({ root: "./" }));

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

const cssLink = '<link rel="stylesheet" href="/public/app.css" />';

const renderShell = (title: string, body: string) => `<!doctype html>
<html lang="en" data-theme="">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/public/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${cssLink}
  </head>
  <body>
    <div id="root">${body}</div>
    <script type="module" src="/public/js/index.js"></script>
  </body>
</html>`;

// Home page
app.get("/", (c) =>
    c.html(renderShell("FSWEPP2", `<p>Loading...</p>`))
);

// Add routes for your existing pages here, e.g.:
app.get("/rock-clime", (c) =>
    c.html(renderShell("Rock CliMe", `<p>Loading Rock CliMe...</p>`))
);

app.get("/peak-flow-calculator", (c) =>
    c.html(renderShell("Peak Flow Calculator", `<p>Loading...</p>`))
);

app.get("/ermit", (c) =>
    c.html(renderShell("ERMiT", `<p>Loading ERMiT...</p>`))
);

export default {
    port: Number(process.env.PORT || 5173),
    fetch: app.fetch,
};