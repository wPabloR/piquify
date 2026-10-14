# AGENTS.md

Guía de trabajo para cualquier agente que contribuya a Piquify.

## Producto

Piquify es una app de porras privadas entre amigos. Cada apuesta (pique) vive en un
`playground`. Los miembros participan de forma opcional en los piques del playground con un
stake fijo y un bote común.

El MVP usa puntos virtuales. Cada cuenta comienza con 200 puntos. No implementar
dinero real, pagos, custodia, KYC ni presentar los puntos como dinero.


## Arquitectura vigente

- Aplicación full-stack con Next.js, React y TypeScript.
- Un único proyecto y un único despliegue de producción en Vercel.
- Usar las capacidades de servidor de Next.js (Server Components, Server Actions
  de autenticación y Route Handlers `/api/v1`) en lugar de crear una API Express
  separada.
- Supabase aporta Auth y las políticas RLS de PostgreSQL. La app no usa
  funciones SQL ni el cliente de datos de Supabase para el dominio.
- Lecturas y escrituras van por Next.js (`postgres` + el rol `piquify_app`) y
  los casos de uso viven en TypeScript.
- El `UnitOfWork` de Postgres se ensambla en `createStores`. El SQL de un
  bounded context vive en su módulo (`postgres-friends.ts` para amigos) y se
  reparte con el resto; no añadir otro dominio grande dentro de
  `postgres-stores.ts`.
- Las búsquedas `LIKE` usan `likeContains` (escape `!`) para que `%` y `_` no
  enumeren filas. El código de playground o de amigo se compara por igualdad.
- La autorización de negocio se valida en el servidor; nunca se confía solo en
  la interfaz.

No añadir microservicios ni otro runtime sin una decisión explícita.

## Reglas del dominio

- Un playground es privado y tiene un único admin, inicialmente su creador.
- Invitaciones y solicitudes de acceso pueden realizarse en cualquier momento.
- Solo el admin crea porras.
- Pertenecer a un playground permite participar, pero nunca obliga.
- Cada porra tiene stake fijo, opciones y fecha límite.
- Entrar y abandonar solo es posible dentro del plazo; abandonar devuelve el
  stake.
- Una porra se cancela únicamente cuando no queda ningún participante.
- El saldo del usuario es global y se registra mediante movimientos inmutables.
- El bote es el stake multiplicado por el número de participantes.
- Si hay varios ganadores, el premio se reparte en enteros.
- El residual queda en el playground y solo puede aplicarse cuando coincide el
  conjunto exacto de participantes que lo generó.
- El admin propone el resultado y votan los participantes durante 48 horas.
- El silencio cuenta como voto favorable.
- Si vence el rechazo, gana la opción más sugerida por quienes rechazaron.
- Un empate entre sugerencias produce co-ganadores.

Estados esperados de una porra:

`draft → open → locked → pending_result → resolved`

Desde `open` puede pasar a `cancelled` si se queda sin participantes.

## Límites del MVP

No implementar todavía:

- dinero real, pagos o custodia;
- chat;
- notificaciones push;
- porras públicas;
- cuotas dinámicas o mercados complejos;
- gamificación avanzada;
- aplicación móvil nativa;
- microservicios.

## Criterios de implementación

- TypeScript estricto; evitar `any` y conversiones inseguras.
- Validar todas las entradas en el límite del servidor.
- Usar enteros para puntos, stakes, botes y movimientos.
- Hacer atómicas las operaciones que modifiquen saldo, participación o reparto.
- Modelar explícitamente permisos, estados y transiciones; no dispersarlos en la
  UI.
- No exponer secretos ni usar credenciales de servicio en código cliente.
- Mantener componentes pequeños y accesibles; preferir Server Components salvo
  que se necesite estado o una API del navegador.
- Cubrir las reglas de dominio y los casos de uso con tests unitarios.
- Añadir tests de integración para autenticación, persistencia y operaciones
  transaccionales críticas.
- Antes de cerrar un cambio, ejecutar lint, typecheck, tests y build disponibles.


## Documentación y memoria

- `README.md` explica el producto y cómo ejecutar el proyecto.
- `MEMORY.md` guarda el contexto operativo de corto plazo.
- Actualizar `MEMORY.md` cuando cambien el objetivo actual, las decisiones
  provisionales, el estado del trabajo o el siguiente paso.
- No convertir `MEMORY.md` en un historial: eliminar información obsoleta.
- Registrar aquí solo convenciones duraderas.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
