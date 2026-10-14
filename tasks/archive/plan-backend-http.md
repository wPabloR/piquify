# Implementation Plan: Backend HTTP en el monolito

## Overview

Pasar los casos de uso de las funciones SQL a TypeScript y exponerlos como
API HTTP versionada (`/api/v1`) en Route Handlers del mismo proyecto Next.
Cada mutación corre en una transacción Postgres abierta por el servidor, con
el rol `piquify_app`. Sigue habiendo un único despliegue en Vercel.

## Architecture Decisions

- Política del juego en TypeScript (`src/domain` + `src/application`).
- Route Handlers finos en `src/app/api/v1`. Identidad unificada: cookie o Bearer.
- Transacciones con `postgres` y `DATABASE_URL` (solo servidor).
- Postgres conserva constraints, RLS de lectura, ledger inmutable y el alta.
- Las lecturas de página siguen en Server Components con el JWT del actor.
- Auth (alta, login, salida) permanece en Server Actions.

## Task List

### Phase 0
- [x] Task 0: Archivar el plan MVP anterior.

### Phase 1: Foundation
- [ ] Task 1: Rol `piquify_app`, cliente `postgres`, UnitOfWork.
- [ ] Task 2: Cáscara HTTP (actor, errores, `GET /me`).
- [ ] Task 3: Entrar y salir de un pique por API.

### Checkpoint: Foundation
- [ ] Tests, typecheck y build.
- [ ] Entrar/salir con dos cuentas.

### Phase 2: Core pique
- [ ] Task 4: Crear pique.
- [ ] Task 5: Cierre de plazos y resolución.
- [ ] Task 6: Propuesta y voto.

### Checkpoint: Core pique
- [ ] Ciclo completo de un pique por API.

### Phase 3: Access and reads
- [ ] Task 7: Playgrounds e invitaciones.
- [ ] Task 8: Solicitudes y búsqueda.
- [ ] Task 9: Perfil, avisos y GET.

### Phase 4: Cleanup
- [ ] Task 10: Retirar funciones SQL de caso de uso y documentar.

### Checkpoint: Complete
- [ ] Lint, typecheck, tests y build.
- [ ] Ninguna función SQL de caso de uso queda ejecutable.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Pooler y `BEGIN` | Alto | Probar en Task 1; si falla, conexión de sesión |
| Doble gasto | Alto | `FOR UPDATE` dentro de la transacción |
| Tests contra producción | Alto | Integración solo con `DATABASE_URL` local o rama |

## Open Questions

- Si el pooler en modo transacción aguanta el `BEGIN` con el rol de la app.
