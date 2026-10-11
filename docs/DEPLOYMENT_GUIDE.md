# CaféPulse — Google Cloud Run Production Deployment Guide

This guide walks through deploying CaféPulse to **Google Cloud Run** using source-based deployment (Cloud Build) and zero local container dependencies.

---

## 1. Prerequisites

1. **Google Cloud Account & Project**: An active GCP billing project.
2. **APIs Enabled**:
   - Cloud Run API (`run.googleapis.com`)
   - Cloud Build API (`cloudbuild.googleapis.com`)
   - Secret Manager API (`secretmanager.googleapis.com` - optional for secrets)
3. **Gemini API Key** (optional, recommended): From [Google AI Studio](https://aistudio.google.com). If omitted, CaféPulse runs smoothly using its deterministic offline mock engine.

---

## 2. Option A: Deployment via Google Cloud Shell (Zero Local Installs)

Cloud Shell includes `gcloud`, Node.js, and Docker pre-installed with active Google authentication:

1. Open [Google Cloud Shell](https://shell.cloud.google.com).
2. Clone your CaféPulse repository:
   ```bash
   git clone <YOUR_REPO_URL>
   cd cafepulse
   ```
3. Run the automated deployment script:
   ```bash
   npm run deploy:cloudrun
   ```
4. Follow the interactive prompts to confirm your project ID and region.

---

## 3. Option B: Deployment from Local Terminal via `gcloud`

Ensure the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) is installed and authenticated:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Quick Deploy (One-Liner)

Deploy CaféPulse directly from source (Cloud Build builds the multi-stage Docker container remotely):

```bash
gcloud run deploy cafepulse \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="NODE_ENV=production,GEMINI_API_KEY=YOUR_GEMINI_KEY"
```

---

## 4. Securing Secrets with Google Secret Manager

To prevent storing the `GEMINI_API_KEY` in plain text environment variables:

1. Create the secret in Secret Manager:
   ```bash
   echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create cafepulse-gemini-key \
     --data-file=- \
     --replication-policy="automatic"
   ```

2. Grant the Cloud Run default service account permission to read the secret:
   ```bash
   PROJECT_NUM=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

   gcloud secrets add-iam-policy-binding cafepulse-gemini-key \
     --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. Deploy with secret injection:
   ```bash
   gcloud run deploy cafepulse \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --set-env-vars="NODE_ENV=production" \
     --set-secrets="GEMINI_API_KEY=cafepulse-gemini-key:latest"
   ```

---

## 5. Local Production Verification

You can run and test the production server locally before deploying:

```bash
# 1. Build the production bundle
npm run build

# 2. Run the production Node.js server
npm run serve
# Or: node server.js
```

By default, the server binds to `0.0.0.0:8080`.
Verify endpoints in another terminal:

```bash
# Health probe
curl http://localhost:8080/healthz

# Assets and SPA fallback
curl -I http://localhost:8080/
curl -I http://localhost:8080/barista
```

---

## 6. Healthchecks & Probes

CaféPulse provides two standard HTTP health probes configured in the container runtime:
- `GET /healthz`: Used by container orchestrators, load balancers, and Docker `HEALTHCHECK`.
- `GET /api/health`: Equivalent JSON status endpoint.

Response payload:
```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": 1728639000000,
  "geminiConfigured": true
}
```

---

## 7. Custom Domain Mapping

To map your custom domain (e.g. `cafepulse.yourdomain.com`):

1. In the Google Cloud Console, navigate to **Cloud Run** > **Custom Domains** (or Manage Custom Domains).
2. Click **Add Mapping**, select service `cafepulse`, and input your domain.
3. Update your DNS provider with the DNS records (CNAME or A/AAAA) provided by Cloud Run.
4. Google Cloud automatically provisions and manages an SSL certificate (Let's Encrypt / Google Trust Services).
