FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package-lock.json ./client/
RUN npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-retries 5 \
 && npm ci \
 && npm --prefix client ci

FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY . .
RUN NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_RETRIES=5 \
    npm run build

FROM node:20-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Debian slim keeps libvips/sharp stable vs Alpine/musl.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    libvips-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    ca-certificates \
    curl \
    postgresql-client \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Rebuild sharp against the runtime libvips.
RUN npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-retries 5 \
 && npm ci --omit=dev --unsafe-perm \
 && npm rebuild --unsafe-perm sharp \
 && npm cache clean --force
COPY .env.production.example ./.env.production.example
RUN mkdir -p /app/server/src && touch /app/server/src/.env
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts/migrations ./scripts/migrations
COPY --from=builder /app/scripts/seed ./scripts/seed
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh && chown -R node:node /app
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD curl -fsS "http://localhost:${PORT:-5000}/api/health" || exit 1
ENTRYPOINT ["./docker/entrypoint.sh"]
