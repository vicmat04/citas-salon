# Reporte de Sincronización: phase5-salon-appointments-panel

## Capacidades Sincronizadas

- **Gestión de Agenda del Salón:** Vista unificada y protegida `/s/[slug]/appointments` en tiempo real leyendo de Prisma.
- **Flujo de Vida y Transición de Estados:** Acciones rápidas para marcar citas como *Atendida* (`completed`), *No Asistió* (`no_show`), *Cancelada* (`cancelled` con motivo opcional) o reabrir a `confirmed`.
- **Agendamiento Manual Presencial / Teléfono:** Modal de creación de citas con detección inteligente de solapamientos y fuera de horario con confirmación autorizada por el dueño (`allowOverlap`).
- **Navegación Adaptativa:** Pestañas sin recarga (*Hoy*, *Próximas*, *Todas*), filtros por especialista y estado, notas internas del staff y enlace directo de WhatsApp con el cliente.
