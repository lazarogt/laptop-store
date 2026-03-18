# Deploy on Railway (Root-based Monorepo)

Deploy this project from repository root, not from `/server`.

- Install: `npm ci`
- Build: `npm run build:railway`
- Start: `npm run start`

Required env vars:
- `NODE_ENV=production`
- `DATABASE_URL=postgres://...`
- `SESSION_SECRET=<long-random-secret>`
- `CLIENT_URL=https://<frontend-domain>`
- `PORT` is provided automatically by Railway.
