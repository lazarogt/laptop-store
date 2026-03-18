# Deploy Frontend on Netlify

1. In Netlify, click **Add new site** -> **Import an existing project**.
2. Connect GitHub and select your `laptop-store` repository.
3. Set **Base directory** to `client`.
4. Set **Build command** to `npm run build:client`.
5. Set **Publish directory** to `client/dist`.
6. In **Site configuration** -> **Environment variables**, add:
   - `VITE_API_BASE=https://<your-railway-backend>.railway.app`
7. Trigger a new deploy.

## Notes

- Use placeholder values first and replace them after Railway gives you the backend URL.
- If your app calls `/api/*`, keep the redirect in `netlify.toml` updated with your real backend URL.
