# Railway Deployment Guide

## 1) Create and link project

1. Open Railway and click **New Project**.
2. Select **Deploy from GitHub**.
3. Choose repository: `laptop-store`.

## 2) Configure service

In the Railway service settings:
- **Root Directory** = `server`
- **Start Command** = `npm run start:server`

## 3) Add database

1. Add a **PostgreSQL** plugin/service in Railway.
2. Copy the generated connection string and set it in your app service as `DATABASE_URL`.

## 4) Set environment variables

Use placeholders like these:

```env
DATABASE_URL=postgres://user:pass@host:5432/laptopdb
SESSION_SECRET=replace-with-a-long-random-secret
NODE_ENV=production
CLIENT_URL=https://<your-netlify-site>.netlify.app
PORT=5000
```

## 5) Run schema migrations

Use the option that matches your project setup:

- Prisma:
  - `npx prisma migrate deploy`
- Drizzle:
  - `npx drizzle-kit push`

## 6) Seed initial data

Run:

```bash
npx tsx server/seed.ts
```
