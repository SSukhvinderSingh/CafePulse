# CaféPulse — PRD & Architecture: Cloud Run Production Deployment

## 0. Executive Summary & Objective
This specification establishes the production deployment architecture for **CaféPulse** on **Google Cloud Run**.
CaféPulse is a high-performance, real-time café operations simulator and custom beverage formulation app built with React 18 and Vite.

### Target Objectives
1. **Containerized Production Server**: Deliver a lightweight, zero-overhead Node.js production server (`server.js`) that serves Vite's static assets (`dist/`), handles Single Page Application (SPA) fallback routing, serves healthcheck probes, and applies modern caching and compression.
2. **Secure Server-Side Gemini API Proxy (`/api/formulate`)**: Move the Gemini 2.5 Flash API credentials (`GEMINI_API_KEY`) to the server environment (Secret Manager / Cloud Run env vars). Client bundles will never expose private API keys to the browser, while maintaining automatic fallback to the deterministic offline mock engine if the key is unset or upstream calls fail.
3. **Multi-Stage Dockerfile & Buildpack Compatibility**: Provide a hardened, minimal multi-stage Dockerfile (`node:22-alpine`) adhering to Cloud Run container runtime contract (runs as non-root user `node`, binds to `0.0.0.0:$PORT`, respects `PORT=8080`).
4. **Cloud Run Deployment Automation**: Provide deployment commands and helper scripts for both Google Cloud SDK CLI and Google Cloud Shell, supporting direct source deployment (`gcloud run deploy --source .`).
5. **Zero Test Regressions**: Ensure 100% of existing 59 unit tests and Vite build pass with zero regressions.

---

## 1. Clarification & Risk Register

| ID | Clarification / Risk | Context & Analysis | Architectural Decision |
|---|---|---|---|
| **R1** | **Local Tooling Availability** | Host environment lacks `gcloud` and `docker` CLI binaries in `$PATH`. Local developers cannot directly execute `docker build` or `gcloud` in this shell. | Architecture uses **Cloud Run Source-based Deployment** (`gcloud run deploy --source .`) which builds the container remotely using Cloud Build. In addition, `server.js` is built with standard Node.js so it can be 100% verified locally via `npm run build && node server.js`. Helper script `scripts/deploy-cloud-run.sh` provides interactive diagnostics and Cloud Shell instructions. |
| **R2** | **Gemini API Key Security** | The client previously read `import.meta.env.VITE_GEMINI_API_KEY`, which leaks secrets into client-side JS bundles. | Introduce `POST /api/formulate` on `server.js`. The server injects `process.env.GEMINI_API_KEY` into the request to Google Generative Language API. The client does not bundle any secret key. |
| **R3** | **Client Fallback & Offline Resilience** | If `GEMINI_API_KEY` is omitted in Cloud Run, or if the Gemini API has network hiccups or rate limits, the app must not crash. | `/api/formulate` returns `{ error: 'GEMINI_API_KEY not configured', fallback: true }` (503) or upstream error (502). The client (`orderService.js` / `classifier.js`) catches non-200 responses and gracefully switches to `synthOrder()` / `mockClassify()`. |
| **R4** | **Existing Unit Test Compatibility** | `src/test/mock.test.js` tests `craft(QUERY, ctx, { apiKey: '', fetchImpl })` and asserts `expect(fetchImpl).not.toHaveBeenCalled()`. | When `apiKey: ''` is explicitly passed (as in tests), `craft` skips both direct Gemini and server proxy calls, returning mock output immediately. When `apiKey` is undefined and in the browser, `craft` calls `/api/formulate`. All existing tests pass unmodified. |
| **R5** | **Cloud Run Port & Host Contract** | Cloud Run dynamically assigns `PORT` (defaults to 8080) and sends traffic to `0.0.0.0`. Listening on `127.0.0.1` causes container startup health checks to fail. | `server.js` strictly reads `process.env.PORT || 8080` and binds to `0.0.0.0`. |
| **R6** | **Zero Production Dependency Bloat** | Adding heavy web frameworks (Express, Fastify) increases image size, cold start time, and CVE scanning overhead. | Implement `server.js` using Node.js built-in modules (`node:http`, `node:fs`, `node:path`, `node:zlib`, `node:crypto`). Zero additional production dependencies in `package.json`. Alpine production image remains under 50MB. |

