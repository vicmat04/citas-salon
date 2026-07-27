# Especificación: Motor de Disponibilidad y Reserva Pública de Clientes (Fase 4)

## Propósito

Definir el comportamiento esperado, reglas de validación, cálculos de disponibilidad en tiempo real y contratos API para la experiencia pública de reserva de citas por clientes finales.

---

## Requisitos y Especificaciones Ejecutables

### 1. Cálculo de Disponibilidad de Slots en Tiempo Real

#### 1.1 Algoritmo de Ranuras de Tiempo Válidas

- **Entradas:** `salonId`, `date` (YYYY-MM-DD), `serviceIds` (array de UUIDs), `specialistId` ("any" o UUID específico).
- **Reglas de Cálculo:**
  1. Duración total = `sum(durationMinutes)` + `sum(bufferMinutes)` para los `serviceIds`.
  2. Si `specialistId` es "any", obtener todos los especialistas activos del salón que realizan todos los `serviceIds` (vía `SpecialistService`). Si no hay ninguno, retornar `[]`.
  3. Para cada especialista candidato:
     - Obtener su horario efectivo para el día de la semana (`resolveEffectiveSpecialistSchedule`).
     - Si el día no está disponible o el salón está cerrado, omitir especialista.
     - Si el día completo está bloqueado (`BlockedDate`), omitir especialista.
     - Generar ranuras potenciales a intervalos de 15 o 30 minutos dentro de `[openTime, closeTime - duracionTotal]`.
     - Descontar ranuras que traslapen con un `BlockedSlot` del especialista o del salón.
     - Descontar ranuras que traslapen con citas activas (`Appointment` donde `status != 'cancelled'`).
  4. Retornar las horas de inicio únicas disponibles en formato `"HH:mm"`, ordenadas cronológicamente.

#### 1.2 Anticipación y Límites de Calendario

- **Días de Anticipación:** La fecha `date` seleccionada debe estar dentro del rango `[hoy, hoy + salon.bookingRangeDays]`.
- **Anticipación Mínima:** Si la cita es para el día de hoy, la hora de inicio debe ser mayor o igual a `horaActual + salon.minAdvanceHours`.

---

### 2. Creación de Citas Públicas (`createPublicAppointment`)

#### 2.1 Entradas y Validación

- **Entradas:** `salonSlug`, `serviceIds` (array non-empty), `specialistId` ("any" o UUID), `date` (YYYY-MM-DD), `startTime` ("HH:mm"), `customerName` (min 2 caracteres), `customerEmail` (email válido), `customerPhone` (min 7 caracteres), `customerNotes` (opcional).
- **Validación del Salón:**
  - Debe ejecutarse `requireOperationalPublicSalon(slug)`. Si el salón está suspendido o cancelado, rechazar inmediatamente.
- **Validación de Disponibilidad:**
  - Re-evaluar la disponibilidad del slot `startTime` atómicamente antes de escribir.
  - Si el slot ya no está disponible, retornar `{ error: 'El horario seleccionado ya no se encuentra disponible. Por favor elige otro.' }`.

#### 2.2 Registro de Cliente y Cita

- **Cliente (`Customer`):**
  - Buscar `Customer` en la base de datos por `(salonId, email)` o `(salonId, phone)`.
  - Si existe, actualizar `name` y `phone` si cambiaron.
  - Si no existe, crear nuevo `Customer` con `salonId`, `name`, `email`, `phone`.
- **Cita (`Appointment`):**
  - Si `specialistId` era "any", seleccionar el primer especialista disponible en ese slot.
  - Calcular `endTime = startTime + duracionTotal`.
  - Calcular `totalPrice = sum(price)` de los servicios.
  - Crear `Appointment` con `status: 'confirmed'`, `customerId`, `specialistId`, `salonId`, `startTime`, `endTime`, `totalPrice`, `customerNotes`.
  - Crear registros en `AppointmentService` para cada servicio.
  - Retornar `{ success: true, appointmentId: appointment.id }`.

---

### 3. Enlace de Confirmación a WhatsApp

#### 3.1 Construcción del Mensaje

- Mensaje pre-construido:
  `"¡Hola! Acabo de agendar la cita #{appointmentId} en {salonName} para el {fecha} a las {hora}. Servicio(s): {nombresServicios}. Nombre: {customerName}."`
- URL generada: `https://wa.me/{salonPhoneCountryCode}{salonPhone}?text={mensajeURLEncoded}`.

---

## Seguridad y Aislación Multi-Tenant

- Toda consulta y mutación DEBE filtrar por `salonId` para evitar cruce de datos entre salones.
- Las rutas públicas utilizan `requireOperationalPublicSalon(slug)` y no requieren sesión de usuario (`User` / Supabase Auth).
