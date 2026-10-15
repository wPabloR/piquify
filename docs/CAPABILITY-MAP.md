# Capability Map: Backend MVP

| Module id | Responsibility | Depends on |
|---|---|---|
| identity | Cuenta, sesión y perfil | — |
| playgrounds | Grupos privados, miembros, invitaciones y solicitudes | identity |
| ledger | Saldo global y movimientos inmutables | identity |
| piques | Creación, opciones y estados de cada pique | playgrounds |
| participation | Entrar, cambiar opción, salir y cargo/devolución del stake | piques, ledger |
| settlement | Propuesta, votación, reparto entero y bote residual | participation |
| notifications | Actividad visible dentro de la web | playgrounds |
| te-toca | Acciones pendientes en el inicio | piques, participation, settlement |

Build order: identity → playgrounds, ledger → piques → participation → settlement → notifications → te-toca

La aplicación Next.js es el único despliegue. Expone `/api/v1` para la web,
Postman y un cliente futuro. El dinero real, los pagos, el chat, las
notificaciones push, la app móvil nativa y los microservicios quedan fuera.

## Comandos

```bash
npm install
npm run dev
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build
```

## Estructura

```text
docs/                 Especificaciones por módulo
src/domain/           Reglas puras y sus tests
src/application/      Casos de uso (sin Next)
src/infrastructure/   Postgres transaccional (lecturas y escrituras)
src/app/api/v1        Route Handlers HTTP
src/app               Páginas y acciones de autenticación
supabase/migrations/  Esquema, RLS y rol piquify_app
```

## Estilo

TypeScript estricto, funciones pequeñas y validación en la frontera. Los puntos
se representan siempre como enteros. Las mutaciones sensibles viven en casos de
uso TypeScript dentro de una transacción Postgres. Los Route Handlers autentican,
validan y delegan.

## Pruebas

- Unitarias con Vitest para reglas puras, permisos, votación y reparto.
- La base de datos impone las mismas reglas mediante constraints y funciones.
- Lint, typecheck, tests y build son la compuerta de cada cambio.

## Boundaries

- Always: validar entradas, autorizar en servidor, usar enteros y mantener RLS.
- Ask first: cambiar el esquema ya publicado o añadir dependencias nuevas.
- Never: exponer `service_role`, guardar secretos, usar `user_metadata` para
  autorización ni saltarse RLS con `SECURITY DEFINER` sin comprobar `auth.uid()`.

## Success criteria

Un grupo autenticado puede crear un playground, incorporar miembros, publicar un
pique, participar, cerrarlo, votar su resultado y ver saldos y actividad
actualizados sin usar datos de demostración.
