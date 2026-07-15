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

// API proxy middleware - forward /api/* to backend
app.all("/api/*", async (c) => {
    const url = new URL(c.req.url);
    const path = url.pathname;
    const query = url.search;

    const backendUrl = `http://127.0.0.1:8090${path}${query}`;

    try {
        // Get the request body
        let body: BodyInit | undefined;
        const contentType = c.req.header("content-type");

        if (c.req.method !== "GET" && c.req.method !== "HEAD") {
            // Read the body as text to preserve it
            const rawBody = await c.req.text();
            body = rawBody;
        }

        const response = await fetch(backendUrl, {
            method: c.req.method,
            headers: {
                "Content-Type": contentType || "application/json",
            },
            body,
        });

        const responseBody = await response.text();
        const responseContentType = response.headers.get("content-type");

        // Parse JSON if applicable
        let responseData = responseBody;
        if (responseContentType?.includes("application/json")) {
            try {
                responseData = JSON.parse(responseBody);
            } catch (e) {
                // If parsing fails, use raw text
                responseData = responseBody;
            }
        }

        // Return response with proper status code
        c.status(response.status as any);
        return c.json(responseData);
    } catch (error) {
        console.error(`[API Proxy] Error forwarding ${backendUrl}:`, error);
        c.status(502);
        return c.json({ error: "Failed to reach backend API" });
    }
});

// Serve PRISM data with CORS headers
app.all("/prism_data/*", async (c) => {
    const url = new URL(c.req.url);
    const path = url.pathname;
    const query = url.search;

    const backendUrl = `http://127.0.0.1:8091${path}${query}`;

    try {
        // Copy request headers, especially Range
        const headers: HeadersInit = {
            "Content-Type": "application/octet-stream",
        };

        const rangeHeader = c.req.header("range");
        if (rangeHeader) {
            headers["Range"] = rangeHeader;
        }

        const response = await fetch(backendUrl, {
            method: "GET",
            headers,
        });

        if (!response.ok) {
            console.error(`[PRISM Proxy] Backend returned ${response.status}`);
            c.status(response.status as any);
            return c.body(await response.text());
        }

        // Set CORS headers for GeoTIFF requests
        c.header("Access-Control-Allow-Origin", "*");
        c.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST");
        c.header("Access-Control-Allow-Headers", "Range, Content-Type");
        c.header("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Type");

        // Preserve response headers from backend
        const contentType = response.headers.get("content-type");
        if (contentType) {
            c.header("Content-Type", contentType);
        }

        const contentLength = response.headers.get("content-length");
        if (contentLength) {
            c.header("Content-Length", contentLength);
        }

        const contentRange = response.headers.get("content-range");
        if (contentRange) {
            c.header("Content-Range", contentRange);
        }

        // Set proper status for range requests
        if (rangeHeader && response.status === 206) {
            c.status(206 as any);
        } else {
            c.status(response.status as any);
        }

        return c.body(await response.arrayBuffer());
    } catch (error) {
        console.error(`[PRISM Proxy] Error forwarding ${backendUrl}:`, error);
        c.status(502);
        return c.json({ error: "Failed to reach PRISM data" });
    }
});

// Serve compiled CSS and static assets
app.use("/public/*", serveStatic({ root: "./" }));

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

const cssLink = '<link rel="stylesheet" href="/public/app.css" />';
const jsLinks = `
<!--  <script src="/public/js/vendor/deck.gl.min.js"></script>-->
<!--  <script src="/public/js/vendor/geotiff.js"></script>-->
  <script src="/public/js/unitizer/unitizer_client.js"></script>
  <script type="module" src="/public/js/index.js"></script>
`;

const renderShell = (title: string, body: string) => `<!doctype html>
<html lang="en" data-theme="">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/public/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${cssLink}
    ${jsLinks}
  </head>
  <body>
    <div id="root">${body}</div>
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
    port: Number(process.env.PORT || 5175),
    fetch: app.fetch,
};