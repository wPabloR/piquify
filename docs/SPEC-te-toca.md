# Spec: te-toca

## Objective

Quien abre el inicio ve, de un vistazo, las acciones que todavía puede hacer:
votar un resultado pendiente, proponer el resultado si es admin de un pique
`locked`, o entrar/cambiar en un pique que cierra en menos de 24 horas. El
bloque se llama «Te toca». No sustituye notificaciones ni Invitaciones.

Usuario: cualquier cuenta con sesión, miembro de al menos un playground.
Éxito: si hay un voto, una propuesta o un cierre cercano que le corresponde,
aparece en `/` y el enlace abre el pique en su playground.

## Tech Stack

El de la app: Next.js App Router, TypeScript, consulta por `postgres` en el
servidor. Sin tablas nuevas ni funciones SQL de negocio.

## Commands

```
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

## Project Structure

```
docs/SPEC-te-toca.md          esta spec
src/domain/attention.ts       clasificación y orden de ítems
src/infrastructure/queries.ts lectura del actor
src/app/page.tsx              bloque en el inicio
src/app/api/v1/me/attention   misma lista para clientes HTTP
```

## Code Style

Ítems tipados y fechas `Date`. La regla de inclusión vive en el dominio; la
query solo carga piques de playgrounds donde el actor es miembro.

`canVote` reutiliza `canCastVote`. `canPropose` es admin + estado `locked`.

## Contract

- Solo el actor ve sus ítems. Ni ranking ni lista ajena.
- Tres clases:
  - `vote`: pique en `pending_result` en el que `canCastVote` es ok.
  - `propose`: pique `locked` cuyo admin es el actor.
  - `closing`: pique `open` de un playground del actor cuyo `closesAt` está
    en `(now, now + 24h]`. Incluye quien ya participa (cambiar) y quien no
    (entrar).
- Un pique aparece como mucho una vez. Las clases no se solapan: estados
  distintos.
- Orden: `vote` por `votingEndsAt` ascendente; `propose` por `closesAt`
  ascendente (los más antiguos primero); `closing` por `closesAt` ascendente.
  Empate: id del pique.
- Tope: 10 ítems. Prioridad `vote`, luego `propose`, luego `closing`.
- Cada ítem expone: `kind`, `piqueId`, `playgroundId`, pregunta, nombre del
  playground, etiqueta de plazo e `href` a `/playgrounds/:id#pique-:piqueId`.
- La página `/` lee en el servidor. `GET /api/v1/me/attention` replica la
  misma lista (array JSON, como `/me/movements`).
- Si no hay ítems, el bloque no se renderiza. El saludo y el resto del
  inicio no cambian de significado.
- La consulta corre después de `syncDuePiques`, para no mostrar un `open`
  ya vencido.
- Reloj: `now` del servidor. Etiquetas de tiempo en `Europe/Madrid`.
- No hay “marcar como hecho”: el ítem desaparece cuando ya no aplica.

## Threats

Leer piques de un playground ajeno (la query exige membresía). Tratar el
silencio del settlement como “ya votó”. Inventar un estado de lectura
distinto de notificaciones. Mostrar `propose` a un miembro que no es admin.

## Testing Strategy

- Dominio: inclusión de `vote` / `propose` / `closing`; exclusión de no
  miembros, proposer, ya votado, ventana cerrada, `open` a más de 24 h,
  `locked` de no admin, `resolved`; orden y tope de 10.
- Lint, typecheck, tests y build antes de cerrar.

## Boundaries

- Always: autorizar con el actor; reutilizar `canCastVote` y `canPropose`;
  no exponer piques de otros grupos.
- Ask first: añadir otra clase (invitaciones, amistad); cambiar el tope o
  la ventana de 24 h; nueva tabla.
- Never: push o correo; marcar leído como en notificaciones; dinero real;
  mostrar tendencias de un pique `open`.

## Success Criteria

- Un participante con voto pendiente ve ese pique en «Te toca».
- Quien propuso el resultado no ve ítem `vote` de ese pique.
- El admin ve un pique `locked` como `propose`; un miembro no.
- Un miembro ve un pique `open` que cierra en 24 h, haya jugado o no.
- Un pique `open` que cierra en 25 h no aparece.
- Otra cuenta no ve los ítems de la primera.
- Sin ítems, `/` no muestra el bloque.
- `GET /api/v1/me/attention` y el inicio listan lo mismo.

## Open Questions

Ninguna.
