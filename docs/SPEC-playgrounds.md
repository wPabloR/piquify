# Spec: playgrounds

## Objective

Una persona autenticada crea un playground privado y se convierte en su único
admin. Puede invitar por usuario o aceptar solicitudes hechas con el código del
playground. Pertenecer permite participar, pero no obliga.

## Contract

- `create_playground(name, tagline)` crea grupo, código y membresía admin.
- El emoji se calcula con un hash estable del nombre sobre un catálogo cerrado.
- `invite_to_playground(playground, handle)` crea una invitación pendiente.
- `respond_to_invitation(invitation, accept)` solo la ejecuta la persona invitada.
- `request_playground_access(code)` y `request_playground_access_by_id(playground)` crean una solicitud si no es miembro y avisan al admin.
- La búsqueda autenticada encuentra playgrounds por nombre o descripción y solo
  devuelve id, nombre, emoji, descripción y el estado de acceso del visitante.
  No expone código, admin ni contenido interno.
- `respond_to_join_request(request, accept)` solo la ejecuta el admin.
- Solo puede haber una invitación pendiente y una solicitud pendiente por persona y playground.
- Aceptar cualquiera de las dos concede el acceso y cierra la otra sin notificar un rechazo.
- Nombre: 2–60 caracteres. Descripción: hasta 140. El código es único.

## Threats

IDOR sobre grupos ajenos, invitaciones falsificadas y autoaceptación de
solicitudes. RLS limita la lectura directa a la Data API. Las mutaciones
comprueban al actor en TypeScript.

## Testing

Reglas de admin y miembro en `src/domain/access.ts`. Los rechazos de autorización
también quedan cubiertos por los casos de uso en TypeScript.

## Success criteria

- Quien no es miembro no puede leer el contenido del playground.
- Solo el admin invita, acepta solicitudes y crea piques.
- Aceptar una invitación o solicitud crea exactamente una membresía.
- Rechazar no otorga acceso.
- Un acceso pendiente no aparece como playground propio.
- Un no miembro puede descubrir un playground por nombre o descripción y
  solicitar acceso; no puede leer piques, historial ni código.
