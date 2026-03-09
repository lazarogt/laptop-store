# REPORT Codex Run - Notifications + Telegram + Orders (`laptop-store`)

## 1) Resumen ejecutivo
Se implementó en `server/src` el flujo completo de notificaciones (email + Telegram), registro de bot Telegram por usuario autenticado, integración de notificaciones en la creación de pedidos, migración SQL versionada y tests (unit + e2e).

Resultado principal:
- Nuevo servicio `notification.service.ts` con `sendEmail()` y `sendTelegram()` usando `process.env`, retry (1 reintento), timeout para Telegram, y logging estructurado JSON.
- Nuevo endpoint `POST /api/telegram/register` que actualiza `users.telegram_chat_id` y `users.telegram_bot_started=true` para `req.user.id`.
- Flujo `POST /api/orders` ahora envía notificaciones condicionales (usuario/admin, email/telegram) y responde resumen de envíos `sent|failed|skipped`.
- Se agregó migración SQL `scripts/migrations/20260307_add_telegram_fields.sql` (users telegram fields + índices + tablas orders/notifications).
- Se añadieron tests de servicio de notificación y e2e de pedidos/telegram.

## 2) Archivos creados/modificados

### Creados
- `server/src/services/notification.service.ts`: envío SMTP + Telegram API, retry/backoff, timeout, logs JSON, helpers safe.
- `server/src/controllers/telegram.controller.ts`: handler de registro Telegram para usuario autenticado.
- `server/src/controllers/orders.controller.ts`: creación de pedido + dispatch de notificaciones + summary de respuesta.
- `server/src/routes/telegram.routes.ts`: ruta `POST /register`.
- `server/src/routes/orders.routes.ts`: ruta `POST /` para pedidos.
- `server/src/middlewares/authMiddleware.ts`: `attachRequestUser` (header `x-user-id`) y `requireAuth`.
- `server/src/models/user.model.ts`: tabla users + update de telegram.
- `server/src/models/order.model.ts`: tabla orders + create order transaccional.
- `server/src/models/notification.model.ts`: tabla notifications + persist de intentos.
- `server/src/validation/telegram.schema.ts`: schema Zod para `chatId`.
- `server/src/validation/order.schema.ts`: schema Zod para creación de pedidos.
- `scripts/migrations/20260307_add_telegram_fields.sql`: migración SQL solicitada.
- `scripts/runMigrations.ts`: runner de migraciones SQL.
- `server/tests/notification.service.test.ts`: unit tests con mocks de nodemailer/fetch.
- `server/tests/orders.notifications.e2e.test.ts`: e2e de notificaciones condicionales en pedidos.
- `server/tests/telegram.register.e2e.test.ts`: e2e de endpoint telegram register.
- `server/tests/test.setup.ts`: cierre global de pool DB al terminar tests.

### Modificados
- `server/src/app.ts`: monta `/api/orders`, `/api/telegram`, y middleware de usuario autenticado.
- `server/src/index.ts`: asegura tablas `users`, `orders`, `notifications` al arranque.
- `scripts/restoreBackup.ts`: opción `--migrate` para aplicar migraciones tras restore.
- `.env.example`: nuevas variables SMTP/Telegram/admin/DB test.
- `package.json`: script `migrate` agregado.
- `jest.config.cjs`: `setupFilesAfterEnv` para teardown central.
- `server/tests/laptops.e2e.test.ts`: ajuste para teardown global.
- `package-lock.json`: actualización por cambios de scripts/dependencias previas del entorno.

### Backups `.bak` creados antes de sobrescrituras
- `.env.example.bak`
- `REPORT_Codex_RUN.md.bak`
- `jest.config.cjs.bak`
- `scripts/restoreBackup.ts.bak`
- `server/src/app.ts.bak`
- `server/src/index.ts.bak`
- `server/tests/laptops.e2e.test.ts.bak`
- `package.json.bak`

## 3) Snippets clave (<=120 líneas combinadas)