---

## 2. Non-Goals & Scope Boundaries

- **Non-Goal 1**: Modifying the internal probabilistic wait time engine, BM25 tokenizer, or BOM pricing algorithms.
- **Non-Goal 2**: Introducing a persistent database (PostgreSQL/Firestore). CaféPulse remains a stateless client-driven application with local storage persistence and server-side AI proxy.
- **Non-Goal 3**: Building a complex multi-route REST/GraphQL API. The server only exposes `/healthz`, `/api/health`, `/api/formulate`, and static file serving with SPA fallback.

---

## 3. System Architecture & Component Design

### 3.1 Architecture Overview

```
                      +------------------------------------------+
                      |         Cloud Run Container              |
                      |   (node:22-alpine, non-root user: node)  |
                      |                                          |
                      |      +----------------------------+      |
[ Browser Client ] ---+----->|  Node Production Server    |      |
                      |      |  (server.js, 0.0.0.0:8080) |      |
                      |      +--------------+-------------+      |
                      |                     |                    |
                      |         +-----------+-----------+        |
                      |         |                       |        |
                      |         v                       v        |
                      |  [ Static Router ]       [ API Router ]  |
                      |   - dist/* assets         - /healthz     |
                      |   - gzip compression      - /api/health  |
                      |   - immutable cache       - /api/formulate
                      |   - SPA fallback                |        |
                      +---------------------------------+--------+
                                                        |
                                                        v
                                          +----------------------------+
                                          | Google Gemini 2.5 Flash API|
                                          | (generativelanguage.       |
                                          |  googleapis.com)           |
                                          | + Header: x-goog-api-key   |
                                          +----------------------------+
```

### 3.2 Production Server (`server.js`) Specification

The server is implemented as an ES module (`"type": "module"`) using standard Node.js APIs.

#### A. Port & Interface Binding
- `const PORT = parseInt(process.env.PORT || '8080', 10);`
- `const HOST = process.env.HOST || '0.0.0.0';`
- On startup, logs: `[CafePulse] Server listening on http://${HOST}:${PORT} (NODE_ENV=${process.env.NODE_ENV})`.

#### B. Healthcheck Endpoints
- **Endpoints**: `GET /healthz` and `GET /api/health`
- **Response**: `200 OK`
- **Headers**: `Content-Type: application/json`, `Cache-Control: no-cache`
- **Payload**:
  ```json
  {
    "status": "ok",
    "uptime": 12.34,
    "timestamp": 1728639000000,
    "geminiConfigured": true
  }
  ```

