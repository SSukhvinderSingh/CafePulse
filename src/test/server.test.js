import { describe, it, expect, beforeAll, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { createServer, DEFAULT_PORT, DEFAULT_HOST } from '../../server.js';
import { craft } from '../engine/orderService.js';
import { classify } from '../engine/classifier.js';
import { baseCtx } from './helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../../dist');

const now = 1_700_000_000_000;
const row = (o = {}) => ({ id: 'r' + Math.random(), ts: now, ...o });

/**
 * Simulates an in-memory HTTP request against an http.Server instance.
 * Avoids loopback socket restrictions in sandboxed test environments.
 */
function request(server, { method = 'GET', url = '/', headers = {}, body = null } = {}) {
  return new Promise((resolve) => {
    const req = new Readable({
      read() {
        if (body) {
          this.push(typeof body === 'string' ? body : JSON.stringify(body));
        }
        this.push(null);
      },
    });

    req.url = url;
    req.method = method;
    req.headers = { host: 'localhost', ...headers };

    let statusCode = 200;
    let resHeaders = {};
    const chunks = [];

    const res = {
      headersSent: false,
      writeHead(code, h) {
        statusCode = code;
        resHeaders = { ...resHeaders, ...h };
        this.headersSent = true;
      },
      setHeader(k, v) {
        resHeaders[k] = v;
      },
      getHeader(k) {
        return resHeaders[k];
      },
      write(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        this.headersSent = true;
        const buf = Buffer.concat(chunks);
        resolve({
          status: statusCode,
          headers: {
            get: (k) => {
              const lower = k.toLowerCase();
              for (const [key, val] of Object.entries(resHeaders)) {
                if (key.toLowerCase() === lower) return String(val);
              }
              return null;
            },
            raw: resHeaders,
          },
          text: async () => buf.toString('utf8'),
          json: async () => JSON.parse(buf.toString('utf8')),
          buffer: async () => buf,
        });
      },
    };

    server.emit('request', req, res);
  });
}

