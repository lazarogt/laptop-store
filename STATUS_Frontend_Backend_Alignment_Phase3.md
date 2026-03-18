# STATUS Frontend/Backend Alignment - Phase 3

## Resumen
Se completó la Fase 3 del backend en `server/` para alinear el contrato que consume `client/` sin modificar frontend.

Estado final: **OK**
- Endpoints Phase 3 implementados y montados.
- Validación Zod + sanitización + SQL parametrizado aplicados.
- Errores normalizados para rutas de Phase 3 con formato `{ "message": "..." }`.
- Tests ejecutados con Jest en JSON: `reports/jest-results-phase3.json`.

## Endpoints implementados

### Órdenes
- `GET /api/orders/my`
  - Auth requerida.
  - Retorna array de órdenes del usuario autenticado.
- `GET /api/orders`
  - Auth + admin requerido.
  - Retorna array global de órdenes.
- `POST /api/orders`
  - Auth requerida.
  - Payload frontend:
    - `items: [{ productId:number, quantity:number, price:string }]`
    - `total: string`
    - `address: { fullName, street, city, zip, country, phone }`
  - Respuesta: objeto orden directo (`id,userId,items,total,address,status,createdAt`).
- `PUT /api/orders/:id/status`
  - Auth + admin requerido.
  - Body: `{ status }`, enum permitido: `pendiente|pagado|enviado|entregado|cancelado`.
- `DELETE /api/orders/:id`
  - Auth + admin requerido.
  - `204` en éxito, `404` si no existe.

### Usuarios (admin)
- `GET /api/users`
  - Auth + admin requerido.
  - Lista usuarios sin campos sensibles (`password/password_hash`).
- `DELETE /api/users/:id`
  - Auth + admin requerido.
  - Bloquea auto-eliminación (`400`).
  - `404` si no existe.

### Admin
- `GET /api/admin/stats`
  - Auth + admin requerido.
  - Respuesta:
    - `totalUsers:number`
    - `totalProducts:number`
    - `totalOrders:number`
    - `totalRevenue:string`

## Cambios técnicos clave
- Integración de rutas en app:
  - `/api/orders` -> `order.routes.ts`
  - `/api/users` -> `user.routes.ts`
  - `/api/admin` -> `admin.routes.ts`
- `ensureOrdersTable` reforzado para compatibilidad:
  - Añade `address JSONB` (si falta).
  - Default de `status` -> `pendiente`.
  - Migración defensiva de registros `created` -> `pendiente`.
- Error handling ajustado para rutas Phase 3:
  - `/api/orders`, `/api/users`, `/api/admin` devuelven `{ message }`.
- Compatibilidad legacy controlada en `POST /api/orders`:
  - Se mantiene soporte para payload histórico de notificaciones (sin romper contrato actual del frontend).

## Validaciones y seguridad
- Validación Zod en body/params.
- Sanitización de strings en schemas/servicios.
- E.164 estricto en `address.phone`.
- Consultas SQL parametrizadas (`$1, $2, ...`).
- `404` explícito para recursos inexistentes en update/delete de órdenes y usuarios.

## Tests ejecutados
Comando ejecutado:

```bash
NODE_ENV=test DB_HOST=localhost DB_PORT=5432 DB_USER=admin DB_PASSWORD=password123 DB_NAME=laptop_store DB_NAME_TEST=laptopdb_test npm test -- --json --outputFile=reports/jest-results-phase3.json
```

Resultado:
- Test Suites: `13 passed, 0 failed`
- Tests: `57 passed, 0 failed`
- Artefacto: `reports/jest-results-phase3.json`

## Archivos creados/actualizados en esta fase
- Creado: `server/src/routes/admin.routes.ts`
- Actualizado: `server/src/app.ts`
- Actualizado: `server/src/middlewares/errorHandler.ts`
- Actualizado: `server/src/middlewares/notFoundHandler.ts`
- Actualizado: `server/src/models/order.model.ts`
- Actualizado: `server/src/routes/order.routes.ts`
- Creado: `server/tests/order.e2e.test.ts`
- Creado: `server/tests/user.e2e.test.ts`
- Creado: `server/tests/admin.e2e.test.ts`
- Actualizado: `server/tests/security.hardening.e2e.test.ts`

## Hallazgos / fallos
- Durante la primera ejecución hubo 3 fallos heredados por cambio de contrato de órdenes.
- Se corrigieron mediante:
  - compatibilidad legacy para payload anterior de `orders.notifications`;
  - ajuste de expectativa de error en test de hardening a `{ message: 'Validation error' }`.
- Re-ejecución final: **sin fallos**.
