# Especificación: Panel Interno de Citas y Gestión de Agenda del Salón (Fase 5)

## Propósito

Definir las reglas de validación, transiciones de estado, agendamiento manual con sobreescritura autorizada y contratos API para el panel interno de gestión de citas del salón.

---

## Requisitos y Especificaciones Ejecutables

### 1. Transición de Estados y Notas de Cita (`updateAppointmentStatus`)

#### 1.1 Cambios de Estado Válidos

- **Estados Permitidos:** `pending`, `confirmed`, `completed`, `cancelled`, `no_show`.
- **Regla de Flexibilidad:** Un usuario autenticado `salon_owner` puede cambiar el estado de cualquier cita de su salón a cualquier estado permitido.
- **Motivo de Cancelación:** Al cambiar a `cancelled`, si se proporciona un `cancellationReason`, se concatena o guarda en `internalNotes`.
- **Comportamiento de Liberación:** Cambiar el estado a `cancelled` desvincula la cita del cálculo de solapamiento en `getAvailableSlots`, liberando la ranura de tiempo.

---

### 2. Agendamiento Manual en Panel (`createManualAppointment`)

#### 2.1 Entradas y Validación

- **Entradas:** `salonSlug`, `serviceIds` (array non-empty), `specialistId` (UUID), `date` (YYYY-MM-DD), `startTime` ("HH:mm"), `customerName`, `customerEmail` (opcional), `customerPhone`, `customerNotes` (opcional), `internalNotes` (opcional), `allowOverlap` (boolean, default false).
- **Aislación Multi-Tenant:** Verificar `requireSalonOwner(slug)`.
- **Verificación de Solapamiento:**
  - Comprobar si `startTime` a `endTime` choca con otra cita activa (`status != 'cancelled'`) del mismo especialista o cae fuera del horario de atención del especialista/salón.
  - Si choca o está fuera de horario y `allowOverlap === false`, retornar:
    `{ warning: true, message: 'El horario seleccionado solapa con otra cita activa o está fuera de horario. ¿Deseas confirmar la cita de todas formas?' }`.
  - Si `allowOverlap === true`, procesar la creación guardando `source: 'owner_panel'`.

#### 2.2 Vinculación de Cliente y Creación de Cita

- Buscar o crear `Customer` por `(salonId, phone)` o `(salonId, email)`.
- Crear `Appointment` en estado `confirmed` con `source: 'owner_panel'`.
- Crear registros `AppointmentService` para los servicios seleccionados.

---

### 3. Vistas y Filtros Adaptativos

#### 3.1 Pestañas y Filtros

- **Pestaña Hoy:** Muestra citas cuya `appointmentDate` sea igual a la fecha local de hoy.
- **Pestaña Próximas:** Muestra citas cuya `appointmentDate` sea estrictamente mayor a hoy y `status != 'cancelled'`.
- **Pestaña Todas:** Muestra el historial completo ordenado por fecha y hora descendente.
- **Filtro por Especialista:** Opción "Todos" o seleccionar especialista específico.
- **Filtro por Estado:** Opción "Todos los estados" o seleccionar estado específico (`confirmed`, `completed`, `cancelled`, `no_show`).

---

## Seguridad y Aislación Multi-Tenant

- Todas lasServer Actions DEBEN ejecutar `requireSalonOwner(slug)` antes de consultar o mutar citas.
- Todas las consultas a Prisma DEBEN filtrar explícitamente por `salonId`.
