# Exploración: phase5-salon-appointments-panel

## Análisis del Estado Actual

- **Pestaña Citas del Salón (`app/s/[slug]/(protected)/appointments/page.tsx`):**
  - Actualmente renderiza tarjetas basadas en datos estáticos (`mockAppointments`).
  - No permite filtrar por fecha, especialista o estado.
  - No permite cambiar el estado de una cita (*Confirmada*, *Atendida/Completada*, *Cancelada*, *No-Show*).
  - No permite la creación manual de citas para clientes presenciales o por teléfono (walk-in).
  - No permite editar o ver notas internas/del cliente.

- **Modelos en la Base de Datos (`prisma/schema.prisma`):**
  - `Appointment`: `id`, `salonId`, `customerId`, `specialistId`, `appointmentDate`, `startTime`, `endTime`, `status` (`pending`, `confirmed`, `completed`, `cancelled`, `no_show`, `rescheduled`), `source` (`public_form`, `owner_panel`, `admin_panel`), `customerNotes`, `internalNotes`, `totalPriceSnapshot`, `totalDurationMinutes`, `createdByUserId`.
  - `AppointmentService`: `appointmentId`, `serviceId`, `priceSnapshot`, `durationSnapshot`.
  - `Customer`: `id`, `salonId`, `fullName`, `phone`, `email`, `notes`.
  - `Specialist`: `id`, `salonId`, `name`, `specialty`, `isActive`.

## Análisis de Brechas (Reglas de Negocio)

1. **Gestión de Agenda y Filtros de Citas:**
   - **Necesidad:** Visualizar citas reales cargadas desde Prisma para el salón activo con filtros por:
     - Rango de fecha (Hoy, Mañana, Esta Semana, Fecha específica).
     - Especialista asignado (Todos o especialista específico).
     - Estado de la cita (*Todas*, *Confirmadas*, *Completadas*, *Canceladas*, *No-Show*).

2. **Cambio de Estado de Cita (Flujo de Vida):**
   - **Necesidad:** El staff/dueño debe poder cambiar rápidamente el estado de una cita:
     - Marcar como **Atendida** (`completed`) cuando el servicio finaliza.
     - Marcar como **No-Show** (`no_show`) si el cliente no asistió.
     - Marcar como **Cancelada** (`cancelled`) liberando el slot del especialista.
     - Guardar/actualizar `internalNotes` (notas privadas para el staff).

3. **Creación Manual de Citas por el Salón (Walk-in / Teléfono):**
   - **Necesidad:** Modal de agendamiento interno en `/appointments`:
     - Seleccionar cliente existente o ingresar datos de un nuevo cliente (`fullName`, `phone`, `email`).
     - Seleccionar 1 o más servicios.
     - Seleccionar especialista asignado.
     - Seleccionar fecha y hora de inicio (permitiendo forzar/sobreescribir si el dueño lo requiere con advertencia de solapamiento).
     - Crear la cita con `source = 'owner_panel'`.

## Propuesta de Cambios Arquitectónicos

1. **Server Actions (`app/actions/appointments.ts`):**
   - `updateAppointmentStatus(appointmentId, status, internalNotes?, slug)`: Garantiza la aislación multi-tenant con `requireSalonOwner(slug)`.
   - `createManualAppointment(formData, slug)`: Crea cita directa desde el panel de dueño.
   - `cancelAppointment(appointmentId, reason?, slug)`: Cancela cita y revalida vistas.

2. **Vistas e Interfaces de Usuario (`app/s/[slug]/(protected)/appointments/`):**
   - `appointments-view.tsx`: Componente dinámico con barra de filtros, vista de lista/tabla de citas, indicadores de estado con badges de colores, menú de acciones rápidas (Marcar completada, No-Show, Cancelar, Editar notas).
   - `create-manual-appointment-dialog.tsx`: Modal para registrar citas presenciales/telefónicas.
