# Railway Deployment Guide (Monorepo Root)

This project is deployed from the repository root (`/`) with:
- Build command: `npm run build:railway`
- Start command: `npm run start`

## 1) Create and link project

1. Create a new Railway project.
2. Connect this GitHub repository.
3. Keep **Root Directory** as `/` (repo root).

## 2) Commands (if Railway asks explicitly)

- **Install Command**: `npm ci`
- **Build Command**: `npm run build:railway`
- **Start Command**: `npm run start`

## 3) Required environment variables

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgres://user:pass@host:5432/laptopdb
SESSION_SECRET=replace-with-a-long-random-secret
CLIENT_URL=https://<your-frontend-domain>
```

Notes:
- Railway injects `PORT` automatically. Keep app reading `process.env.PORT`.
- `SESSION_SECRET` is mandatory in production.

## 4) Database setup

1. Add PostgreSQL service/plugin in Railway.
2. Copy the generated connection URL to `DATABASE_URL`.
3. Run schema push/migrations:
   - Drizzle: `npx drizzle-kit push`

## 5) Deploy from CLI

```bash
railway login
railway link
railway up
```

Or deploy latest linked service:

```bash
railway deploy
```

## 6) Verify

1. Check logs: `railway logs --tail`.
2. Open the public Railway URL.
3. Confirm API routes and SPA routes work (backend serves `dist/public`).
