# Propuesta: Motor de Disponibilidad y Reserva Pública de Clientes (Fase 4)

## Intención

Permitir que los clientes finales visualicen el catálogo real del salón en la página pública (`/[slug]`), consulten los turnos y horarios disponibles en tiempo real (`/book/[slug]`), y agenden sus citas sin necesidad de autenticarse, creando la cita confirmada y generando un enlace directo a WhatsApp.

Este módulo elimina definitivamente los datos estáticos (`mockServices`, `mockSalonInfo`) de las páginas públicas, implementa el algoritmo de cálculo de horarios disponibles evaluando duraciones, buffers, horarios de atención, ausencias/bloqueos y citas preexistentes, e integra el registro/vinculación del cliente.

## Decisiones de Producto Confirmadas

1. **Selección de Especialista ("Cualquiera disponible")**:
   - Si el cliente elige "Cualquiera disponible", el sistema evalúa los especialistas habilitados para los servicios seleccionados y asigna el turno con un especialista disponible.
   - En salones con un único especialista, dicho especialista se preselecciona automáticamente.

2. **Anticipación y Rango de Reserva Configurable**:
   - Los días de anticipación máximos se rigen por `salon.bookingRangeDays` (configurable por el salón).
   - La anticipación mínima se rige por `salon.minAdvanceHours` (configurable por el salón). Si el salón configura 0 o 0.5 horas, se pueden reservar turnos en la hora inmediata siempre que estén dentro del horario de atención y libres de bloqueos o citas.

3. **Estado Inicial de la Cita**:
   - La cita se crea directamente en estado **`confirmed`** ("Confirmada de una vez").

4. **Reserva Multi-Servicio**:
   - El cliente puede seleccionar uno o varios servicios en una misma cita (ej: Corte + Barba).
   - La duración total de la cita es la suma de las duraciones de los servicios seleccionados más sus tiempos de descanso (buffers).
   - El precio total es la suma de los precios de los servicios seleccionados.

5. **Confirmación y WhatsApp**:
   - Al finalizar la reserva, el cliente es redirigido a `/book/[slug]/confirmacion?appointmentId=...` mostrando el resumen real de la cita.
   - El cliente hace clic en el botón de WhatsApp para enviar el mensaje desde su propio teléfono como constancia directa de la reserva hacia el salón.

## Alcance

### Página Pública del Salón (`app/[slug]/page.tsx`)

- Carga dinámica desde la base de datos de los datos del salón (nombre, eslogan, teléfono, dirección, logo, color de tema).
- Renderizado de categorías y servicios activos con precio positivo configurado.

### Wizard de Reserva Pública (`app/book/[slug]/page.tsx`)

- **Paso 1: Selección de Servicios** (Permite seleccionar 1 o más servicios activos del catálogo).
- **Paso 2: Selección de Especialista** (Muestra la lista de especialistas capacitados para los servicios o la opción "Cualquiera disponible").
- **Paso 3: Selección de Fecha y Turno/Hora** (Selector de fecha dentro de `bookingRangeDays` y cálculo de slots en tiempo real vía Server Action).
- **Paso 4: Datos del Cliente** (Formulario simple: Nombre, Email, Teléfono/WhatsApp y notas opcionales).

### Motor de Disponibilidad (`lib/salons/availability.ts`)

- Función pura que calcula los turnos disponibles en una fecha para un salón, especialista(s) y lista de servicios:
  - Evalúa la duración total (`sum(durationMinutes) + sum(bufferMinutes)`).
  - Consulta los horarios del salón (`BusinessHours`) y del especialista (`SpecialistHours`).
  - Descuenta bloqueos de día completo (`BlockedDate`) y de rangos de horas (`BlockedSlot`).
  - Descuenta citas activas (`Appointment` en estado no cancelado) que traslapen.
  - Retorna arreglo de horas de inicio válidas (ej: `["09:00", "09:30", "10:00", ...]`).

### Procesamiento de la Reserva (`app/actions/booking.ts`)

- Server Action `createPublicAppointment`:
  - Valida el estado operativo del salón con `requireOperationalPublicSalon(slug)`.
  - Verifica atómicamente la disponibilidad del turno solicitado.
  - Busca o crea el registro en la tabla `Customer` (por teléfono/email dentro del salón).
  - Crea el registro `Appointment` (estado `confirmed`) y los registros `AppointmentService`.
  - Retorna `{ success: true, appointmentId }`.

### Página de Confirmación (`app/book/[slug]/confirmacion/page.tsx`)

- Carga la cita desde la base de datos con sus servicios, especialista y cliente.
- Muestra el resumen completo y el enlace directo de WhatsApp al teléfono del salón.

## Áreas Afectadas

| Área | Cambio |
| --- | --- |
| `lib/salons/availability.ts` | Algoritmo de cálculo de slots disponibles en tiempo real. |
| `lib/salons/availability.test.ts` | Pruebas unitarias del algoritmo de disponibilidad. |
| `app/actions/booking.ts` | Server Actions para obtener slots y crear citas públicas. |
| `app/actions/booking.test.ts` | Pruebas de integración de Server Actions de reserva. |
| `app/[slug]/page.tsx` | Landing pública con datos reales de la BD. |
| `app/book/[slug]/page.tsx` | Wizard interactivo de reserva de 4 pasos. |
| `app/book/[slug]/confirmacion/page.tsx` | Página de confirmación con datos reales y enlace a WhatsApp. |

## No Objetivos

- Cobro de pagos o pasarela de tarjetas online en el checkout.
- Envío automático de mensajes WhatsApp por API paga (Twilio/Meta). Se utiliza el enlace estandarizado `https://wa.me/...`.

## Criterios de Éxito

1. La página `/[slug]` muestra la información y servicios reales del salón guardados en la BD.
2. El wizard `/book/[slug]` calcula turnos en tiempo real excluyendo horarios fuera de atención, bloqueos y citas existentes.
3. Se pueden reservar múltiples servicios en una misma cita sumando tiempos y precios.
4. La opción "Cualquiera disponible" asigna automáticamente a un especialista capacitado y disponible.
5. Las citas se registran directamente con estado `confirmed` y crean/vincular el registro `Customer`.
6. La página de confirmación muestra la cita real guardada y el botón funcional de WhatsApp.
7. Todos los 164+ tests existentes y los nuevos tests de disponibilidad pasan al 100% en verde.
