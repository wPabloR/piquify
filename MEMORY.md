# MEMORY.md

Memoria operativa de corto plazo. Debe mantenerse breve y reemplazar el contexto
obsoleto en lugar de acumular un diario.

## Actualizado

21 de octubre de 2026.

## Objetivo actual

Comprobar un alta: el correo abre `/auth/confirm` y deja la sesión abierta.

## Decisiones vigentes

- Un solo proyecto Next.js y un solo despliegue en Vercel.
- Lecturas y mutaciones de dominio en TypeScript. Sin funciones SQL de negocio
  ni lecturas por PostgREST.
- Auth (alta, login, salida) en Server Actions. Cookie o Bearer; `resolveActor`
  unifica la identidad.
- El alta exige confirmar el correo. La sesión empieza en `/auth/confirm`.
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
- `GET /api/health` en prod devolvió 200. Playground y pique funcionan.
  Rollback: Instant Rollback en Vercel.
- Auth (`riukifewvizgdlqtfakn`) exige confirmar el correo. Site URL,
  Redirect URLs y la plantilla de `/auth/confirm` están en el dashboard.
  Este push publica la ruta.
- Vercel (`www-pablo/piquify`) despliega `main` desde Git. Producción incluye
  el ajuste móvil, la marca Mesa y `/favicon.ico`.
- Humo: cuenta `@smokeprod15`, playground `Smoke Prod` código `4576867c`.

## Próximo paso

Comprobar el alta con el enlace del correo cuando el deploy de este push
esté en producción.

## Pendiente de decidir

Nada bloqueante de producto.
