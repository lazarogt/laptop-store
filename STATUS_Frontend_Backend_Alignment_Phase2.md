# STATUS Frontend-Backend Alignment - Phase 2 (Products & Reviews)

## Resumen
Se implementó la fase 2 del backend para alinear el contrato que consume `client/` en rutas de productos y reseñas, sin modificar frontend.

- Endpoints nuevos activos bajo `/api/products`.
- Respuestas exitosas en JSON directo (array/objeto, sin `{ success, data }`).
- Errores en rutas de fase 2 devuelven `{ "message": "..." }`.
- Auth por sesión/cookie (compatible con `credentials: "include"`) y fallback de tests en `NODE_ENV=test`.

## Endpoints implementados

### `GET /api/products`
- Query soportada: `category`, `brand`, `minPrice`, `maxPrice`, `sort`, `search`, `page`, `limit`.
- `sort` soportado: `price_asc | price_desc | rating | newest`.
- Respuesta: `Product[]`.

### `GET /api/products/:slug`
- Respuesta: `Product & { reviews: (Review & { user: { name: string } })[] }`.
- 404: `{ "message": "Product not found" }`.

### `POST /api/products` (admin)
- Auth requerida + rol admin.
- Body validado con Zod.
- Respuesta 201: `Product`.

### `PUT /api/products/:id` (admin)
- Auth requerida + rol admin.
- Body parcial validado con Zod.
- Respuesta 200: `Product`.

### `DELETE /api/products/:id` (admin)
- Auth requerida + rol admin.
- Respuesta 204 sin body.

### `GET /api/products/:id/reviews`
- Respuesta: `Review[]` con `user.name`.

### `POST /api/products/:id/reviews` (user autenticado)
- Auth requerida.
- Body: `{ rating: 1..5, comment: string }`.
- Inserta review y actualiza agregados del producto (`averageRating`, `numReviews`).
- Respuesta 201: review creada.
- Bloquea review duplicada por usuario/producto (409).

## Contrato de campos (alineado a frontend)
`Product` retorna campos:
- `id`, `name`, `slug`, `description`, `price` (**string**), `stock`, `images`, `specs`, `category`, `brand`, `averageRating`, `numReviews`, `badges`, `createdAt`, `updatedAt`.

`Review` retorna campos:
- `id`, `userId`, `productId`, `rating`, `comment`, `createdAt`, `user: { name }`.

## Validación y seguridad aplicadas
- Validación/sanitización con Zod en product/review payloads y params/query.
- SQL totalmente parametrizado (`$1, $2, ...`) en capa de servicio.
- Índices creados para catálogo/reviews.
- Prevención de reseñas duplicadas mediante índice único `(user_id, product_id)`.
- Límite claro para payload grande de imágenes: >100kb devuelve 413 con mensaje explícito.

## Archivos creados/actualizados

### Nuevos
- `server/src/services/product.service.ts`
- `server/src/controllers/product.controller.ts`
- `server/src/controllers/review.controller.ts`
- `server/src/routes/product.routes.ts`
- `server/src/validation/product.schema.ts`
- `server/src/validation/review.schema.ts`
- `server/tests/product.e2e.test.ts`
- `server/tests/review.e2e.test.ts`

### Actualizados
- `server/src/app.ts` (montaje de `/api/products`)
- `server/src/index.ts` (ensure de tablas products/reviews en startup)
- `server/src/middlewares/errorHandler.ts` (formato `{message}` para rutas de fase 2 + manejo 413)

## Tests ejecutados

### Phase 2 JSON (requerido)
Archivo: `reports/jest-results-phase2.json`

Resultado:
```json
{
  "success": true,
  "numTotalTestSuites": 2,
  "numPassedTestSuites": 2,
  "numFailedTestSuites": 0,
  "numTotalTests": 12,
  "numPassedTests": 12,
  "numFailedTests": 0,
  "numPendingTests": 0
}
```

### Regresión suite completo
- `npm test` ejecutado luego de fase 2.
- Resultado: **10 suites, 44 tests, 100% pass**.

## Cobertura (fase 2 enfocada)
Fuente: `coverage/coverage-summary.json` tras ejecutar cobertura de `product/review`.

- Total fase 2 scope:
  - Statements: **81.44%**
  - Lines: **81.25%**
  - Functions: **100%**
  - Branches: **50.00%**
- Por archivo:
  - `product.controller.ts`: 100% lines
  - `review.controller.ts`: 83.33% lines
  - `product.routes.ts`: 100% lines
  - `product.service.ts`: 74.62% lines
  - `product.schema.ts`: 95.23% lines
  - `review.schema.ts`: 100% lines

## Hallazgos / pendientes no bloqueantes
- Los endpoints de fase 2 quedan alineados con frontend y sin errores bloqueantes.
- La cobertura de ramas del servicio de productos puede subirse con tests adicionales de casos límite (sort inválido, paths de error DB transitorios, variantes de filtros).

## Comandos ejecutados
```bash
npm run check
DB_HOST=localhost DB_PORT=5432 DB_USER=admin DB_PASSWORD=password123 DB_NAME=laptop_store DB_NAME_TEST=laptopdb_test NODE_ENV=test npm test -- server/tests/product.e2e.test.ts server/tests/review.e2e.test.ts --json --outputFile=reports/jest-results-phase2.json
DB_HOST=localhost DB_PORT=5432 DB_USER=admin DB_PASSWORD=password123 DB_NAME=laptop_store DB_NAME_TEST=laptopdb_test NODE_ENV=test npm test
DB_HOST=localhost DB_PORT=5432 DB_USER=admin DB_PASSWORD=password123 DB_NAME=laptop_store DB_NAME_TEST=laptopdb_test NODE_ENV=test npm test -- server/tests/product.e2e.test.ts server/tests/review.e2e.test.ts --coverage --collectCoverageFrom='server/src/controllers/product.controller.ts' --collectCoverageFrom='server/src/controllers/review.controller.ts' --collectCoverageFrom='server/src/routes/product.routes.ts' --collectCoverageFrom='server/src/services/product.service.ts' --collectCoverageFrom='server/src/validation/product.schema.ts' --collectCoverageFrom='server/src/validation/review.schema.ts' --coverageReporters=text-summary --coverageReporters=json-summary
```
