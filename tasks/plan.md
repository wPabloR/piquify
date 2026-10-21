# Plan: URL de Auth y confirmación de correo

El ajuste móvil, la marca y el deploy de `main` desde GitHub ya están en
producción. La app ya pide el correo cuando `signUp` no devuelve sesión y
`/auth/confirm` valida el enlace.

## Objetivo

Los enlaces que genera Supabase Auth abren la app de producción, y una cuenta
nueva no entra hasta confirmar el correo.

Spec: `docs/SPEC-identity.md`.

## Decisiones

- Un solo proyecto Auth, `riukifewvizgdlqtfakn`. No se crea otro.
- Site URL: `https://piquify.vercel.app`.
- Redirect URLs: `https://piquify.vercel.app/**` y `http://localhost:3000/**`.
- «Confirm email» queda encendido.
- La plantilla de confirmación enlaza a
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}`.

## Hecho cuando

El dashboard muestra esas URLs y la confirmación encendida, el enlace del
correo entra en la app, y `GET /api/health` responde 200.
