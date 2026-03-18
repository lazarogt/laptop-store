# Deployment Checklist (Netlify + Railway)

## Checklist

- [ ] Push repository to GitHub.
- [ ] Create Railway project and link the repo.
- [ ] Add PostgreSQL in Railway and set required env vars.
- [ ] Trigger Railway deploy.
- [ ] Run migrations (`npx prisma migrate deploy` or `npx drizzle-kit push`).
- [ ] Run seed (`npx tsx server/seed.ts`).
- [ ] Create Netlify site from the same GitHub repo.
- [ ] In Netlify set Base directory = `client`.
- [ ] In Netlify set `VITE_API_BASE` to your backend URL.
- [ ] Trigger Netlify deploy.

## Quick API tests

```bash
curl https://<railway>/api/products
```

```bash
curl -X POST https://<railway>/api/auth/login -H "Content-Type:application/json" -d '{"email":"admin@test.com","password":"password123"}' -c cookie.txt
```
