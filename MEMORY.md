# MEMORY.md

Memoria operativa de corto plazo. Debe mantenerse breve y reemplazar el contexto
obsoleto en lugar de acumular un diario.

## Actualizado

15 de octubre de 2026.

## Objetivo actual

Vigilar el primer deploy y conectar GitHub a Vercel.

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

- Producción: https://piquify.vercel.app (`www-pablo/piquify`).
- `GET /api/health` en prod devolvió 200. Alta sin confirmación, playground y
  pique funcionan. Rollback: Instant Rollback en Vercel.
- Auth sigue en `riukifewvizgdlqtfakn`. Conviene poner Site URL y Redirect URLs
  a `https://piquify.vercel.app`.
- Vercel no está conectado a GitHub (falta Login Connection). Los deploys van
  por CLI hasta que se enlace.
- Humo: cuenta `@smokeprod15`, playground `Smoke Prod` código `4576867c`.

## Próximo paso

Conectar el repo GitHub al proyecto Vercel y fijar Site URL en Auth.

## Pendiente de decidir

Nada bloqueante de producto.
