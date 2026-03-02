# Deploy en Railway (Monorepo Root)

Usa la raíz del repositorio (`/`) como **Root Directory**.

## Comandos

- Install: `npm ci`
- Build: `npm run build:railway`
- Start: `npm run start`

## Variables mínimas

```env
NODE_ENV=production
DATABASE_URL=postgres://user:pass@host:5432/laptopdb
SESSION_SECRET=replace-with-a-long-random-secret
CLIENT_URL=https://tu-frontend.com
```

## Flujo recomendado

1. Crea el proyecto en Railway y conecta el repo.
2. Configura los comandos de Install/Build/Start anteriores.
3. Agrega las variables mínimas.
4. Ejecuta el deploy.
5. Verifica logs y health del servidor.

## Nota de build

`build:railway` compila frontend + backend y luego ejecuta `npm prune --omit=dev` para dejar solo dependencias de producción en la imagen final.
