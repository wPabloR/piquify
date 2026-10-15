# MEMORY.md

Memoria operativa de corto plazo. Debe mantenerse breve y reemplazar el contexto
obsoleto en lugar de acumular un diario.

## Actualizado

15 de octubre de 2026.

## Objetivo actual

Primer deploy a producción en Vercel.

## Decisiones vigentes

- Un solo proyecto Next.js y un solo despliegue en Vercel.
- Lecturas y mutaciones de dominio en TypeScript. Sin funciones SQL de negocio
  ni lecturas por PostgREST.
- Auth (alta, login, salida) en Server Actions. Cookie o Bearer; `resolveActor`
  unifica la identidad.
- El alta entra sin confirmar el correo.
- `DATABASE_URL` es la conexión de `piquify_app`, solo servidor. No hay clave
  de servicio en el cliente.
- El perfil, el código de amigo y los 200 puntos se crean con `ensureAccount`.
- Unirse a un playground por código sigue en `POST /api/v1/join-requests`. La
  UI de ese flujo está en la búsqueda, no en Invitaciones. La lupa también
  resuelve el `public_code` exacto.
- El SQL de amigos está en `postgres-friends.ts`; `createStores` lo ensambla.
- El historial de movimientos es solo del actor, últimos 50, sin paginación.
- «Te toca» es voto pendiente, propuesta del admin en `locked` y piques
  `open` que cierran en 24 h. Tope 10. Sin marcar leído.

## Estado

- El mapa de capacidades del MVP está implementado, incluido «Te toca».
- E2E local (cuenta Nuria): playground, pique, entrar, lock, proponer y
  liquidar funcionan. «Te toca» muestra `closing` y `propose`; desaparece al
  resolver. `GET /me/attention` coincide con `/`.
- No se probó voto de un segundo participante (una sola sesión).
- El overlay de hidratación era `data-cursor-ref` del navegador de Cursor, no
  un bug de la app.
- CI levanta Postgres 16 y corre `test:integration` con el rol `piquify_app`
  sin UPDATE. `npm test` ya no incluye esos tests.
- `GET /api/health` comprueba entorno y `SELECT 1`.
- Quedó el playground `E2E Cierre MVP` (código `4826895a`) en la cuenta de
  Nuria.

## Próximo paso

Desplegar a Vercel y comprobar health + login.

## Pendiente de decidir

Nada bloqueante para el primer deploy.
