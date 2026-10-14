# Tasks

Plan de implementación del backend HTTP en el monolito. El MVP anterior está en `tasks/archive/`.

## Task 0: Archivar el plan anterior

**Description:** Conservar el plan y el checklist del MVP de puntos.

**Acceptance criteria:**
- [x] `tasks/archive/plan-mvp.md` y `tasks/archive/todo-mvp.md` existen.
- [x] `tasks/plan.md` y `tasks/todo.md` describen el backend HTTP.

**Verification:**
- [x] Archivos en `tasks/archive/` y plan nuevo.

**Dependencies:** None

**Estimated scope:** Small

## Task 1: Cimientos de base de datos

**Description:** Rol `piquify_app`, cliente `postgres` y UnitOfWork transaccional.

**Acceptance criteria:**
- [x] `DATABASE_URL` documentada y leída solo en servidor.
- [x] Un test de integración se salta si no hay `DATABASE_URL`.

**Verification:**
- [ ] `npm test`
- [ ] `npm run test:integration` (si hay URL)

**Dependencies:** Task 0

**Estimated scope:** Medium

## Task 2: Cáscara HTTP

**Description:** Actor por cookie o Bearer, mapa de errores y `GET /api/v1/me`.

**Acceptance criteria:**
- [x] El proxy no redirige `/api` a `/login`.
- [x] Tests del mapa de errores y del origen.

**Verification:**
- [ ] `npx vitest run src/app/api`

**Dependencies:** Task 1

**Estimated scope:** Medium

## Task 3: Participación

**Description:** `joinPique` y `leavePique` por API. La tarjeta deja de usar Server Actions.

**Acceptance criteria:**
- [x] POST y DELETE `/piques/:id/participation`.
- [x] Test de dos entradas simultáneas si hay base.

**Verification:**
- [ ] `npx vitest run src/application`

**Dependencies:** Task 2

**Estimated scope:** Medium

## Task 4: Crear pique

**Description:** `createPique` y `POST /playgrounds/:id/piques`.

**Acceptance criteria:**
- [x] Opciones canónicas en el dominio.
- [x] El formulario publica por fetch.

**Verification:**
- [ ] Tests de dominio y de caso de uso.

**Dependencies:** Task 3

**Estimated scope:** Medium

## Task 5: Cierre y resolución

**Description:** `syncDuePiques` y `settlePique` en TypeScript.

**Acceptance criteria:**
- [x] `getViewer` ya no llama a `sync_piques`.
- [x] El residual usa la misma clave SHA-256 que los datos existentes.

**Verification:**
- [ ] Tests de settlement y de sync.

**Dependencies:** Task 4

**Estimated scope:** Medium

## Task 6: Propuesta y voto

**Description:** `proposeResult` y `voteResult`. El voto dispara `settlePique`.

**Acceptance criteria:**
- [x] POST `/piques/:id/proposal` y `/votes`.
- [x] La tarjeta vota por fetch.

**Verification:**
- [ ] Tests de casos de uso.

**Dependencies:** Task 5

**Estimated scope:** Medium

## Task 7: Playgrounds e invitaciones

**Description:** Crear playground, invitar y responder invitaciones por API.

**Acceptance criteria:**
- [x] Formularios vía fetch.
- [x] Funciones SQL equivalentes retiradas en la migración final.

**Verification:**
- [ ] Tests de casos de uso.

**Dependencies:** Task 6

**Estimated scope:** Medium

## Task 8: Solicitudes y búsqueda

**Description:** Pedir acceso por código o id, responder solicitudes, buscar playgrounds.

**Acceptance criteria:**
- [x] Búsqueda en TypeScript con el mismo recorte de campos.

**Verification:**
- [ ] Tests de casos de uso.

**Dependencies:** Task 7

**Estimated scope:** Medium

## Task 9: Perfil, avisos y lecturas

**Description:** PATCH `/me`, marcar avisos y GET autenticados.

**Acceptance criteria:**
- [x] GET reutiliza las consultas con el cliente del actor.

**Verification:**
- [ ] Typecheck.

**Dependencies:** Task 8

**Estimated scope:** Medium

## Task 10: Limpieza y documentación

**Description:** Retirar funciones SQL de caso de uso, mover auth y actualizar docs.

**Acceptance criteria:**
- [x] No queda `execute` de mutaciones de negocio para `authenticated`.
- [x] README lista `/api/v1`.

**Verification:**
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`

**Dependencies:** Tasks 1–9

**Estimated scope:** Medium
