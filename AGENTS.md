Objetivo: terminar laptop-store sin mover la estructura general.

Reglas:
- No refactorizar toda la arquitectura.
- No mover carpetas salvo que sea estrictamente necesario.
- Cambiar solo los archivos implicados.
- Mantener compatibilidad con Docker local y el frontend actual.
- Antes de editar, revisar el código existente y usar el criterio mínimo de cambio.
- Verificar que los endpoints sigan funcionando después de cada cambio importante.
- Crear o usar la base de datos de test `laptop_store_test` si falta.
- Ejecutar los tests relevantes y corregir fallos hasta que pasen.

Prioridades:
1. Notificaciones solo por email.
2. Pedidos visibles solo para el usuario autenticado.
3. Dashboard admin con todos los pedidos.
4. Reset de contraseñas desde admin.
5. Subida de imágenes local al servidor + URL externa opcional.
