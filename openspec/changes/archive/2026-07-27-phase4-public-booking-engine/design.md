# Diseño Técnico: Motor de Disponibilidad y Reserva Pública de Clientes (Fase 4)

## Arquitectura y Flujo de Datos

Este módulo implementa el motor de reservas públicas para clientes finales, calculando slots en tiempo real y registrando citas confirmadas en PostgreSQL a través de Supabase y Prisma.

```text
+-----------------------------------------------------------------------------------+
|                            Experiencia Pública Cliente                            |
|       /[slug] (Landing)  ->  /book/[slug] (Wizard)  ->  /book/[slug]/confirmacion |
+-----------------------------------------------------------------------------------+
                                         |
                                (Server Actions)
                                         v
+-----------------------------------------------------------------------------------+
|                           app/actions/booking.ts                                  |
|  - getAvailableSlotsAction(slug, date, serviceIds, specialistId)                  |
|  - createPublicAppointment(formData, slug)                                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        lib/salons/availability.ts                                 |
|  - getAvailableSlots(salonId, date, serviceIds, specialistId)                     |
|  - Requiere: BusinessHours, SpecialistHours, BlockedDate, BlockedSlot, Appointment|
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                       Prisma ORM & PostgreSQL Database                            |
|  (Salon, Customer, Appointment, AppointmentService, Specialist, Service, etc.)   |
+-----------------------------------------------------------------------------------+
```

---

## Módulos y Responsabilidades

### 1. Motor de Disponibilidad (`lib/salons/availability.ts`)

- `calculateServicesTotalDuration(serviceIds: string[])`: Retorna la duración acumulada en minutos (`sum(durationMinutes) + sum(bufferMinutes)`).
- `getCandidateSpecialists(salonId: string, serviceIds: string[], requestedSpecialistId?: string)`:
  - Si `requestedSpecialistId` es específico, verifica que realice todos los servicios.
  - Si es `"any"`, busca todos los especialistas activos en el salón que realizan todos los `serviceIds`.
- `getAvailableSlots(salonId: string, date: Date, serviceIds: string[], requestedSpecialistId?: string)`:
  - Genera ranuras cada 30 minutos entre la hora de apertura y cierre de cada especialista candidato.
  - Excluye turnos con bloqueos de fecha (`BlockedDate`), bloqueos de horario (`BlockedSlot`) o citas activas (`Appointment`).
  - Para citas en el día de hoy, filtra ranuras anteriores a `horaActual + minAdvanceHours`.
  - Retorna `{ slots: string[], assignedSpecialistId?: string }`.

---

### 2. Server Actions (`app/actions/booking.ts`)

- `getAvailableSlotsAction(slug: string, dateStr: string, serviceIds: string[], specialistId?: string)`:
  - Llama a `requireOperationalPublicSalon(slug)`.
  - Llama a `getAvailableSlots`.
  - Retorna `{ success: true, slots: string[] }`.
- `createPublicAppointment(formData: FormData, slug: string)`:
  - Llama a `requireOperationalPublicSalon(slug)`.
  - Extrae `serviceIds`, `specialistId`, `date`, `startTime`, `customerName`, `customerEmail`, `customerPhone`, `customerNotes`.
  - Re-valida atómicamente la disponibilidad de `startTime`.
  - Busca o crea el `Customer` atómicamente por `(salonId, email)` o `(salonId, phone)`.
  - Crea el registro `Appointment` con `status: 'confirmed'`.
  - Crea los registros `AppointmentService`.
  - Retorna `{ success: true, appointmentId: string }`.

---

### 3. Vistas e Interfaces de Usuario (`app/book/[slug]/`)

- `app/[slug]/page.tsx`: Carga el salón desde Prisma con `requireOperationalPublicSalon(slug)`. Renderiza categorías y servicios activos.
- `app/book/[slug]/booking-wizard.tsx`:
  - Componente de cliente interactivo de 4 pasos con barra de progreso.
  - Paso 1: Checkbox multi-selección de servicios.
  - Paso 2: Radio-group de especialistas ("Cualquiera disponible" pre-seleccionado).
  - Paso 3: Picker de fecha e indicador de slots en tiempo real.
  - Paso 4: Formulario de datos personales y botón "Confirmar Reserva".
- `app/book/[slug]/confirmacion/page.tsx`: Carga la cita creada desde Prisma y genera la URL `https://wa.me/{phone}?text={mensaje}` para enviar la constancia por WhatsApp desde el teléfono del cliente.

---

## Plan de Pruebas

- `lib/salons/availability.test.ts`: Pruebas unitarias para el algoritmo de disponibilidad en tiempo real (duraciones acumuladas, horas de atención, solapamiento de citas y bloqueos).
- `app/actions/booking.test.ts`: Pruebas de integración de Server Actions (creación de cliente, creación de cita confirmada y prevención de doble reserva en el mismo slot).