```ts
// server/src/services/notification.service.ts
export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  const host = required(process.env.SMTP_HOST, 'SMTP_HOST');
  const port = Number.parseInt(process.env.SMTP_PORT ?? '587', 10);
  const user = required(process.env.SMTP_USER, 'SMTP_USER');
  const pass = required(process.env.SMTP_PASS, 'SMTP_PASS');
  const from = required(process.env.EMAIL_FROM, 'EMAIL_FROM');

  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await sendWithRetry(2, async () => {
    await transporter.sendMail({ from, to, subject, html });
  });
};

export const sendTelegram = async (chatId: number | string, text: string): Promise<void> => {
  const token = required(process.env.TELEGRAM_BOT_TOKEN, 'TELEGRAM_BOT_TOKEN');
  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  await sendWithRetry(2, async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Telegram HTTP ${response.status}: ${await response.text()}`);
      const payload = (await response.json()) as { ok?: boolean; description?: string };
      if (!payload.ok) throw new Error(`Telegram API error: ${payload.description ?? 'unknown error'}`);
    } finally {
      clearTimeout(timeout);
    }
  });
};

// server/src/controllers/telegram.controller.ts
export const registerTelegramHandler = async (req: Request, res: Response): Promise<void> => {
  const authUserId = req.user?.id;
  if (!authUserId) throw new HttpError(401, 'Authentication required');
  const { chatId } = req.body as { chatId: string };
  const data = await updateTelegramRegistration(authUserId, chatId);
  res.status(200).json({ success: true, data });
};

// server/src/controllers/orders.controller.ts (fragment)
const userEmailResult = await sendEmailSafe({ to: user.email, subject: emailSubject, html: emailHtml, userId, orderId: order.id });
notificationSummary.push({ channel: 'email', target: user.email, status: userEmailResult.status, reason: userEmailResult.error });

if (user.telegram_bot_started && user.telegram_chat_id) {
  const userTelegramResult = await sendTelegramSafe({ chatId: user.telegram_chat_id, text: telegramText, userId, orderId: order.id });
  notificationSummary.push({ channel: 'telegram', target: String(user.telegram_chat_id), status: userTelegramResult.status, reason: userTelegramResult.error });
} else {
  await pushSkipped(notificationSummary, {
    userId,
    orderId: order.id,
    channel: 'telegram',
    target: 'user',
    reason: 'telegram_bot_started=false or telegram_chat_id is null',
  });
}
```

## 4) Comandos exactos para reproducir localmente
```bash
# 1) rol + bases (PostgreSQL local)
psql -U postgres -c "CREATE ROLE admin WITH LOGIN PASSWORD 'password123';"
psql -U postgres -c "ALTER ROLE admin CREATEDB;"
createdb -U admin laptop_store
createdb -U admin laptop_store_test

# 2) instalar dependencias
npm install

# 3) variables de entorno (NO commitear secretos reales)
cp .env.example .env

# 4) restaurar backup y aplicar migraciones
npm run restore -- ./backups/laptop_store.sql --migrate
# o solo migraciones:
npm run migrate

# 5) levantar API
npm run dev

