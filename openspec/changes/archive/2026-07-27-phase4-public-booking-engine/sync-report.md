# Reporte de Sincronización: phase4-public-booking-engine

## Capacidades Sincronizadas

- **Cálculo de Disponibilidad de Turnos en Tiempo Real:** Algoritmo en `lib/salons/availability.ts` para calcular slots libres evaluando horarios de atención, ausencias (`BlockedDate`/`BlockedSlot`), citas previas y duraciones + buffers.
- **Reserva Pública de Clientes y Multi-Servicio:** Wizard de reserva en 4 pasos `/book/[slug]` con selección multi-servicio y opción "Cualquiera disponible".
- **Registro de Citas Confirmadas:** Server Action `createPublicAppointment` que busca/crea al cliente `Customer` y registra la cita confirmada directamente (`status: 'confirmed'`).
- **Constancia por WhatsApp:** Página de confirmación que genera la URL de constancia enviada por el cliente desde su propio teléfono hacia el teléfono del salón.
