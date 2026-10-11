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
