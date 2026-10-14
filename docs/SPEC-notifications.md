# Spec: notifications

## Objective

Las personas ven dentro de la web la actividad que les afecta. No hay push ni
correo transaccional en esta versión.

## Contract

Cada invitación, solicitud, alta, pique, participación, propuesta, voto y
resolución genera una notificación para los destinatarios correspondientes.
Cada aviso tiene un destino: invitaciones y solicitudes, el playground o un
pique concreto. Cada persona solo lee y marca como leídas las suyas. El
contador del playground muestra las no leídas de ese grupo.
Los miembros de un playground ven un historial compartido de movimientos y
acciones. Ese historial no incluye invitaciones rechazadas ni solicitudes
privadas.

## Threats

Leer actividad de otra cuenta o marcar sus avisos. La política exige
`user_id = auth.uid()`.

## Testing

La consulta de no leídas se verifica en la interfaz con una cuenta real. La
autorización queda en RLS.

## Success criteria

- El aviso de una cuenta no aparece en otra.
- Abrir la actividad pendiente la marca como leída.
- El dashboard y el playground muestran la actividad reciente.
- Un aviso abre la pantalla correspondiente.
- El historial de un playground es el mismo para todos los miembros.
