# Deploy Backend on Railway

1. Go to Railway and create a new project.
2. Choose **Deploy from GitHub repo** and select `laptop-store`.
3. In your service settings, set:
   - **Root Directory**: `server`
   - **Start Command**: `npm run start:server`
4. Add required environment variables:
   - `DATABASE_URL=postgres://user:pass@host:5432/dbname`
   - `SESSION_SECRET=replace-with-long-random-secret`
   - `NODE_ENV=production`
   - `CLIENT_URL=https://<your-netlify-site>.netlify.app`
5. Deploy the service and verify logs for a successful boot.
