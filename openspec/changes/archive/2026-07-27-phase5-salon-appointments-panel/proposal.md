# Propuesta: Panel Interno de Citas y Gestión de Agenda del Salón (Fase 5)

## Intención

Brindar al dueño y al personal del salón una herramienta completa, ágil y totalmente adaptativa (`mobile-first`) para gestionar las citas recibidas, controlar el flujo de atención (*Confirmada*, *Atendida*, *No-Show*, *Cancelada*), editar notas internas y registrar citas manuales presenciales o telefónicas (*walk-ins*) con advertencias inteligentes de solapamiento.

Este módulo reemplaza los datos mock de `/s/[slug]/appointments` por datos reales de Prisma, incorpora filtros rápidos sin recarga de pantalla (Pestaña "Hoy", "Próximas Citas", "Todas"), y otorga flexibilidad total para ajustar estados y resolver cancelaciones.

## Decisiones de Producto Confirmadas

1. **Agendamiento Manual con Sobreescritura Autorizada (Overlapping Warning)**:
   - Al agendar manualmente desde el panel del salón (`source = 'owner_panel'`), el sistema verifica la disponibilidad habitual.
   - Si el horario elegido choca con otra cita activa o cae fuera del horario laboral, el sistema **no bloquea rígidamente al dueño**, sino que despliega una advertencia clara informando del solapamiento o fuera de horario y requiriendo confirmación explícita para agendar.

2. **Cancelación y Liberación de Cupo**:
   - Al cancelar una cita, el dueño puede ingresar un motivo de cancelación opcional.
   - El horario de la cita cancelada queda inmediatamente liberado para recibir nuevas reservas.

3. **Flexibilidad Total de Cambio de Estado**:
   - El dueño puede modificar libremente el estado de cualquier cita entre `pending`, `confirmed`, `completed`, `no_show` y `cancelled` (pudiendo reabrir citas canceladas o marcadas como no-show por error).

4. **Interfaz Adaptativa (Mobile-First) y Filtros Rápidos**:
   - Vista optimizada para dispositivos móviles y escritorio.
   - Pestañas predeterminadas sin recarga de página:
     - **Citas de Hoy**: Vista rápida del día a día.
     - **Próximas Citas**: Reservas agendadas a partir de mañana.
     - **Historial / Todas**: Citas pasadas, completadas o canceladas con filtros por especialista y estado.

## Alcance

### Panel de Citas del Salón (`app/s/[slug]/(protected)/appointments/`)

- Reemplazar mock data por consultas en tiempo real a Prisma.
- Implementar pestañas de navegación: **Hoy**, **Próximas**, **Todas**.
- Filtros desplegables por Especialista y por Estado.
- Tarjetas y tabla responsiva mostrando: cliente, teléfono, servicios, duración, total, especialista asignado, fecha, hora y badge de estado.

### Modal de Agendamiento Manual (`create-manual-appointment-dialog.tsx`)

- Formulario de creación rápida:
  - Búsqueda de cliente existente por teléfono/email o creación instantánea de nuevo cliente.
  - Selección de servicios y especialista.
  - Selección de fecha y hora.
  - Verificación atómica de disponibilidad: Si existe solapamiento o fuera de horario, muestra banner de advertencia con checkbox de confirmación autorizada antes de guardar.

### Cambio de Estado y Notas Internas (`app/actions/appointments.ts`)

- Server Actions:
  - `updateAppointmentStatus(appointmentId, status, internalNotes?, cancellationReason?, slug)`
  - `createManualAppointment(formData, allowOverlap?, slug)`
- Modal/Menú de acciones rápidas en la tarjeta de cita para:
  - Marcar como **Atendida** (`completed`).
  - Marcar como **No Asistió** (`no_show`).
  - Marcar como **Cancelada** (`cancelled`) con campo de motivo opcional.
  - Reabrir cita a `confirmed`.
  - Editar notas internas del salón (`internalNotes`).

## Áreas Afectadas

| Área | Cambio |
| --- | --- |
| `app/actions/appointments.ts` | Server Actions para actualizar estado, notas y crear citas manuales con aislación multi-tenant. |
| `app/actions/appointments.test.ts` | Pruebas de integración de Server Actions de citas del panel. |
| `app/s/[slug]/(protected)/appointments/page.tsx` | Carga de citas reales desde Prisma y renderizado de la vista protegida. |
| `app/s/[slug]/(protected)/appointments/appointments-view.tsx` | Componente de cliente adaptativo con pestañas, filtros y acciones rápidas. |
| `app/s/[slug]/(protected)/appointments/create-manual-dialog.tsx` | Modal de creación manual de citas con advertencia de solapamiento. |

## No Objetivos

- Cobro de caja o emisión de facturas fiscales desde el panel (se registra únicamente el total cobrado en la cita).
- Envío automático masivo de correos de marketing.

## Criterios de Éxito

1. `/s/[slug]/appointments` muestra las citas reales de la base de datos divididas en pestañas "Hoy", "Próximas" y "Todas".
2. El dueño puede cambiar el estado de cualquier cita a `completed`, `no_show`, `cancelled` (con motivo opcional) o `confirmed`.
3. El agendamiento manual permite crear citas para clientes existentes o nuevos. Si hay solapamiento, informa al dueño y le permite autorizar la creación.
4. Las citas canceladas liberan el espacio en el motor de disponibilidad en tiempo real.
5. La vista funciona perfectamente en dispositivos móviles (smartphones) y pantallas de escritorio.
6. Todos los 171+ tests existentes y los nuevos tests de gestión de citas pasan al 100% en verde.