#### C. Gemini Proxy Endpoint (`POST /api/formulate`)
- **Path**: `/api/formulate`
- **Method**: `POST`
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "prompt": "You are a café barista...",
    "schema": { "type": "OBJECT", "properties": { ... } }
  }
  ```
- **Validation**:
  - If method is not `POST`: `405 Method Not Allowed`.
  - If body is missing `prompt` or `schema`: `400 Bad Request` (`{ error: "Missing required fields: prompt, schema" }`).
  - If `process.env.GEMINI_API_KEY` is empty:
    `503 Service Unavailable`
    ```json
    { "error": "GEMINI_API_KEY not configured on server", "fallback": true }
    ```
- **Upstream Call**:
  - Target URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
  - Headers:
    - `Content-Type: application/json`
    - `x-goog-api-key: ${process.env.GEMINI_API_KEY}`
  - Body:
    ```json
    {
      "contents": [{ "role": "user", "parts": [{ "text": prompt }] }],
      "generationConfig": {
        "responseMimeType": "application/json",
        "responseSchema": schema,
        "temperature": 0.7
      }
    }
    ```
  - Timeout: 6000ms using `AbortController`.
- **Response**:
  - Success: `200 OK` with candidate parsed JSON:
    ```json
    { "data": <parsedObject> }
    ```
  - Upstream Failure / Timeout: `502 Bad Gateway` with:
    ```json
    { "error": "Gemini API request failed", "details": err.message, "fallback": true }
    ```

#### D. Static File Serving & Performance
- **Directory**: `dist/` relative to `server.js`.
- **MIME Types**:
  - `.html`: `text/html; charset=utf-8`
  - `.js`, `.mjs`: `application/javascript; charset=utf-8`
  - `.css`: `text/css; charset=utf-8`
  - `.json`: `application/json; charset=utf-8`
  - `.svg`: `image/svg+xml`
  - `.png`: `image/png`
  - `.jpg`, `.jpeg`: `image/jpeg`
  - `.ico`: `image/x-icon`
  - `.woff2`: `font/woff2`
- **Cache-Control Headers**:
  - Paths matching `/assets/*` (Vite fingerprinted assets): `public, max-age=31536000, immutable`
  - `index.html` and root files: `public, max-age=0, must-revalidate`
- **Security Headers**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Compression**:
  - Compresses responses using `gzip` if request contains `Accept-Encoding: gzip` and file size > 1024 bytes.
- **ETag & 304 Handling**:
  - Generates ETag from file stat `mtimeMs` and `size` (e.g. `W/"${size}-${mtime}"`).
  - If request has `If-None-Match: <etag>`, immediately replies `304 Not Modified`.
- **SPA Fallback Routing**:
  - For any `GET` or `HEAD` request where the file path does not exist in `dist/` and does not start with `/api/` or `/healthz`, serve `dist/index.html` with status `200 OK`.

---

## 4. Containerization Specification

### 4.1 Multi-Stage Dockerfile (`Dockerfile`)

```dockerfile
# ------------------------------------------------------------------------------
# Stage 1: Build Stage
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies with frozen lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy project files and build Vite bundle
COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runner
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# Copy package.json (zero production dependencies needed for server.js)
COPY package.json ./

# Copy compiled assets from builder
COPY --from=builder /app/dist ./dist
COPY server.js ./

# Harden container: switch to non-root user
USER node

# Healthcheck configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

EXPOSE 8080

CMD ["node", "server.js"]
```

### 4.2 `.dockerignore`

```
node_modules
.git
.github
dist
coverage
.agents
.gemini
docs
*.log
.env*
scratch
```

### 4.3 `package.json` Updates
- Add script `"start": "node server.js"`
- Add script `"serve": "node server.js"`
- Add script `"deploy:cloudrun": "bash scripts/deploy-cloud-run.sh"`

---

## 5. Client Integration Specification

### 5.1 `src/engine/orderService.js` Refinement
Modify `craft(query, ctx, options = {})`:
1. If caller explicitly passed `apiKey` (e.g. `options.apiKey !== undefined`):
   - If `apiKey` is truthy: call `callGemini(...)`.
   - If `apiKey === ''`: do not fetch; return `synthOrder(query, ctx)` immediately (preserves AC7 test).
2. If `options.apiKey === undefined`:
   - If `envKey()` is present (`import.meta.env.VITE_GEMINI_API_KEY`): use `callGemini(...)`.
   - Otherwise (standard production browser build):
     Attempt `fetch('/api/formulate', { method: 'POST', ... })`.
     - If response is `ok` and returns `{ data }`: call `validateOrder(data, ctx, r.dietary)`.
     - If fetch throws, or response status is 502/503/fallback: gracefully fall back to `synthOrder(query, ctx)`.

### 5.2 `src/engine/classifier.js` Refinement
Apply the same dual-path logic to feedback sentiment classification:
- If client API key exists, use direct Gemini.
- If in browser and key is unset, attempt proxy `POST /api/formulate`.
- Any error / 503 fallback keeps candidate alert from `mockClassify(...)`.

---

## 6. Cloud Run Deployment Workflow

### 6.1 Direct Source-to-Cloud-Run Deployment
Google Cloud Run automatically triggers Google Cloud Build to execute the multi-stage `Dockerfile`:
```bash
gcloud run deploy cafepulse \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="GEMINI_API_KEY=cafepulse-gemini-key:latest"
```

For rapid testing without Secret Manager:
```bash
gcloud run deploy cafepulse \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,GEMINI_API_KEY=YOUR_GEMINI_KEY"
```

### 6.2 Deployment Helper Script (`scripts/deploy-cloud-run.sh`)
Create an executable shell script that:
1. Validates `gcloud` installation. If missing, guides the user to use Google Cloud Shell.
2. Checks active authenticated account (`gcloud auth list`).
3. Prompts for or reads target Google Cloud Project ID and Region (default `us-central1`).
4. Checks whether `GEMINI_API_KEY` environment variable is exported or prompts to configure Secret Manager.
5. Executes `gcloud run deploy cafepulse --source . ...`.
6. Prints the public service URL and tests `/healthz`.

---

## 7. Acceptance Criteria & Test Matrix (For SA4)

| Test ID | Test Category | Target Component | Acceptance Verification Criteria |
|---|---|---|---|
| **AC-CR1** | **Server Startup & Port Binding** | `server.js` | Server starts via `PORT=8080 node server.js` and successfully responds to HTTP requests on `0.0.0.0:8080`. Respects custom `PORT=3456`. |
| **AC-CR2** | **Healthcheck Verification** | `server.js` | `GET /healthz` and `GET /api/health` return HTTP 200 with `status: "ok"`, `uptime`, and JSON header. |
| **AC-CR3** | **Static Asset Serving** | `server.js` | `GET /` returns `dist/index.html` with `text/html; charset=utf-8` and `max-age=0, must-revalidate`. `GET /assets/*` returns JS/CSS with `immutable` caching. |
| **AC-CR4** | **Compression & ETag** | `server.js` | Request with `Accept-Encoding: gzip` returns `Content-Encoding: gzip`. Request with matching `If-None-Match` returns HTTP 304. |
| **AC-CR5** | **SPA Fallback Routing** | `server.js` | Requests to non-asset URLs (e.g. `/barista`, `/orders/new`) return HTTP 200 and serve `dist/index.html`. |
| **AC-CR6** | **Gemini Proxy Security** | `/api/formulate` | `POST /api/formulate` without server `GEMINI_API_KEY` responds with HTTP 503 and `{ fallback: true }`. Key is never echoed in response headers or payload. |
| **AC-CR7** | **Client Fallback Resilience** | `src/engine/orderService.js` | When proxy returns 503 or network is disconnected, `craft()` transparently returns synthetic order without unhandled rejection. |
| **AC-CR8** | **Container Build Spec** | `Dockerfile`, `.dockerignore` | Multi-stage Dockerfile exists, builds `node:22-alpine`, switches to `USER node`, exposes 8080, and contains healthcheck probe. |
| **AC-CR9** | **Regression Test Integrity** | Full test suite | `npm test` executes all 59 tests with 100% pass rate. `npm run build` succeeds cleanly. |

---

## 8. Implementation Plan for SA3 (Builder)

1. **Task 1: Production Server (`server.js`)**:
   - Create `server.js` in the project root.
   - Implement static file serving from `dist/` with MIME resolution, gzip compression, ETag handling, and SPA fallback.
   - Implement `/healthz` and `/api/health`.
   - Implement `POST /api/formulate` proxying to Gemini 2.5 Flash API with 6s timeout and fallback flags.
2. **Task 2: Engine Integration**:
   - Update `src/engine/orderService.js` and `src/engine/classifier.js` to route through `/api/formulate` when in browser and no local key is specified, with zero impact on existing unit tests.
3. **Task 3: Containerization Artifacts**:
   - Create `Dockerfile` with multi-stage build (`builder` + `runner`).
   - Create `.dockerignore` excluding unnecessary directories.
   - Update `package.json` scripts (`start`, `serve`, `deploy:cloudrun`).
4. **Task 4: Deployment Script & Guide**:
   - Create `scripts/deploy-cloud-run.sh` (chmod +x).
   - Create `docs/DEPLOYMENT_GUIDE.md` detailing Cloud Run commands, Secret Manager setup, and Cloud Shell execution.
5. **Task 5: Server Integration Test Suite**:
   - Add automated test `src/test/server.test.js` verifying healthcheck, static file serving, SPA fallback, and proxy handling.
6. **Task 6: Validation**:
   - Run `npm test` and `npm run build`.
   - Execute local server test on custom port.
