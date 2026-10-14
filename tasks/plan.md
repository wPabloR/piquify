# Plan: historial de movimientos en el perfil

El plan de amigos está cerrado. `/add/[code]`, estadísticas y cara a cara ya
están en el código.

## Objetivo

`/profile` muestra los movimientos inmutables que componen el saldo global.
Cada apunte es entero, con signo, etiqueta y enlace al pique cuando existe.

Spec: `docs/SPEC-ledger.md`.

## Decisiones

- Solo el actor ve sus movimientos. Ni ranking ni perfil ajeno.
- Los últimos 50, del más reciente al más antiguo. Sin paginación en el MVP.
- Las etiquetas viven en el dominio (`ledgerMovementLabel`).
- La página lee por servidor; `GET /api/v1/me/movements` replica la misma lista.

## Siguientes (aprobados, sin empezar)

- Bloque «Te toca» en el inicio: votos pendientes y piques que cierran en 24 h.
