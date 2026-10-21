# Tasks

El historial de movimientos y «Te toca» están cerrados. El deploy de `main`
ya lo hace la GitHub App de Vercel. La app ya tiene `/auth/confirm`.

## Task 1: URL de Auth

- [x] En Authentication → URL Configuration del proyecto
  `riukifewvizgdlqtfakn`, Site URL = `https://piquify.vercel.app`.
- [x] Redirect URLs incluyen `https://piquify.vercel.app/**` y
  `http://localhost:3000/**`.

## Task 2: Confirmación de correo

- [x] «Confirm email» encendido en Authentication → Providers → Email.
  `mailer_autoconfirm` está en false.
- [x] La plantilla de confirmación enlaza a
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}`.

## Task 3: Comprobar

- [ ] Un alta nueva no entra hasta abrir el enlace del correo.
- [ ] Ese enlace deja la sesión abierta en https://piquify.vercel.app.
- [ ] `GET /api/health` responde 200.
- [ ] README, `docs/SPEC-identity.md` y MEMORY coinciden con el dashboard.
