# STATUS Frontend-Backend Alignment - Phase 1 (Auth & Session)

## 1) Endpoints implementados

### `GET /api/auth/me`
- Objetivo: devolver el usuario autenticado de la sesión actual.
- Auth: sesión por cookie.
- Respuesta 200:
```json
{ "id": 1, "name": "Test User", "email": "test@example.com", "role": "user" }
```
- Respuesta 401:
```json
{ "message": "Unauthorized" }
```

### `POST /api/auth/login`
- Body requerido:
```json
{ "email": "user@example.com", "password": "password123" }
```
- Validaciones:
  - `email`: formato email válido.
  - `password`: mínimo 6 caracteres.
- Efecto: crea sesión y setea cookie HttpOnly.
- Respuesta 200:
```json
{ "id": 1, "name": "Test User", "email": "user@example.com", "role": "user" }
```
- Errores:
  - 400 validación:
```json
{ "message": "Email must be valid" }
```
  - 401 credenciales inválidas:
```json
{ "message": "Invalid email or password" }
```
  - 429 rate limit auth:
```json
{ "message": "Too many authentication attempts, please try again later." }
```

### `POST /api/auth/register`
- Body requerido:
```json
{ "name": "John Doe", "email": "john@example.com", "password": "password123" }
```
- Validaciones:
  - `name`: mínimo 2.
  - `email`: válido.
  - `password`: mínimo 6.
  - Payload estricto (`role` u otros campos extra son rechazados).
- Seguridad:
  - Nunca permite elevación de rol desde cliente.
  - Rol forzado a `user` en DB.
- Efecto: crea usuario + inicia sesión.
- Respuesta 201:
```json
{ "id": 1, "name": "John Doe", "email": "john@example.com", "role": "user" }
```
- Errores:
  - 400 validación: `{ "message": "..." }`
  - 409 email duplicado:
```json
{ "message": "Email already registered" }
```

### `POST /api/auth/logout`
- Body: no requerido.
- Efecto: destruye sesión y limpia cookie.
- Respuesta 200:
```json
{ "message": "Logged out" }
```

## 2) Shape de request/response exacto esperado por frontend

- Todas las respuestas **exitosas** de Auth se entregan en JSON directo (sin wrapper `{ success, data }`).
- Todos los **errores en rutas `/api/auth/*`** se entregan como:
```json
{ "message": "..." }
```
- Cookie de sesión:
  - `HttpOnly: true`
  - `SameSite: lax`
  - `Secure: true` en producción
  - nombre configurable vía `SESSION_COOKIE_NAME` (default: `laptop_store.sid`)

## 3) Seguridad aplicada en Auth

- Validación y sanitización con Zod (`auth.schema.ts`):
  - `registerSchema` y `loginSchema` estrictos.
- SQL seguro:
  - Queries parametrizadas (`$1, $2, ...`) en lectura/creación de usuarios.
- Sesión:
  - `express-session` + `connect-pg-simple` para persistencia en PostgreSQL.
- CSRF:
  - Middleware activo globalmente; para auth no rompe el flujo estándar del frontend.

## 4) Tests ejecutados

### Ejecución completa (unit + e2e)
Comando:
```bash
DB_HOST=localhost DB_PORT=5432 DB_USER=admin DB_PASSWORD=password123 DB_NAME=laptop_store DB_NAME_TEST=laptopdb_test NODE_ENV=test npm test -- --json --outputFile=reports/jest-results-phase1.json
```

Resultado (`reports/jest-results-phase1.json`):
- `numTotalTestSuites`: 8
- `numPassedTestSuites`: 8
- `numFailedTestSuites`: 0
- `numTotalTests`: 32
- `numPassedTests`: 32
- `numFailedTests`: 0

### Cobertura Auth (objetivo 100%)
Comando:
```bash
DB_HOST=localhost DB_PORT=5432 DB_USER=admin DB_PASSWORD=password123 DB_NAME=laptop_store DB_NAME_TEST=laptopdb_test NODE_ENV=test npm test -- server/tests/auth.e2e.test.ts server/tests/auth.password.service.test.ts --coverage --collectCoverageFrom='server/src/controllers/auth.controller.ts' --collectCoverageFrom='server/src/routes/auth.routes.ts' --collectCoverageFrom='server/src/validation/auth.schema.ts' --collectCoverageFrom='server/src/services/password.service.ts' --coverageReporters=text --coverageReporters=json-summary
```

Resultado (`coverage/coverage-summary.json`):
- Auth Controller: 100%
- Auth Routes: 100%
- Auth Validation: 100%
- Password Service: 100%
- Total Auth Scope: 100%

## 5) Errores pendientes

- No hay errores bloqueantes abiertos para Phase 1 de Auth/Session.
- Observación no bloqueante: endpoints fuera de `/api/auth/*` mantienen el wrapper de error existente (`{ success:false, error:{...} }`) por compatibilidad del backend actual.

## 6) Archivos ajustados en esta fase

- `server/src/controllers/auth.controller.ts`
- `server/src/routes/auth.routes.ts`
- `server/src/validation/auth.schema.ts`
- `server/src/services/password.service.ts`
- `server/src/types/session.d.ts`
- `server/src/models/user.model.ts`
- `server/src/app.ts`
- `server/src/middlewares/authMiddleware.ts`
- `server/src/middlewares/rateLimitMiddleware.ts`
- `server/src/middlewares/errorHandler.ts`
- `server/src/middlewares/contentTypeGuard.ts`
- `server/src/config/env.ts`
- `.env.example`
- `server/tests/auth.e2e.test.ts`
- `server/tests/auth.password.service.test.ts`

