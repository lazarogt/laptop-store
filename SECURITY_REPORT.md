# SECURITY_REPORT

## 1) Resumen ejecutivo
Se aplicó un hardening integral al backend `Node.js/Express 5 + PostgreSQL` en `server/src` con foco en SQL injection, validación/sanitización, CSRF/XSS, rate-limiting, autenticación/autorización y manejo seguro de errores.

Estado final:
- `tsc` sin errores.
- Tests unitarios + e2e en verde (`19/19`).
- Artefactos generados:
  - `reports/jest-results.json` (ejecución inicial con 1 fallo).
  - `reports/jest-results-after-fix.json` (ejecución final, todo OK).

## 2) Cambios de seguridad aplicados

### 2.1 SQL injection
- Se auditó el acceso a datos en modelos (`laptop`, `order`, `user`, `notification`) y se mantuvieron queries parametrizadas (`$1, $2, ...`).
- Se añadió suite de seguridad para simular payloads SQLi en rutas públicas/params:
  - `server/tests/security.hardening.e2e.test.ts`.
- Resultado: el intento SQLi en params/query queda bloqueado por validación y no afecta tablas.

### 2.2 Validación y sanitización de entradas
- `validateMiddleware` reforzado:
  - Parseo con Zod.
  - Sanitización recursiva (`sanitizeUnknown`).
  - Merge seguro sobre `req.body/req.params/req.query` sin reasignar propiedades read-only (Express 5).
- Schemas Zod endurecidos (`.strict()` + coerciones y límites):
  - `server/src/validation/laptop.schema.ts`
  - `server/src/validation/order.schema.ts`
  - `server/src/validation/telegram.schema.ts`
- Sanitización utilitaria central:
  - `server/src/utils/sanitize.ts` (`sanitizeString`, `sanitizeUnknown`) con escaping idempotente para evitar doble-escape.

### 2.3 XSS, CSRF y contenido
- `helmet` activado con CSP y headers defensivos en `server/src/app.ts`.
- CORS más restrictivo:
  - allowlist por `CLIENT_URL` + `http://localhost:5173`.
  - logging de bloqueos por origen no permitido.
- CSRF (double submit cookie para requests cookie-bound):
  - `server/src/middlewares/csrfMiddleware.ts`
  - endpoint `GET /api/csrf-token`
  - validación en métodos mutables cuando corresponde.
- Guard de content-type JSON para mutaciones API:
  - `server/src/middlewares/contentTypeGuard.ts`
- Sanitización de respuestas JSON:
  - `server/src/middlewares/responseSanitizer.ts`

### 2.4 Manejo seguro de errores
- `server/src/middlewares/errorHandler.ts` actualizado para:
  - no exponer internals/stack al cliente,
  - mapear errores comunes de PostgreSQL (`23505`, `23503`, `22P02`, `23502`),
  - mantener forma uniforme: `{ success:false, error:{ message, ... } }`,
  - logging estructurado de eventos 5xx.

### 2.5 Autenticación y autorización
- `server/src/middlewares/authMiddleware.ts` reforzado:
  - soporte Bearer JWT validado,
  - fallback `x-user-id` sólo en `NODE_ENV=test`,
  - `requireAdmin` para operaciones críticas.
- Operaciones críticas protegidas:
  - `POST/PATCH/DELETE /api/laptops` requieren `requireAuth + requireAdmin`.

### 2.6 Fuerza bruta / DoS
- `express-rate-limit` integrado:
  - `apiRateLimiter` global.
  - `authRateLimiter` para endpoints sensibles (`orders`, `telegram/register`, mutaciones de laptops).
- Logging de bloqueos 429 con estructura JSON (`securityLogger`).

### 2.7 Variables sensibles y configuración
- Carga de entorno centralizada con `dotenv-safe` en producción:
  - `server/src/config/env.ts`
  - integrado en `db.ts` e `index.ts`.
- `.env.example` actualizado con variables de seguridad:
  - `JWT_SECRET`, `JWT_EXPIRES_IN`, límites rate-limit.

## 3) Endpoints reforzados
- `POST /api/laptops` -> auth + admin + rate limit + validación strict.
- `PATCH /api/laptops/:id` -> auth + admin + rate limit + validación strict.
- `DELETE /api/laptops/:id` -> auth + admin + rate limit + validación strict.
- `POST /api/orders` -> auth + rate limit + validación strict + CSRF cuando aplica.
- `POST /api/telegram/register` -> auth + rate limit + validación strict.
- `GET /api/csrf-token` -> emisión token CSRF.

## 4) Tests de seguridad añadidos/ajustados

