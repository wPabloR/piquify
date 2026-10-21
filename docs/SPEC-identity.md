# Spec: identity

## Objective

Una persona puede crear su cuenta, iniciar y cerrar sesión, y obtener un perfil
automático. El perfil muestra nombre y usuario; el correo permanece en Auth.

## Contract

- Alta con correo, contraseña de al menos 8 caracteres, nombre y usuario.
- El usuario solo admite `a-z`, `0-9` y `_`, con longitud de 3 a 24.
- Un fallo de validación o de autenticación conserva nombre, usuario y correo.
  La contraseña se vacía. El error se marca en el campo afectado.
- Un fallo de credenciales no distingue si el correo existe.
- La sesión viaja en cookies `httpOnly` gestionadas por `@supabase/ssr`.
- En Auth, Site URL es `https://piquify.vercel.app`. Las Redirect URLs incluyen
  ese origen y `http://localhost:3000/**` para desarrollo.
- El alta exige confirmar el correo. Sin sesión, la UI pide revisar el correo.
  El enlace abre `/auth/confirm`, que valida `token_hash` y solo entonces entra.
- `src/proxy.ts` refresca la sesión con `getClaims()`; el servidor no confía en
  `getSession()`.
- La primera petición autenticada crea `profiles` y el movimiento inicial del
  ledger en TypeScript.
- El usuario puede cambiar su nombre visible, no su usuario ni su identificador.

## Threats

Suplantación de cookie, fijación de rol mediante `user_metadata` y exposición del
correo. Los roles viven en tablas de aplicación. El perfil público solo contiene
nombre y usuario.

## Testing

Validación de usuario, contraseña y nombre. El alta real se verifica manualmente
contra Supabase porque depende de su servicio de Auth.

## Success criteria

- Una cuenta nueva tiene exactamente un perfil y una sesión verificable.
- Las rutas privadas redirigen a `/login` sin sesión.
- Cerrar sesión elimina el acceso a esas rutas.
- Ningún secreto de servicio aparece en código cliente ni en variables `NEXT_PUBLIC`.
