# Spec: piques

## Objective

El admin publica un pique con pregunta, reglas opcionales, tipo, stake fijo, al
menos dos opciones y una fecha límite.

## Contract

Estados: `draft → open → locked → pending_result → resolved`.
Desde `open`, pasa a `cancelled` si vence sin participantes o si el último
participante lo abandona. Esta versión publica directamente en `open`.

- Pregunta: 4–180 caracteres.
- Opciones: 2–12, únicas sin distinguir mayúsculas, de 1–80 caracteres.
- `options` admite texto. `date` solo admite `YYYY-MM-DD` reales. `number` solo admite enteros, también negativos, guardados sin ceros a la izquierda.
- Stake: entero entre 1 y 100.000.
- El cierre debe estar en el futuro.
- Las opciones las fija el admin al publicar. Nadie puede añadir más después.
- El porcentaje de cada opción solo se muestra cuando el pique está resuelto.
- `sync_piques()` cierra los piques vencidos. Sin participantes, los cancela.

## Threats

Creación por un miembro normal, fechas ya vencidas, opciones duplicadas y cambios
de estado fuera de la máquina definida.

## Testing

Validación de la entrada y transiciones puras. La transición temporal se ejecuta
en `sync_piques()`.

## Success criteria

- Solo el admin publica piques en su playground.
- Un pique abierto y vencido queda cerrado o cancelado al sincronizar.
- La interfaz muestra abiertos, cerrados, en votación, resueltos y todos.