describe('Production Server & Cloud Run Specifications (AC-CR1 through AC-CR8)', () => {
  let server;

  beforeAll(() => {
    // Ensure dist/ and sample index.html exist
    if (!fs.existsSync(DIST_DIR)) {
      fs.mkdirSync(DIST_DIR, { recursive: true });
    }
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (!fs.existsSync(indexPath)) {
      fs.writeFileSync(indexPath, '<!DOCTYPE html><html><body>CaféPulse Production</body></html>');
    }

    server = createServer({
      distDir: DIST_DIR,
      geminiApiKey: '', // Unconfigured by default
    });
  });

  it('AC-CR1: creates server with standard defaults (PORT 8080, HOST 0.0.0.0)', () => {
    expect(DEFAULT_PORT).toBe(8080);
    expect(DEFAULT_HOST).toBe('0.0.0.0');
    expect(typeof server.listen).toBe('function');
  });

  it('AC-CR2: responds to /healthz with 200 OK and expected probe payload', async () => {
    const res = await request(server, { url: '/healthz' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('cache-control')).toBe('no-cache');

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.uptime).toBe('number');
    expect(typeof data.timestamp).toBe('number');
    expect(data.geminiConfigured).toBe(false);
  });

  it('AC-CR2: responds to /api/health with identical 200 OK schema', async () => {
    const res = await request(server, { url: '/api/health' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.timestamp).toBe('number');
  });

  it('AC-CR3: serves dist/index.html on root path with correct cache-control and security headers', async () => {
    const res = await request(server, { url: '/' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');

    const text = await res.text();
    expect(text.toLowerCase()).toContain('<!doctype html');
  });

  it('AC-CR3: serves /assets/* with immutable cache header', async () => {
    const assetsDir = path.join(DIST_DIR, 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
    const assetPath = path.join(assetsDir, 'test-app-chunk.js');
    fs.writeFileSync(assetPath, 'console.log("CaféPulse Production Asset");');

    const res = await request(server, { url: '/assets/test-app-chunk.js' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/javascript');
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('etag')).toBeTruthy();
  });

  it('AC-CR4: supports ETag and responds 304 Not Modified when matching If-None-Match', async () => {
    const res1 = await request(server, { url: '/' });
    const etag = res1.headers.get('etag');
    expect(etag).toBeTruthy();

    const res2 = await request(server, {
      url: '/',
      headers: { 'if-none-match': etag },
    });
    expect(res2.status).toBe(304);
  });

  it('AC-CR4: compresses responses with gzip when Accept-Encoding is gzip on compressible assets', async () => {
    const largeAssetPath = path.join(DIST_DIR, 'bundle-large.js');
    const content = '/* CaféPulse */\n'.repeat(150); // > 1024 bytes
    fs.writeFileSync(largeAssetPath, content);

    const res = await request(server, {
      url: '/bundle-large.js',
      headers: { 'accept-encoding': 'gzip, deflate' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-encoding')).toBe('gzip');

    const buf = await res.buffer();
    const decompressed = zlib.gunzipSync(buf).toString('utf8');
    expect(decompressed).toBe(content);

    try { fs.unlinkSync(largeAssetPath); } catch {}
  });

  it('AC-CR5: handles Single Page Application (SPA) fallback for non-existing route paths', async () => {
    const res = await request(server, { url: '/barista/inventory/overview' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');

    const text = await res.text();
    expect(text.toLowerCase()).toContain('<!doctype html');
  });

  it('AC-CR5: returns 404 for non-existent /api/* endpoints', async () => {
    const res = await request(server, { url: '/api/v1/unknown' });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Not Found');
  });

  it('Security: blocks directory traversal attempts with 403 Forbidden', async () => {
    const res = await request(server, { url: '/../../etc/passwd' });
    expect(res.status).toBe(403);
  });

  it('AC-CR6: POST /api/formulate returns 405 on non-POST methods', async () => {
    const res = await request(server, { method: 'GET', url: '/api/formulate' });
    expect(res.status).toBe(405);
  });

  it('AC-CR6: POST /api/formulate returns 400 when body is invalid or missing required fields', async () => {
    const res1 = await request(server, {
      method: 'POST',
      url: '/api/formulate',
      body: 'invalid-json',
    });
    expect(res1.status).toBe(400);

    const res2 = await request(server, {
      method: 'POST',
      url: '/api/formulate',
      body: { prompt: 'only prompt, missing schema' },
    });
    expect(res2.status).toBe(400);
  });

  it('AC-CR6: POST /api/formulate returns 503 fallback when GEMINI_API_KEY is not configured', async () => {
    const res = await request(server, {
      method: 'POST',
      url: '/api/formulate',
      body: {
        prompt: 'Formulate an espresso drink',
        schema: { type: 'OBJECT' },
      },
    });

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.fallback).toBe(true);
    expect(json.error).toContain('GEMINI_API_KEY not configured');
  });

  it('AC-CR6: POST /api/formulate proxies to upstream and returns 200 with parsed data', async () => {
    const mockUpstreamResponse = {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              name: 'Velvet Vanilla Cappuccino',
              description: 'Smooth espresso with airy foam',
              bom: [{ ingredientId: 'espresso-house', qty: 2 }, { ingredientId: 'milk-whole', qty: 150 }],
              baristaSteps: ['Pull double shot', 'Steam whole milk to microfoam', 'Pour velvet finish'],
              prepMinutes: 2.5,
            }),
          }],
        },
      }],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUpstreamResponse,
    });

    const activeServer = createServer({
      distDir: DIST_DIR,
      geminiApiKey: 'TEST_SECRET_KEY_123',
      fetchImpl: mockFetch,
    });

    const res = await request(activeServer, {
      method: 'POST',
      url: '/api/formulate',
      body: {
        prompt: 'Create a cappuccino',
        schema: { type: 'OBJECT' },
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe('Velvet Vanilla Cappuccino');
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0][1].headers['x-goog-api-key']).toBe('TEST_SECRET_KEY_123');
  });

  it('AC-CR6: POST /api/formulate upstream error returns 502 with fallback: true', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    });

    const errorServer = createServer({
      distDir: DIST_DIR,
      geminiApiKey: 'TEST_SECRET_KEY_123',
      fetchImpl: mockFetch,
    });

    const res = await request(errorServer, {
      method: 'POST',
      url: '/api/formulate',
      body: {
        prompt: 'Create a cappuccino',
        schema: { type: 'OBJECT' },
      },
    });

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.fallback).toBe(true);
    expect(json.error).toBe('Gemini API upstream error');
  });

  it('AC-CR7: client orderService craft() falls back seamlessly when /api/formulate returns 503 or error', async () => {
    const failingFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ fallback: true }),
    });

    const ctx = baseCtx();
    const order = await craft('iced vanilla oat latte', ctx, { fetchImpl: failingFetch });
    expect(order).toBeTruthy();
    expect(order.source).toBe('mock');
    expect(order.name).toBeTruthy();
  });

  it('AC-CR7: client classifier classify() falls back seamlessly when /api/formulate fails', async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
    const r = row({ noise: 1 });
    const alerts = await classify(r, [r], now, { fetchImpl: failingFetch });
    expect(Array.isArray(alerts)).toBe(true);
    if (alerts.length > 0) {
      expect(alerts[0].source).not.toBe('gemini');
    }
  });

  it('AC-CR7: client orderService craft() accepts valid /api/formulate response', async () => {
    const validData = {
      name: 'Matcha Blossom',
      description: 'Bright matcha with floral notes',
      bom: [{ ingredientId: 'espresso-house', qty: 2 }, { ingredientId: 'milk-oat', qty: 200 }],
      baristaSteps: ['Step 1', 'Step 2', 'Step 3'],
      prepMinutes: 3,
    };

    const successfulFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: validData }),
    });

    const ctx = baseCtx();
    const order = await craft('matcha blossom', ctx, { fetchImpl: successfulFetch });
    expect(order.source).toBe('gemini');
    expect(order.name).toBe('Matcha Blossom');
  });
});
