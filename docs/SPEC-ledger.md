# Spec: ledger

## Objective

Cada cuenta tiene un saldo global de puntos virtuales, calculado como la suma de
movimientos inmutables. El alta entrega 200 puntos.

## Contract

Movimientos: `opening_balance`, `stake_hold`, `stake_refund` y `payout`.
El importe es un entero distinto de cero. No hay actualización ni borrado.
El saldo nunca puede quedar negativo al terminar una transacción.
El marcador de un playground suma solo los movimientos de ese playground.

## Threats

Doble alta de saldo, edición del historial, condición de carrera entre dos
participaciones y lectura del saldo global de otra persona. Hay un único movimiento
inicial por cuenta, el rol de la app no puede actualizar ni borrar el ledger y
las operaciones de saldo toman un bloqueo transaccional por usuario.

## Testing

Enteros, saldo insuficiente y reparto en `src/domain/money.ts`. La inmutabilidad
se impone en la base de datos.

## Success criteria

- Una cuenta nueva tiene saldo 200.
- Dos participaciones simultáneas no pueden gastar el mismo saldo.
- Ningún flujo edita un movimiento existente.
- El usuario ve su saldo global y el historial de movimientos en `/profile`.
- El ranking solo muestra el neto del playground.