# 6) ejecutar tests
DB_HOST=localhost DB_PORT=5432 DB_USER=admin DB_PASSWORD=password123 DB_NAME=laptop_store DB_NAME_TEST=laptop_store_test npm test
```

### Probar endpoint Telegram con curl (auth mock por header)
```bash
curl -X POST http://localhost:8000/api/telegram/register \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -d '{"chatId":"9988776655"}'
```

### Probar flujo de pedidos con curl
```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -d '{"items":[{"title":"ThinkPad X1","quantity":1,"price":1200}]}'
```

## 5) Resultados de tests ejecutados
Comandos ejecutados:
```bash
npm run check
npm run build:server
DB_HOST=localhost DB_PORT=5432 DB_USER=admin DB_PASSWORD=password123 DB_NAME=laptop_store DB_NAME_TEST=laptop_store_test NODE_ENV=test npm test
```

Resultados:
- `npm run check`: **OK**
- `npm run build:server`: **OK**
- `npm test`: **FAIL parcial por entorno DB**

Logs relevantes exactos de test:
- `PASS server/tests/notification.service.test.ts`
- `FAIL ... error: database "laptop_store_test" does not exist`

Suites reportadas:
- `Test Suites: 3 failed, 1 passed, 4 total`
- `Tests: 9 failed, 2 passed, 11 total`

Causa probable:
- Falta crear la base `laptop_store_test` en el PostgreSQL local de este entorno.

Expected output cuando DB test exista y credenciales coincidan:
```text
PASS server/tests/notification.service.test.ts
PASS server/tests/orders.notifications.e2e.test.ts
PASS server/tests/telegram.register.e2e.test.ts
PASS server/tests/laptops.e2e.test.ts
```

## 6) Riesgos y advertencias
- No se guardaron secretos en código versionado, pero deben configurarse en `.env` local (`SMTP_*`, `TELEGRAM_BOT_TOKEN`).
- Si `TELEGRAM_BOT_TOKEN`/SMTP son inválidos, el pedido se crea igual y notificaciones vuelven `failed/skipped` (comportamiento intencional).
- En este entorno local faltó `laptop_store_test`; por eso fallaron e2e de DB.
- Hay cambios pendientes de fase previa en rama local (backend base), integrados con esta fase.

## 7) TODOs y mejoras recomendadas
- Migraciones versionadas con tabla de historial (`schema_migrations`) en lugar de ejecutar SQL por carpeta sin tracking.
- Cola asíncrona (BullMQ/RabbitMQ/SQS) para notificaciones y reintentos robustos.
- Retry/backoff exponencial con circuit breaker para Telegram/SMTP.
- Plantillas de email (MJML/Handlebars) y i18n.
- Métricas observables (OpenTelemetry/Prometheus) por canal (`sent/failed/skipped`).
- Reemplazar auth mock de `x-user-id` por middleware JWT/session real en producción.

## 8) Metadata JSON
```json
{
  "generated_at": "2026-03-07T18:53:40+00:00",
  "files_created": [
    "server/src/services/notification.service.ts",
    "server/src/controllers/telegram.controller.ts",
    "server/src/controllers/orders.controller.ts",
    "server/src/routes/telegram.routes.ts",
    "server/src/routes/orders.routes.ts",
    "server/src/middlewares/authMiddleware.ts",
    "server/src/models/user.model.ts",
    "server/src/models/order.model.ts",
    "server/src/models/notification.model.ts",
    "server/src/validation/telegram.schema.ts",
    "server/src/validation/order.schema.ts",
    "scripts/migrations/20260307_add_telegram_fields.sql",
    "scripts/runMigrations.ts",
    "server/tests/notification.service.test.ts",
    "server/tests/orders.notifications.e2e.test.ts",
    "server/tests/telegram.register.e2e.test.ts",
    "server/tests/test.setup.ts"
  ],
  "files_modified": [
    "server/src/app.ts",
    "server/src/index.ts",
    "scripts/restoreBackup.ts",
    ".env.example",
    "package.json",
    "jest.config.cjs",
    "server/tests/laptops.e2e.test.ts",
    "package-lock.json",
    "REPORT_Codex_RUN.md"
  ],
  "branch": "codex/notifications-bot"
}
```

## 9) Git (branch/commit/push)
- Rama local creada: `codex/notifications-bot`.
- Commit intentado con mensaje solicitado:
  - `chore: codex add notifications (email+telegram), telegram register endpoint, migrations, tests`
- Estado: **no completado** por falta de `git user.name/user.email` en el entorno.

Comandos para completar commit/push:
```bash
git config --local user.name "Tu Nombre"
git config --local user.email "tu-email@dominio.com"
git commit -m "chore: codex add notifications (email+telegram), telegram register endpoint, migrations, tests"
git push -u origin codex/notifications-bot
```
