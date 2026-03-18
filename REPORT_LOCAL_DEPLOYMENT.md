# Local Deployment Report - laptop-store

Date: 2026-03-10T10:09:36-04:00

## Container status
- `docker compose ps` shows `app` and `db` healthy.
- DB host port mapped to `5433` (port `5432` was already in use by local Postgres).

## API health
- `GET /api/health` -> `200`
- Response:
  - `{"status":"ok","checks":{"server":{"status":"ok"},"db":{"status":"ok"},"migrations":{"status":"ok"}}}`

## API endpoints
- `GET /api/products` -> `200`
- `GET /api/telegram/status` -> `200` (authenticated session via registered admin user)
- `GET /api/orders` -> `200` (authenticated session via registered admin user)

## Migrations
- Applied via `scripts/migrations/20260307_add_telegram_fields.sql`.
- Result: already-applied notices, no errors.

## Fixes applied during local bring-up
- Docker build reliability: added npm retry config in deps and builder stages to avoid network timeouts.
- Runtime environment: copied `.env.production.example` into image and created `/app/server/src/.env` to satisfy `dotenv-safe`.
- Compose env: set `COOKIE_SECURE=false` for local HTTP session cookies; added `VITE_API_URL` to runtime env.
- DB port: changed host mapping to `5433:5432` to avoid conflict with local Postgres.
- Image processing: Dockerfile installs `vips-dev` (libvips) before `npm ci` so Sharp can load native libs on Alpine.

## Image uploads
- Env vars: `UPLOADS_DIR`, `UPLOADS_DIR_TMP`, `UPLOADS_TEMP_DIR`, `IMAGE_MAX_SIZE`, `IMAGE_QUALITY`, `IMAGE_THUMB_QUALITY`, `IMAGE_MAX_FILES`, `MIGRATE_IMAGES=true`.
- Migration script: `node tools/fetch_and_store_images.js` or `npm run migrate:images`.

## Artifacts
- Build logs: `reports/logs/docker-compose-build-app.log`
- Up logs: `reports/logs/docker-compose-up.log`, `reports/logs/docker-compose-up-after-rebuild.log`, `reports/logs/docker-compose-up-after-rebuild-2.log`, `reports/logs/docker-compose-up-after-env.log`
- Container logs: `reports/logs/docker-logs-app.log`, `reports/logs/docker-logs-db.log`
- Migrations log: `reports/logs/migrations.log`
- Health + endpoint responses: `reports/logs/health.json`, `reports/logs/products.json`, `reports/logs/telegram_status.json`, `reports/logs/orders.json`
- Auth session artifacts: `reports/logs/cookies.txt`, `reports/logs/register-admin.json`

## Final status
System is running locally with healthy containers and API endpoints responding as expected. Ready for local testing.
