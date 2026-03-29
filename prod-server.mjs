import { createServer, request as httpRequest } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { gzipSync } from "zlib";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "dist");
const PORT = 4444;
const API_TARGET = "http://127.0.0.1:3335";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".glb": "model/gltf-binary",
};

// Compressible MIME types
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".svg"]);

// Pre-compressed file cache (gzip at startup for all dist/ text files)
const gzipCache = new Map();

function precompress(dir, prefix = "") {
  const { readdirSync } = await_import_workaround();
  // We'll lazily gzip on first request instead
}

function getGzipped(filePath, data, ext) {
  if (!COMPRESSIBLE.has(ext)) return null;
  let gz = gzipCache.get(filePath);
  if (!gz) {
    gz = gzipSync(data, { level: 6 });
    gzipCache.set(filePath, gz);
  }
  return gz;
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Proxy /mc-api/* → API server as /api/*
  if (url.pathname.startsWith("/mc-api")) {
    const apiPath = url.pathname.replace(/^\/mc-api/, "/api") + url.search;
    const proxyReq = httpRequest(
      `${API_TARGET}${apiPath}`,
      { method: req.method, headers: { ...req.headers, host: "127.0.0.1:3335" } },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          ...proxyRes.headers,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        });
        proxyRes.pipe(res);
      }
    );
    proxyReq.on("error", () => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "API server unavailable" }));
    });
    req.pipe(proxyReq);
    return;
  }

  // Static file serving from dist/
  let filePath = join(DIST, url.pathname === "/" ? "index.html" : url.pathname);

  // SPA fallback — if file doesn't exist and no extension, serve index.html
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    const ext = extname(filePath);
    if (!ext) {
      filePath = join(DIST, "index.html");
    } else {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
  }

  try {
    const data = readFileSync(filePath);
    const ext = extname(filePath);
    const mime = MIME[ext] || "application/octet-stream";
    const acceptsGzip = (req.headers["accept-encoding"] || "").includes("gzip");

    const headers = { "Content-Type": mime };
    if (url.pathname.startsWith("/assets/")) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    } else {
      headers["Cache-Control"] = "no-cache";
    }

    // Serve gzipped if client accepts and file is compressible
    if (acceptsGzip && COMPRESSIBLE.has(ext)) {
      const gz = getGzipped(filePath, data, ext);
      if (gz) {
        headers["Content-Encoding"] = "gzip";
        headers["Vary"] = "Accept-Encoding";
        res.writeHead(200, headers);
        res.end(gz);
        return;
      }
    }

    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(500);
    res.end("Internal error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Production server on http://0.0.0.0:${PORT} → dist/ + API proxy (gzip enabled)`);
});
