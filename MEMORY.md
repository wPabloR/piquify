# MEMORY.md

Memoria operativa de corto plazo. Debe mantenerse breve y reemplazar el contexto
obsoleto en lugar de acumular un diario.

## Actualizado

14 de octubre de 2026.

## Objetivo actual

Historial de movimientos de puntos en `/profile`.

## Decisiones vigentes

- Un solo proyecto Next.js y un solo despliegue en Vercel.
- Lecturas y mutaciones de dominio en TypeScript. Sin funciones SQL de negocio
  ni lecturas por PostgREST.
- Auth (alta, login, salida) en Server Actions. Cookie o Bearer; `resolveActor`
  unifica la identidad.
- `DATABASE_URL` es la conexión de `piquify_app`, solo servidor. No hay clave
  de servicio en el cliente.
- El perfil, el código de amigo y los 200 puntos se crean con `ensureAccount`.
- Unirse a un playground por código sigue en `POST /api/v1/join-requests`. La
  UI de ese flujo está en la búsqueda, no en Invitaciones.
- El historial de movimientos es solo del actor, últimos 50, sin paginación.

## Estado

- Amigos cerrado: código, solicitudes, lupa unificada y `/add/CODIGO`.
- Movimientos: consulta, `GET /me/movements` y sección en perfil.

## Próximo paso

Comprobar en local `/profile` (saldo, movimientos y código) y la lupa.
Siguiente funcionalidad: bloque «Te toca» en el inicio.

## Pendiente de decidir

- Si el alta debe entrar sin confirmar el correo.
