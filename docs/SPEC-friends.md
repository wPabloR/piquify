# Spec: friends

## Objective

Cada persona tiene un código personal único para que otras la añadan como amiga.
La amistad es mutua: una solicitud pendiente solo se convierte en amistad cuando
la otra persona la acepta. Tener amigos permite invitarlos a un playground desde
una lista en lugar de escribir su usuario.

## Contract

- `profiles.friend_code`: 8 caracteres del alfabeto Crockford base32
  (`0-9`, `A-Z` sin `I`, `L`, `O`, `U`), único y no editable. Se genera al crear
  el perfil.
- Al introducir un código se ignoran mayúsculas, espacios y guiones.
- `sendFriendRequest(code | handle)` crea una solicitud pendiente y avisa a la
  persona destinataria.
  - No se puede enviar a uno mismo (`INVALID_INPUT`).
  - Si ya son amigos: `ALREADY_FRIENDS`.
  - Si ya hay una solicitud pendiente del actor: `FRIEND_REQUEST_EXISTS`.
  - Si la otra persona ya había enviado una solicitud pendiente, se acepta y
    ambas quedan como amigas.
- `respondToFriendRequest(request, accept)` solo lo ejecuta la persona
  destinataria de una solicitud pendiente. Aceptar avisa a quien la envió;
  rechazar no avisa.
- Solo puede existir una relación por par de personas, sin importar quién la
  envió. Rechazar libera el par para una solicitud futura.
- La búsqueda de personas exige al menos 2 caracteres. Encuentra por usuario,
  nombre visible o código exacto. Devuelve solo id, nombre, usuario y la
  relación con el actor; nunca el código ni el correo.
- Invitar a un amigo usa el mismo caso de uso `invitePerson`; la lista solo
  ofrece amigos que no son miembros ni tienen invitación pendiente.

## Threats

Enumeración de usuarios mediante la búsqueda (limitada a 20 resultados y a
campos públicos), aceptación de solicitudes ajenas (la respuesta comprueba al
destinatario) y spam de solicitudes (una pendiente por par).

## Testing

Normalización y generación del código en `src/domain/friends.ts`. Casos de uso
con un `UnitOfWork` en memoria: enviar, duplicar, autoenvío, aceptación cruzada
y respuesta por una persona ajena.

## Success criteria

- Cada perfil, nuevo o existente, tiene un código único visible en `/profile`.
- Dos personas solo son amigas después de que una acepte la solicitud de la otra.
- Desde la lupa se encuentra a una persona y se le envía una solicitud.
- El admin de un playground invita a un amigo con un clic.
