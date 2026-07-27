# Diseño Técnico: Panel Interno de Citas y Gestión de Agenda del Salón (Fase 5)

## Arquitectura y Flujo de Datos

Este módulo conecta las citas guardadas en la base de datos PostgreSQL con el panel protegido del salón (`/s/[slug]/appointments`), habilitando la gestión en tiempo real del ciclo de vida de las reservas y el agendamiento presencial/telefónico manual.

```text
+-----------------------------------------------------------------------------------+
|                        Panel del Salón (/s/[slug]/appointments)                   |
|   AppointmentsView (Hoy / Próximas / Todas)   |   CreateManualAppointmentDialog  |
+-----------------------------------------------------------------------------------+
                                         |
                                (Server Actions)
                                         v
+-----------------------------------------------------------------------------------+
|                         app/actions/appointments.ts                               |
|  - updateAppointmentStatus(appointmentId, status, internalNotes, reason, slug)    |
|  - createManualAppointment(formData, slug)                                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                     lib/auth/helpers.ts (requireSalonOwner)                       |
|                       Enforces Tenant Isolation & Security                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                       Prisma ORM & PostgreSQL Database                            |
|  (Appointment, AppointmentService, Customer, Specialist, Service)                 |
+-----------------------------------------------------------------------------------+
```

---

## Módulos y Responsabilidades

### 1. Server Actions (`app/actions/appointments.ts`)

- `updateAppointmentStatus(appointmentId: string, status: string, internalNotes?: string, cancellationReason?: string, slug: string)`:
  - Ejecuta `requireSalonOwner(slug)`.
  - Verifica que la cita pertenezca al salón.
  - Si `status === 'cancelled'` y hay `cancellationReason`, lo anexa a `internalNotes` (ej: `[Motivo Cancelación]: ...`).
  - Actualiza el registro `Appointment` en la BD.
  - Revalida `/s/${slug}/appointments`, `/s/${slug}/dashboard` y `/book/${slug}`.
  - Retorna `{ success: true }`.

- `createManualAppointment(formData: FormData, slug: string)`:
  - Ejecuta `requireSalonOwner(slug)`.
  - Extrae `customerName`, `customerPhone`, `customerEmail`, `serviceIds`, `specialistId`, `date`, `startTime`, `customerNotes`, `internalNotes`, `allowOverlap`.
  - Verifica disponibilidad básica. Si hay choque o fuera de horario y `allowOverlap` es `false`, retorna:
    `{ warning: true, message: 'El horario seleccionado solapa con otra cita activa del especialista o está fuera de horario. Marca la casilla de confirmación para forzar el agendamiento.' }`.
  - Busca o crea el `Customer` en la base de datos por `(salonId, phone)` o `(salonId, email)`.
  - Crea el `Appointment` con `status: 'confirmed'` y `source: 'owner_panel'`.
  - Crea los registros `AppointmentService`.
  - Revalida la ruta y retorna `{ success: true, appointmentId: appointment.id }`.

---

### 2. Vistas y Componentes de Usuario

#### `app/s/[slug]/(protected)/appointments/page.tsx`

- Servidor: Ejecuta `requireSalonOwner(slug)`.
- Consulta Prisma:
  - `appointments`: Lista de citas del salón ordenadas por fecha/hora descendente, incluyendo relaciones `customer`, `specialist`, `appointmentServices` (con `service`).
  - `specialists`: Lista de especialistas activos para los filtros y el modal.
  - `services`: Lista de servicios activos para el modal.
- Renderiza `AppointmentsView`.

#### `app/s/[slug]/(protected)/appointments/appointments-view.tsx`

- Componente de cliente adaptativo `mobile-first`.
- Pestañas rápidas de navegación:
  - **Hoy**: Filtra citas donde `appointmentDate === hoy`.
  - **Próximas**: Filtra citas con `appointmentDate > hoy` y `status != 'cancelled'`.
  - **Todas**: Muestra el historial completo.
- Desplegables de filtro:
  - Filtro por Especialista.
  - Filtro por Estado (`confirmed`, `completed`, `cancelled`, `no_show`, `pending`).
- Tarjetas de cita responsivas con Badges de estado con código de color:
  - `confirmed`: Verde / Primario.
  - `completed`: Azul / Éxito.
  - `cancelled`: Destructivo / Rojo.
  - `no_show`: Ámbar / Naranja.
  - `pending`: Amarillo.
- Menú desplegable o botones de acción rápida por cita:
  - "Marcar como Atendida" (`completed`)
  - "Cliente No Asistió" (`no_show`)
  - "Cancelar Cita" (Abre modal para ingresar motivo opcional)
  - "Reabrir Cita" (`confirmed`)
  - "Editar Notas Internas"

#### `app/s/[slug]/(protected)/appointments/create-manual-appointment-dialog.tsx`

- Modal de agendamiento interno para llamadas o presenciales.
- Incluye campos de cliente, servicios, especialista, fecha y hora.
- Despliega un banner de advertencia resaltado si el Server Action responde con `warning: true`, permitiendo marcar la casilla "Confirmar sobreescritura de horario" y volver a enviar.

---

## Plan de Pruebas

- `app/actions/appointments.test.ts`: Pruebas de integración para actualización de estados, adjunto de motivos de cancelación, notas internas, aislación multi-tenant y creación de citas manuales con y sin flag de solapamiento.