### Nuevos
- `server/tests/security.hardening.e2e.test.ts`
  - SQL injection (params/query)
  - XSS sanitization
  - CSRF enforcement
  - payload malicioso con campos inesperados
  - rate-limit por IP

### Ajustados
- `server/tests/laptops.e2e.test.ts`
  - mutaciones con headers de admin en entorno test.

## 5) Resultado de pruebas

### Ejecución inicial
Comando:
```bash
DB_HOST=localhost DB_PORT=5432 DB_USER=admin DB_PASSWORD=password123 DB_NAME=laptop_store DB_NAME_TEST=laptopdb_test NODE_ENV=test npm test -- --json --outputFile=reports/jest-results.json
```
Resumen:
- Suites: `6` total, `5` passed, `1` failed
- Tests: `19` total, `18` passed, `1` failed
- Fallo detectado:
  - Suite: `server/tests/security.hardening.e2e.test.ts`
  - Test: `sanitizes XSS payloads before storing and returning data`
  - Causa: doble/múltiple escaping (`&amp;amp;...`)

### Corrección aplicada
- Se volvió idempotente el escaping en `sanitizeString` (`server/src/utils/sanitize.ts`) para evitar sobre-escapado en pipelines múltiples de sanitización.

### Ejecución final
Comando:
```bash
DB_HOST=localhost DB_PORT=5432 DB_USER=admin DB_PASSWORD=password123 DB_NAME=laptop_store DB_NAME_TEST=laptopdb_test NODE_ENV=test npm test -- --json --outputFile=reports/jest-results-after-fix.json
```
Resumen:
- Suites: `6` total, `6` passed, `0` failed
- Tests: `19` total, `19` passed, `0` failed

## 6) Archivos principales creados/modificados (seguridad)
- `server/src/app.ts`
- `server/src/config/env.ts`
- `server/src/db.ts`
- `server/src/index.ts`
- `server/src/middlewares/authMiddleware.ts`
- `server/src/middlewares/contentTypeGuard.ts` (nuevo)
- `server/src/middlewares/csrfMiddleware.ts`
- `server/src/middlewares/errorHandler.ts`
- `server/src/middlewares/rateLimitMiddleware.ts`
- `server/src/middlewares/responseSanitizer.ts` (nuevo)
- `server/src/middlewares/validateMiddleware.ts`
- `server/src/models/laptop.model.ts`
- `server/src/models/order.model.ts`
- `server/src/models/user.model.ts`
- `server/src/routes/laptop.routes.ts`
- `server/src/routes/orders.routes.ts`
- `server/src/routes/telegram.routes.ts`
- `server/src/services/authToken.service.ts`
- `server/src/utils/sanitize.ts`
- `server/src/utils/securityLogger.ts`
- `server/src/validation/laptop.schema.ts`
- `server/src/validation/order.schema.ts`
- `server/src/validation/telegram.schema.ts`
- `server/tests/laptops.e2e.test.ts`
- `server/tests/security.hardening.e2e.test.ts` (nuevo)
- `.env.example`
- `package.json`
- `package-lock.json`

## 7) Instrucciones de validación local
1. Configurar variables en `.env` (sin commitear secretos):
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=password123
DB_NAME=laptop_store
DB_NAME_TEST=laptopdb_test
JWT_SECRET=<secret>
```
2. Instalar dependencias:
```bash
npm install
```
3. Ejecutar compilación TS:
```bash
npm run check
```
4. Ejecutar tests (JSON):
```bash
DB_HOST=localhost DB_PORT=5432 DB_USER=admin DB_PASSWORD=password123 DB_NAME=laptop_store DB_NAME_TEST=laptopdb_test NODE_ENV=test npm test -- --json --outputFile=reports/jest-results-after-fix.json
```

## 8) Riesgos residuales / próximos pasos recomendados
- Integrar un WAF/Reverse proxy con reglas específicas (OWASP CRS).
- Añadir rotación obligatoria de `JWT_SECRET` y estrategia de revocación JWT.
- Mover notificaciones a colas asíncronas (para aislar latencia/errores de SMTP/Telegram).
- Añadir SAST/DAST en CI (CodeQL + ZAP baseline).
- Añadir tests de autorización por recurso (ownership/tenant) para pedidos y usuarios.
- Reducir logs en test/dev si se requiere menor ruido operacional.

## 9) Nota sobre PR
No se realizó `push` automático. Para abrir PR manualmente:
```bash
git checkout -b hardening/security-backend
git add .
git commit -m "feat(security): harden express backend against common attacks"
git push -u origin hardening/security-backend
```
