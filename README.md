# Piquify

Monorepo de porras entre amigos. `npm run dev` arranca web y backend a la vez, igual que en nite: Turbo ejecuta el script `dev` de cada app.

## Apps

- `apps/web` — Next.js en http://localhost:3000
- `apps/backend` — Express (Clean Architecture) en http://localhost:4000
- `packages/contracts` — constantes, tipos y reglas puras del dominio
- `supabase/` — migraciones (`profiles`, `playgrounds`, `playground_members`)

## Desarrollo

Copia las variables de [`.env.example`](.env.example) a `apps/web/.env.local` y `apps/backend/.env`. En el dashboard de Supabase, usa la Project URL y la **publishable key**, y desactiva Confirm email mientras no haya SMTP.

```bash
npm install
npm run dev
```

- Web: http://localhost:3000
- Backend: http://localhost:4000/health
- Sesión: `GET /me` (Bearer JWT)

## Backend (CA)

```text
apps/backend/src/
  bin/            arranque (server.ts)
  config/         composition root (services.ts)
  controllers/    orquesta HTTP → use cases
  entities/       modelo de dominio
  errors/         errores de aplicación
  infra/          Express, Supabase, etc.
  interfaces/     puertos (DAOs, verifiers)
  use-cases/      reglas de negocio
```
