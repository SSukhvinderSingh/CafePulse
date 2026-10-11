import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_PORT = 8080;
export const DEFAULT_HOST = '0.0.0.0';
export const DEFAULT_DIST = path.resolve(__dirname, 'dist');
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

const COMPRESSIBLE_TYPES = new Set([
  'text/html; charset=utf-8',
  'application/javascript; charset=utf-8',
  'text/css; charset=utf-8',
  'application/json; charset=utf-8',
  'image/svg+xml',
  'text/plain; charset=utf-8',
]);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Creates the CaféPulse production HTTP server.
 * @param {object} [options]
 * @param {string} [options.distDir] Root directory of built assets
 * @param {string} [options.geminiApiKey] Override GEMINI_API_KEY
 * @param {typeof fetch} [options.fetchImpl] Custom fetch for testing upstream Gemini proxy
 * @returns {http.Server}
 */
export function createServer({
  distDir = DEFAULT_DIST,
  geminiApiKey = process.env.GEMINI_API_KEY,
  fetchImpl = globalThis.fetch,
} = {}) {
  const startTime = Date.now();

  const handleHealth = (req, res) => {
    const payload = JSON.stringify({
      status: 'ok',
      uptime: Number(process.uptime().toFixed(2)),
      timestamp: Date.now(),
      geminiConfigured: Boolean(geminiApiKey || process.env.GEMINI_API_KEY),
    });

    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Content-Length': Buffer.byteLength(payload),
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(payload);
  };

  const handleFormulate = async (req, res) => {
    if (req.method !== 'POST') {
      const payload = JSON.stringify({ error: 'Method Not Allowed' });
      res.writeHead(405, {
        ...SECURITY_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Allow': 'POST',
      });
      res.end(payload);
      return;
    }

    let rawBody = '';
    req.setEncoding('utf8');

    for await (const chunk of req) {
      rawBody += chunk;
      if (rawBody.length > 1024 * 1024) {
        const payload = JSON.stringify({ error: 'Payload too large' });
        res.writeHead(413, {
          ...SECURITY_HEADERS,
          'Content-Type': 'application/json; charset=utf-8',
        });
        res.end(payload);
        return;
      }
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      const payload = JSON.stringify({ error: 'Invalid JSON body' });
      res.writeHead(400, {
        ...SECURITY_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
      });
      res.end(payload);
      return;
    }

    if (!body || !body.prompt || !body.schema) {
      const payload = JSON.stringify({ error: 'Missing required fields: prompt, schema' });
      res.writeHead(400, {
        ...SECURITY_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
      });
      res.end(payload);
      return;
    }

    const key = geminiApiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      const payload = JSON.stringify({
        error: 'GEMINI_API_KEY not configured on server',
        fallback: true,
      });
      res.writeHead(503, {
        ...SECURITY_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(payload);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const upstreamRes = await fetchImpl(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: body.prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: body.schema,
            temperature: 0.7,
          },
        }),
        signal: controller.signal,
      });

      if (!upstreamRes.ok) {
        const payload = JSON.stringify({
          error: 'Gemini API upstream error',
          details: `HTTP ${upstreamRes.status}`,
          fallback: true,
        });
        res.writeHead(502, {
          ...SECURITY_HEADERS,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(payload);
        return;
      }

      const upstreamData = await upstreamRes.json();
      const text = upstreamData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const payload = JSON.stringify({
          error: 'Empty candidate text from Gemini API',
          fallback: true,
        });
        res.writeHead(502, {
          ...SECURITY_HEADERS,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(payload);
        return;
      }

      const parsed = JSON.parse(text);
      const payload = JSON.stringify({ data: parsed });
      res.writeHead(200, {
        ...SECURITY_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(payload);
    } catch (err) {
      const payload = JSON.stringify({
        error: 'Gemini API request failed',
        details: err.message,
        fallback: true,
      });
      res.writeHead(502, {
        ...SECURITY_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(payload);
    } finally {
      clearTimeout(timeout);
    }
  };

  const serveStaticFile = (req, res, filePath, isSpaFallback = false) => {
    let stat;
    try {
      stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        const indexCandidate = path.join(filePath, 'index.html');
        if (fs.existsSync(indexCandidate)) {
          return serveStaticFile(req, res, indexCandidate, isSpaFallback);
        }
        return serveNotFound(res);
      }
    } catch {
      if (!isSpaFallback) {
        const fallbackPath = path.join(distDir, 'index.html');
        if (fs.existsSync(fallbackPath)) {
          return serveStaticFile(req, res, fallbackPath, true);
        }
      }
      return serveNotFound(res);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const etag = `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
    const ifNoneMatch = req.headers['if-none-match'];

    const pathname = new URL(req.url, 'http://localhost').pathname;
    const cacheControl = pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate';

    const headers = {
      ...SECURITY_HEADERS,
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'ETag': etag,
    };

    if (ifNoneMatch && ifNoneMatch === etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }

    if (req.method === 'HEAD') {
      res.writeHead(200, { ...headers, 'Content-Length': stat.size });
      res.end();
      return;
    }

    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(filePath);
    } catch {
      return serveNotFound(res);
    }

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const shouldGzip = stat.size > 1024 &&
      COMPRESSIBLE_TYPES.has(contentType) &&
      acceptEncoding.includes('gzip');

    if (shouldGzip) {
      try {
        const compressed = zlib.gzipSync(fileBuffer);
        headers['Content-Encoding'] = 'gzip';
        headers['Content-Length'] = compressed.length;
        res.writeHead(200, headers);
        res.end(compressed);
        return;
      } catch {
        // Fall back to uncompressed if gzipSync fails
      }
    }

    headers['Content-Length'] = fileBuffer.length;
    res.writeHead(200, headers);
    res.end(fileBuffer);
  };

  const serveNotFound = (res) => {
    const payload = JSON.stringify({ error: 'Not Found' });
    res.writeHead(404, {
      ...SECURITY_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
    });
    res.end(payload);
  };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;

      // Healthcheck probes
      if (pathname === '/healthz' || pathname === '/api/health') {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { ...SECURITY_HEADERS, 'Allow': 'GET, HEAD' });
          res.end();
          return;
        }
        return handleHealth(req, res);
      }

      // Gemini AI proxy
      if (pathname === '/api/formulate') {
        return await handleFormulate(req, res);
      }

      // Block any non-GET/HEAD for static assets
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { ...SECURITY_HEADERS, 'Allow': 'GET, HEAD' });
        res.end();
        return;
      }

      // Prevent directory traversal
      let rawPath = req.url.split('?')[0];
      try {
        rawPath = decodeURIComponent(rawPath);
      } catch {}
      if (rawPath.includes('..') || req.url.includes('..')) {
        res.writeHead(403, { ...SECURITY_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }

      const safeSuffix = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
      const candidatePath = path.join(distDir, safeSuffix);

      // Verify resolved path stays inside distDir
      if (!candidatePath.startsWith(distDir)) {
        res.writeHead(403, { ...SECURITY_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }

      // If file exists, serve it
      if (fs.existsSync(candidatePath) && !fs.statSync(candidatePath).isDirectory()) {
        return serveStaticFile(req, res, candidatePath);
      }

      // If directory contains index.html
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
        const subIndex = path.join(candidatePath, 'index.html');
        if (fs.existsSync(subIndex)) {
          return serveStaticFile(req, res, subIndex);
        }
      }

      // If requesting /api/* that does not exist, return 404
      if (pathname.startsWith('/api/')) {
        return serveNotFound(res);
      }

      // SPA fallback to dist/index.html
      const spaIndex = path.join(distDir, 'index.html');
      if (fs.existsSync(spaIndex)) {
        return serveStaticFile(req, res, spaIndex, true);
      }

      // If dist hasn't been built yet
      res.writeHead(503, {
        ...SECURITY_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
      });
      res.end(JSON.stringify({
        error: 'Application bundle not found. Please run npm run build before starting server.',
      }));
    } catch (err) {
      console.error('[CafePulse] Server error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { ...SECURITY_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
  });

  return server;
}

// Auto-start when executed as the main script
const isMainModule = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('server.js')
);

if (isMainModule && !process.env.VITEST) {
  const PORT = parseInt(process.env.PORT || `${DEFAULT_PORT}`, 10);
  const HOST = process.env.HOST || DEFAULT_HOST;
  const server = createServer();

  server.listen(PORT, HOST, () => {
    console.log(`[CafePulse] Server listening on http://${HOST}:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`[CafePulse] Received ${signal}, closing server...`);
    server.close(() => {
      console.log('[CafePulse] Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
