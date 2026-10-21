# Piquify

Piquify es una aplicación de porras privadas entre amigos. Reúne en un solo
sitio las normas, participantes, piques, bote y resolución de resultados.

El MVP usa puntos virtuales. Cada cuenta empieza con 200 puntos. Esos puntos no
son dinero: no hay pagos, custodia ni retirada.

## Flujo principal

1. La persona se registra o inicia sesión. Si un campo falla, se conservan nombre, usuario y correo; la contraseña se vacía.
2. Crea un playground privado. El emoji se calcula del nombre; no se elige a mano.
3. Encuentra otros playgrounds por nombre o descripción. La búsqueda solo muestra nombre, emoji y descripción. Puede pedir acceso desde el resultado, aceptar una invitación o usar el código.
4. El admin publica un pique con opciones fijas. El tipo elige el formato: texto, fecha `AAAA-MM-DD` o entero.
5. Los miembros deciden si participan. Salir dentro del plazo devuelve el stake y permite volver a entrar. Las tendencias por opción no se ven hasta resolver.
6. Al vencer el plazo, el admin propone el resultado.
7. Quienes participan votan durante 48 horas, o hasta que ya no quede ningún voto posible. El silencio cuenta a favor. Se puede rechazar sin sugerir otra opción.
8. El bote se reparte en enteros y el residual queda en el playground. El playground guarda un historial compartido de hechos.

## Stack

- Next.js 16 con App Router, React 19 y TypeScript 6
- Tailwind CSS 4
- Supabase Auth y PostgreSQL (RLS en la Data API)
- Un único despliegue de producción en Vercel

Supabase solo autentica. Lecturas y escrituras de dominio van por Next.js con
`postgres` y el rol `piquify_app`. Los casos de uso viven en `src/application` y
se exponen en `/api/v1`. El alta, el login y la salida siguen en Server Actions
de autenticación. El perfil y los 200 puntos iniciales se crean en TypeScript
en la primera petición autenticada.

## API (`/api/v1`)

La identidad llega por cookie (mismo origen) o `Authorization: Bearer`. El cuerpo
de error es `{ "error": { "code", "message" } }`.

- `GET /api/health` (sin auth: entorno + `SELECT 1`)
- `GET` / `PATCH /me`, `GET /me/movements`, `GET /me/attention`
- `GET` / `POST /playgrounds`
- `GET /playgrounds/:id`, `GET /playgrounds/:id/piques`, `GET /playgrounds/:id/events`
- `POST /playgrounds/:id/invitations`, `POST /playgrounds/:id/piques`, `POST /playgrounds/:id/join-requests`
- `POST /invitations/:id/response`
- `POST /join-requests` (código), `POST /join-requests/:id/response`, `GET /access`
- `POST` / `DELETE /piques/:id/participation`
- `POST /piques/:id/proposal`, `POST /piques/:id/votes`
- `GET /notifications`, `POST /notifications/read`, `GET /search?q=`

## Desarrollo

```bash
npm install
cp .env.example .env.local
npm run dev
```

Rellena `.env.local` con la URL del proyecto, la clave publicable de Supabase y
`DATABASE_URL` del rol `piquify_app` (pooler, solo servidor). La contraseña de
ese rol no va en el repositorio: se asigna a mano con `ALTER ROLE`.
No subas secretos ni uses la clave de servicio en el navegador.

```bash
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

`npm test` son las unitarias. `npm run test:integration` exige `DATABASE_URL`
del rol `piquify_app` (lee `.env.local` si no está en el entorno).

La app queda en `http://localhost:3000`.

El alta pide confirmar el correo. `signUp` no abre sesión hasta que el enlace
de `/auth/confirm` valida el token. La plantilla de confirmación debe apuntar
a `{{ .SiteURL }}/auth/confirm` con `token_hash`, `type=email` y `next`.
Site URL es `https://piquify.vercel.app`. Redirect URLs:
`https://piquify.vercel.app/**` y `http://localhost:3000/**`.
El límite de intentos lo aplica Supabase Auth:
https://supabase.com/dashboard/project/riukifewvizgdlqtfakn/auth/providers

## Producción

Producción: https://piquify.vercel.app

Un solo proyecto en Vercel, `www-pablo/piquify`, enlazado a
`wPabloR/piquify`. Un push a `main` despliega producción. La GitHub App de
Vercel tiene que incluir ese repo; si no, el proyecto puede figurar enlazado
y no recibir el push. Redeploy repite el despliegue actual: no publica un
commit más nuevo de `main`.

Variables de entorno (Production):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL` (rol `piquify_app`, pooler, solo servidor)

Las migraciones de `supabase/migrations` ya están aplicadas en el proyecto
remoto.

Tras el deploy: `GET /api/health` debe devolver 200. El humo mínimo es alta o
login y un pique (crear o participar).

### Rollback

No hay feature flags. Si el deploy falla:

1. Instant Rollback a la deployment anterior en Vercel, o
   `vercel rollback` / redeploy del commit previo.
2. Comprobar `GET /api/health` y el login.
3. No revertir migraciones de Postgres: el esquema actual no tiene down
   script. Un rollback de app deja el esquema como está.

Los logs van a Vercel (`console` JSON de `logEvent`). No hay alertas externas
en el MVP.

## Rutas

- `/login` y `/signup`
- `/` dashboard
- `/playgrounds/new` y `/playgrounds/[id]`
- `/playgrounds/[id]/new` creación de pique, solo el admin
- `/invitations` (Invitaciones y solicitudes), `/notifications`, `/profile` y `/search`

## Documentación

- `AGENTS.md`: reglas estables del producto y de la contribución.
- `MEMORY.md`: estado operativo de corto plazo.
- `docs/`: mapa de capacidades y especificaciones por módulo.
- `tasks/`: plan de implementación y checklist.

## Fuera del MVP

Dinero real, pagos, custodia, chat, notificaciones push, porras públicas, cuotas
dinámicas, mercados complejos, gamificación avanzada, app móvil nativa y
microservicios.
