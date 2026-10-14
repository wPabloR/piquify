# Spec: settlement

## Objective

El admin propone la opción ganadora cuando el pique está cerrado. Los
participantes votan durante 48 horas. Después se reparte el bote en enteros.

## Contract

- El silencio, una vez vencidas las 48 horas, cuenta como voto favorable.
- Si el admin participa, su propuesta es su voto favorable y no vota otra vez.
- Hay mayoría en contra solo cuando los rechazos superan los favorables.
- En ese caso gana la opción más sugerida por quienes rechazan.
- Un empate entre sugerencias produce todas esas opciones como co-ganadoras.
- Si nadie sugiere opción, se mantiene la propuesta del admin.
- Un empate entre favorables y rechazos confirma la propuesta.
- El bote es `stake × participantes`, más los residuales cuyo conjunto de
  participantes coincide exactamente.
- Cada persona que eligió una opción ganadora recibe la división entera.
- El resto queda como residual de ese mismo conjunto.
- Si nadie eligió una opción ganadora, todo el bote pasa al residual.

## Threats

Resolver antes de tiempo, votar sin participar, sugerir una opción de otro pique,
cobrar dos veces y aplicar un residual a personas distintas. La resolución es
idempotente y toma un bloqueo por pique.

## Testing

`decideWinners` y `splitIntegerPot` cubren silencio, mayorías, empates, ausencia
de sugerencias y residual. `sameParticipants` cubre el conjunto exacto.

## Success criteria

- La propuesta no se liquida mientras falte algún voto y no hayan pasado 48 horas.
- Si ya votaron todas las personas que pueden votar, se resuelve al momento.
- Cada participante vota una sola vez. Rechazar puede no incluir sugerencia.
- Cada regla de mayoría y cada reparto entero producen el saldo esperado.
- Repetir la resolución no crea movimientos nuevos.
