# Spec: participation

## Objective

Un miembro decide voluntariamente entrar en un pique abierto, puede cambiar su
opción durante el plazo y puede salir recuperando el stake.

## Contract

- Entrar exige membresía, estado `open`, fecha no vencida y saldo suficiente.
- El cargo es un `stake_hold` negativo e igual para todos.
- Cambiar de opción no genera otro cargo.
- Salir exige seguir dentro del plazo y crea un `stake_refund`.
- Si sale la última persona, el pique queda `cancelled`.
- Una persona no puede tener dos participaciones simultáneas.
- Puede salir y volver a entrar mientras el pique siga abierto; cada entrada retiene el stake y cada salida lo devuelve.

## Threats

Cargo duplicado, devolución sin cargo, participación fuera de plazo y carrera
entre entrar y salir. La fila del pique y el saldo del usuario se bloquean dentro
de una transacción.

## Testing

`canJoin` cubre miembro, plazo, saldo y cambio de opción. La atomicidad la
garantiza `joinPique` dentro de una transacción.

## Success criteria

- El saldo baja exactamente el stake al entrar y vuelve a subir al salir.
- No se puede entrar o salir con el plazo vencido.
- El último abandono cancela el pique y no deja participantes.
