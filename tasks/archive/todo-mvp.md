# Tasks

## Task 1: Reglas puras

**Description:** Codificar validación, acceso, votación, reparto y conjunto exacto de participantes.

**Acceptance criteria:**
- [x] El silencio y las mayorías siguen la spec de settlement.
- [x] El reparto entero conserva el total del bote.
- [x] El stake se rechaza sin saldo o fuera de plazo.

**Verification:**
- [x] `npx vitest run src/domain`

**Dependencies:** None

**Files likely touched:**
- `src/domain/*.ts`

**Estimated scope:** Medium

## Task 2: Esquema transaccional

**Description:** Crear el esquema privado del MVP y aplicarlo al proyecto Supabase.

**Acceptance criteria:**
- [x] Todas las tablas tienen RLS.
- [x] Las funciones sensibles comprueban el usuario autenticado.
- [x] El ledger no se puede editar.

**Verification:**
- [x] Advisors de seguridad revisados.

**Dependencies:** Task 1

**Files likely touched:**
- `supabase/migrations/20261013150000_mvp.sql`

**Estimated scope:** Medium

## Task 3: Sesión y clientes

**Description:** Conectar Next.js a Supabase con cookies y refresco en el proxy.

**Acceptance criteria:**
- [x] El servidor usa `getClaims()`.
- [x] La clave publicable está separada de cualquier secreto.

**Verification:**
- [x] `npm run typecheck`

**Dependencies:** Task 2

**Files likely touched:**
- `src/lib/supabase/*.ts`
- `src/proxy.ts`
- `.env.example`

**Estimated scope:** Small

## Task 4: Identidad usable

**Description:** Permitir alta, entrada y salida, y mostrar el perfil real.

**Acceptance criteria:**
- [x] Las páginas privadas exigen sesión.
- [x] El perfil y el saldo proceden de la base de datos.

**Verification:**
- [x] Recorrido manual de alta e inicio.

**Dependencies:** Task 3

**Files likely touched:**
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/layout.tsx`

**Estimated scope:** Medium

## Task 5: Playgrounds reales

**Description:** Crear grupos, invitar, solicitar acceso y listarlos.

**Acceptance criteria:**
- [x] Solo los miembros ven un playground.
- [x] Solo el admin gestiona el acceso.

**Verification:**
- [x] Recorrido manual con dos cuentas o inspección SQL de membresías.

**Dependencies:** Task 4

**Files likely touched:**
- `src/app/page.tsx`
- `src/app/playgrounds/`

**Estimated scope:** Medium

## Task 6: Participación

**Description:** Publicar un pique, entrar, cambiar la opción y salir.

**Acceptance criteria:**
- [x] El saldo cambia exactamente por el stake.
- [x] El último abandono cancela.

**Verification:**
- [x] Tests de dominio y recorrido de interfaz.

**Dependencies:** Task 5

**Files likely touched:**
- `src/components/pique-card.tsx`
- `src/components/create-pique-form.tsx`

**Estimated scope:** Medium

## Task 7: Resolución y actividad

**Description:** Proponer, votar, resolver, repartir y mostrar avisos.

**Acceptance criteria:**
- [x] La resolución es idempotente.
- [x] Cada cuenta ve solo sus avisos.

**Verification:**
- [x] Tests de settlement y revisión visual.

**Dependencies:** Task 6

**Files likely touched:**
- `src/app/playgrounds/[id]/page.tsx`
- `src/app/notifications/page.tsx`

**Estimated scope:** Medium

## Task 8: Entrega

**Description:** Añadir logs estructurados, cabeceras, CI y documentación operativa.

**Acceptance criteria:**
- [x] CI ejecuta lint, typecheck, tests y build.
- [x] README explica configuración y límites.

**Verification:**
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`

**Dependencies:** Tasks 1–7

**Files likely touched:**
- `.github/workflows/ci.yml`
- `README.md`
- `MEMORY.md`

**Estimated scope:** Small

## Task 9: Descubrimiento e historial

**Description:** Formularios de acceso claros, búsqueda global segura, destinos de notificación, historial de playground y opciones fijas.

**Acceptance criteria:**
- [x] Login y registro conservan valores no sensibles y marcan el campo.
- [x] La búsqueda solo muestra nombre, emoji y descripción, y permite solicitar acceso.
- [x] Las notificaciones abren invitaciones, playground o pique.
- [x] Los miembros ven un historial inmutable; un no miembro no lo lee.
- [x] Las opciones son fijas y los porcentajes aparecen al resolver.

**Verification:**
- [x] Vitest de presentación y recorrido en navegador el 13 de octubre de 2026.

**Dependencies:** Task 8

**Files likely touched:**
- `src/domain/presentation.ts`
- `src/app/search/page.tsx`
- `supabase/migrations/20261013200000_discovery_history.sql`

**Estimated scope:** Medium

## Checkpoint: Complete

- [x] Todos los criterios de las specs están cubiertos.
- [x] No quedan datos de demostración en las rutas.
- [x] Ciclo de dos cuentas comprobado el 13 de octubre de 2026: emoji automático, opciones por tipo, invitación y solicitud, reentrada, voto único y reparto.
- [x] Descubrimiento, destinos de aviso, historial y opciones fijas comprobados el 13 de octubre de 2026.
