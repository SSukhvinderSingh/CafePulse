#!/usr/bin/env bash
# ==============================================================================
# CaféPulse — Google Cloud Run Automated Deployment Script
# ==============================================================================
# Deploys CaféPulse container to Google Cloud Run using source-based deployment.
# Source build is executed remotely by Google Cloud Build.
# ==============================================================================

set -euo pipefail

# Ensure gcloud SDK is in PATH if installed in user directory
if [ -d "$HOME/google-cloud-sdk/bin" ]; then
  export PATH="$HOME/google-cloud-sdk/bin:$PATH"
fi

SERVICE_NAME="cafepulse"
DEFAULT_REGION="us-central1"

echo "========================================================"
echo "          CaféPulse Cloud Run Deployment                "
echo "========================================================"

# 1. Check gcloud CLI
if ! command -v gcloud &>/dev/null; then
  echo ""
  echo "❌ Error: 'gcloud' CLI is not found in PATH."
  echo ""
  echo "Recommended options:"
  echo "1. Run from Google Cloud Shell (pre-configured with gcloud & docker):"
  echo "   https://shell.cloud.google.com"
  echo "   git clone <repo-url> && cd <repo> && npm run deploy:cloudrun"
  echo ""
  echo "2. Install Google Cloud SDK locally:"
  echo "   https://cloud.google.com/sdk/docs/install"
  echo "========================================================"
  exit 1
fi

# 2. Check authentication
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || true)
if [ -z "$ACTIVE_ACCOUNT" ]; then
  echo "⚠️ No active gcloud authentication found."
  echo "Logging into Google Cloud..."
  gcloud auth login
fi

echo "✅ Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"

# 3. Determine Project ID
PROJECT_ID="${GCP_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}"
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  read -r -p "Enter Google Cloud Project ID: " PROJECT_ID
  if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: Project ID is required."
    exit 1
  fi
  gcloud config set project "$PROJECT_ID"
fi
echo "✅ Target Project: $PROJECT_ID"

# 4. Determine Region
REGION="${GCP_REGION:-$(gcloud config get-value run/region 2>/dev/null || true)}"
if [ -z "$REGION" ] || [ "$REGION" = "(unset)" ]; then
  REGION="$DEFAULT_REGION"
fi
echo "✅ Target Region: $REGION"

# 5. Check Required APIs
echo "🔍 Checking Cloud Run and Cloud Build APIs..."
gcloud --quiet services enable run.googleapis.com cloudbuild.googleapis.com --project="$PROJECT_ID" >/dev/null 2>&1 || true

# 6. Configure Environment / Secret
DEPLOY_VARS="NODE_ENV=production"
EXTRA_FLAGS=()

if [ -n "${GEMINI_API_KEY:-}" ]; then
  echo "🔑 GEMINI_API_KEY found in environment. Injecting into Cloud Run service..."
  DEPLOY_VARS="${DEPLOY_VARS},GEMINI_API_KEY=${GEMINI_API_KEY}"
else
  # Check if Secret Manager secret exists
  if gcloud --quiet secrets describe cafepulse-gemini-key --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "🔐 Using Secret Manager secret: cafepulse-gemini-key:latest"
    EXTRA_FLAGS+=(--set-secrets="GEMINI_API_KEY=cafepulse-gemini-key:latest")
  else
    echo "ℹ️  GEMINI_API_KEY is not set. CaféPulse will run with offline mock AI engine."
    echo "   (You can add GEMINI_API_KEY later via Cloud Run Console or Secret Manager)"
  fi
fi

# 7. Execute Deployment
echo ""
echo "🚀 Initiating source-based deployment via Cloud Build..."
echo "   Command: gcloud run deploy $SERVICE_NAME --source . --region $REGION --allow-unauthenticated --quiet"
echo ""

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --quiet \
  --set-env-vars "$DEPLOY_VARS" \
  ${EXTRA_FLAGS[@]+"${EXTRA_FLAGS[@]}"}

# 8. Post-deployment Health Verification
echo ""
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)' 2>/dev/null || true)

if [ -n "$SERVICE_URL" ]; then
  echo "========================================================"
  echo "🎉 CaféPulse successfully deployed to Cloud Run!"
  echo "🌐 Service URL: $SERVICE_URL"
  echo ""
  echo "Testing health endpoint ($SERVICE_URL/api/health)..."
  HEALTH_OUTPUT=$(curl -s "$SERVICE_URL/api/health" || true)
  echo "Health probe response: $HEALTH_OUTPUT"
  echo "========================================================"
else
  echo "⚠️ Deployment completed, but unable to retrieve service URL automatically."
fi
