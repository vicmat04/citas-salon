# AVAILABILITY_ALGORITHM.md

# Algoritmo de disponibilidad — Citas Salón

> Este documento describe el algoritmo completo de cálculo de disponibilidad.  
> Es el componente más crítico del sistema. Cualquier bug aquí afecta directamente la experiencia del cliente final.

---

## 1. Propósito

El algoritmo responde a una pregunta concreta:

> **¿Qué horarios están disponibles para agendar una cita en el salón X, para el servicio Y, con el especialista Z, en la fecha W?**

La respuesta es una lista de horarios (time slots) con su estado: `available` o `unavailable`.

---

## 2. Inputs del algoritmo

```typescript
interface AvailabilityQuery {
  salonId: string
  date: string            // formato ISO: '2026-07-15'
  serviceIds: string[]    // uno o más servicios seleccionados
  specialistId?: string   // opcional: si el cliente elige especialista
}
```

---

## 3. Outputs del algoritmo

```typescript
interface TimeSlot {
  time: string        // '09:00', '09:30', '10:00', ...
  available: boolean
  reason?: UnavailableReason
}

type UnavailableReason =
  | 'blocked_date'        // fecha bloqueada completamente
  | 'not_working_day'     // el salón no trabaja ese día
  | 'specialist_off'      // el especialista no trabaja ese día
  | 'blocked_slot'        // horario bloqueado manualmente
  | 'already_booked'      // ya existe una cita en ese horario
  | 'outside_hours'       // fuera del rango de trabajo
  | 'insufficient_time'   // no cabe la duración del servicio antes del cierre
  | 'min_advance'         // no cumple la anticipación mínima

interface AvailabilityResult {
  date: string
  isDateAvailable: boolean
  reason?: UnavailableReason
  slots: TimeSlot[]
  totalDurationMinutes: number   // suma de duraciones de serviceIds
  totalBufferMinutes: number     // suma de buffers de serviceIds
}
```

---

## 4. Pasos del algoritmo

### Paso 1 — Cargar datos necesarios

```typescript
async function loadAvailabilityData(query: AvailabilityQuery) {
  const [salon, businessHours, specialistHours, services, blockedDates, blockedSlots, existingAppointments] =
    await Promise.all([
      prisma.salon.findUnique({ where: { id: query.salonId } }),
      prisma.businessHours.findMany({ where: { salonId: query.salonId } }),
      query.specialistId
        ? prisma.specialistHours.findMany({ where: { specialistId: query.specialistId } })
        : Promise.resolve([]),
      prisma.service.findMany({ where: { id: { in: query.serviceIds } } }),
      prisma.blockedDate.findMany({
        where: {
          salonId: query.salonId,
          date: new Date(query.date),
          OR: [
            { specialistId: null },                          // bloqueo de salón completo
            { specialistId: query.specialistId ?? undefined } // bloqueo del especialista
          ]
        }
      }),
      prisma.blockedSlot.findMany({
        where: {
          salonId: query.salonId,
          date: new Date(query.date),
          OR: [
            { specialistId: null },
            { specialistId: query.specialistId ?? undefined }
          ]
        }
      }),
      prisma.appointment.findMany({
        where: {
          salonId: query.salonId,
          appointmentDate: new Date(query.date),
          specialistId: query.specialistId,
          status: { notIn: ['cancelled', 'no_show'] }  // solo citas activas
        }
      })
    ])

  return { salon, businessHours, specialistHours, services, blockedDates, blockedSlots, existingAppointments }
}
```

---

### Paso 2 — Verificar si la fecha completa está disponible

```typescript
function checkDateAvailability(
  date: string,
  dayOfWeek: number,
  businessHours: BusinessHours[],
  specialistHours: SpecialistHours[],
  blockedDates: BlockedDate[],
  minAdvanceHours: number,
  salon: Salon
): { available: boolean; reason?: UnavailableReason } {

  // 2.1 ¿Fecha bloqueada?
  if (blockedDates.length > 0) {
    return { available: false, reason: 'blocked_date' }
  }

  // 2.2 ¿El salón trabaja ese día?
  const dayHours = businessHours.find(h => h.dayOfWeek === dayOfWeek)
  if (!dayHours || !dayHours.isOpen) {
    return { available: false, reason: 'not_working_day' }
  }

  // 2.3 ¿El especialista trabaja ese día? (si aplica)
  if (specialistHours.length > 0) {
    const specDay = specialistHours.find(h => h.dayOfWeek === dayOfWeek)
    if (!specDay || !specDay.isAvailable) {
      return { available: false, reason: 'specialist_off' }
    }
  }

  // 2.4 ¿La fecha ya pasó o no cumple anticipación mínima?
  const dateObj = new Date(`${date}T00:00:00`)
  const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000
  if (dateObj.getTime() < Date.now() - 86400000) { // más de 1 día en el pasado
    return { available: false, reason: 'min_advance' }
  }

  return { available: true }
}
```

---

### Paso 3 — Calcular duración total del servicio

```typescript
function calculateServiceTotals(services: Service[]) {
  const totalDurationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0)
  const totalBufferMinutes = services.reduce((sum, s) => sum + s.bufferMinutes, 0)
  const totalBlockMinutes = totalDurationMinutes + totalBufferMinutes

  return { totalDurationMinutes, totalBufferMinutes, totalBlockMinutes }
}
```

> **Nota**: El buffer es tiempo post-cita para limpieza/preparación. Bloquea el horario pero NO se muestra al cliente como parte del servicio.

---

### Paso 4 — Generar slots del día

```typescript
function generateDaySlots(
  openTime: string,    // '09:00'
  closeTime: string,   // '19:00'
  slotIntervalMinutes = 30
): string[] {
  const slots: string[] = []

  const [openH, openM] = openTime.split(':').map(Number)
  const [closeH, closeM] = closeTime.split(':').map(Number)

  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  for (let min = openMinutes; min < closeMinutes; min += slotIntervalMinutes) {
    const h = Math.floor(min / 60).toString().padStart(2, '0')
    const m = (min % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
  }

  return slots
}
```

---

### Paso 5 — Filtrar slots por disponibilidad

```typescript
function filterSlots(
  slots: string[],
  date: string,
  closeTime: string,
  totalBlockMinutes: number,
  totalDurationMinutes: number,
  blockedSlots: BlockedSlot[],
  existingAppointments: Appointment[],
  minAdvanceHours: number
): TimeSlot[] {

  const now = new Date()
  const closeMinutes = timeToMinutes(closeTime)

  // Convertir citas existentes a rangos bloqueados
  const appointmentRanges = existingAppointments.map(a => ({
    start: timeToMinutes(a.startTime),
    end: timeToMinutes(a.endTime)  // endTime ya incluye duración + buffer
  }))

  // Convertir blocked_slots a rangos
  const blockedRanges = blockedSlots.map(b => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime)
  }))

  return slots.map(slot => {
    const slotMin = timeToMinutes(slot)
    const slotEnd = slotMin + totalBlockMinutes  // duración + buffer

    // 5.1 ¿El slot completo cabe antes del cierre?
    if (slotEnd > closeMinutes) {
      return { time: slot, available: false, reason: 'insufficient_time' }
    }

    // 5.2 ¿Anticipación mínima?
    const slotDateTime = new Date(`${date}T${slot}:00`)
    const minMs = minAdvanceHours * 3600 * 1000
    if (slotDateTime.getTime() - now.getTime() < minMs) {
      return { time: slot, available: false, reason: 'min_advance' }
    }

    // 5.3 ¿Existe un blocked_slot que se superponga?
    const isManuallyBlocked = blockedRanges.some(range =>
      slotMin < range.end && slotEnd > range.start
    )
    if (isManuallyBlocked) {
      return { time: slot, available: false, reason: 'blocked_slot' }
    }

    // 5.4 ¿Existe una cita que se superponga?
    const isBooked = appointmentRanges.some(range =>
      slotMin < range.end && slotEnd > range.start
    )
    if (isBooked) {
      return { time: slot, available: false, reason: 'already_booked' }
    }

    return { time: slot, available: true }
  })
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
```

---

### Paso 6 — Función principal

```typescript
async function getAvailableSlots(query: AvailabilityQuery): Promise<AvailabilityResult> {
  const data = await loadAvailabilityData(query)

  const date = new Date(query.date)
  const dayOfWeek = date.getDay() // 0=Domingo, 1=Lunes, ..., 6=Sábado

  // Determinar horario efectivo del día
  // Prioridad: specialist_hours (si existen) > business_hours
  const dayBusinessHours = data.businessHours.find(h => h.dayOfWeek === dayOfWeek)

  let effectiveOpenTime: string
  let effectiveCloseTime: string

  if (data.specialistHours.length > 0) {
    const specDayHours = data.specialistHours.find(h => h.dayOfWeek === dayOfWeek)
    if (specDayHours && specDayHours.isAvailable) {
      effectiveOpenTime = formatTime(specDayHours.openTime)
      effectiveCloseTime = formatTime(specDayHours.closeTime)
    } else {
      // El especialista no trabaja este día
      return {
        date: query.date,
        isDateAvailable: false,
        reason: 'specialist_off',
        slots: [],
        totalDurationMinutes: 0,
        totalBufferMinutes: 0
      }
    }
  } else if (dayBusinessHours && dayBusinessHours.isOpen) {
    effectiveOpenTime = formatTime(dayBusinessHours.openTime)
    effectiveCloseTime = formatTime(dayBusinessHours.closeTime)
  } else {
    return {
      date: query.date,
      isDateAvailable: false,
      reason: 'not_working_day',
      slots: [],
      totalDurationMinutes: 0,
      totalBufferMinutes: 0
    }
  }

  // Verificar disponibilidad de la fecha
  const dateCheck = checkDateAvailability(
    query.date,
    dayOfWeek,
    data.businessHours,
    data.specialistHours,
    data.blockedDates,
    data.salon?.minAdvanceHours ?? 1,
    data.salon!
  )

  if (!dateCheck.available) {
    return {
      date: query.date,
      isDateAvailable: false,
      reason: dateCheck.reason,
      slots: [],
      totalDurationMinutes: 0,
      totalBufferMinutes: 0
    }
  }

  // Calcular duración total
  const { totalDurationMinutes, totalBufferMinutes, totalBlockMinutes } =
    calculateServiceTotals(data.services)

  // Generar slots (intervalo de 30 min por defecto)
  const rawSlots = generateDaySlots(effectiveOpenTime, effectiveCloseTime, 30)

  // Filtrar por disponibilidad
  const filteredSlots = filterSlots(
    rawSlots,
    query.date,
    effectiveCloseTime,
    totalBlockMinutes,
    totalDurationMinutes,
    data.blockedSlots,
    data.existingAppointments,
    data.salon?.minAdvanceHours ?? 1
  )

  return {
    date: query.date,
    isDateAvailable: true,
    slots: filteredSlots,
    totalDurationMinutes,
    totalBufferMinutes
  }
}
```

---

## 5. Cálculo de `end_time` al crear una cita

Al guardar la cita en la base de datos, el `end_time` debe calcularse como:

```
end_time = start_time + total_duration_minutes + total_buffer_minutes
```

```typescript
function calculateEndTime(startTime: string, totalDurationMinutes: number, totalBufferMinutes: number): string {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = startMinutes + totalDurationMinutes + totalBufferMinutes

  const h = Math.floor(endMinutes / 60).toString().padStart(2, '0')
  const m = (endMinutes % 60).toString().padStart(2, '0')

  return `${h}:${m}`
}
```

El `end_time` que se almacena en `appointments` incluye el buffer. Esto es lo que se usa para el cálculo de superposiciones.

---

## 6. Casos edge a testear

| Caso | Descripción |
|------|-------------|
| Servicio de 90 min al final del día | Si el salón cierra a las 19:00, el slot de 18:00 NO debe aparecer (no caben 90 min) |
| Dos servicios seleccionados | Duración = suma de ambos + suma de buffers |
| Especialista con horario propio más corto | Solo mostrar slots dentro del horario del especialista |
| Fecha bloqueada + especialista diferente | Si la fecha está bloqueada para el salón, ningún especialista puede ser agendado |
| Fecha bloqueada solo para un especialista | Otros especialistas sí pueden ser agendados ese día |
| Slot bloqueado manualmente de 10:00 a 11:00 | Un servicio de 30 min desde las 10:30 NO debe aparecer (10:30 → 11:00, se superpone) |
| Cita existente de 09:00 a 10:00 | El slot de 09:30 NO debe aparecer si hay cita de 09:00 con duración de 60 min (termina a 10:00) |
| Anticipación mínima de 2 horas | Si son las 10:00 AM, los slots antes de las 12:00 AM del mismo día deben marcarse no disponibles |
| Sin especialista seleccionado | Mostrar disponibilidad general del salón (sin filtrar por especialista) |
| Salón sin especialistas | Mostrar slots del salón sin filtrar por disponibilidad de especialista |

---

## 7. Zona horaria

**Regla**: todas las fechas y horas se almacenan en UTC en la base de datos.

El campo `timezone` de la tabla `salons` (default `America/Panama`) se usa para:
1. Interpretar el `date` enviado por el cliente
2. Convertir las horas de `business_hours` y `specialist_hours` al calcular disponibilidad
3. Mostrar las horas en la UI del propietario y del formulario público

```typescript
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

// Convertir fecha del cliente (en timezone del salón) a UTC para guardar en DB
function toUTC(date: Date, salonTimezone: string): Date {
  return fromZonedTime(date, salonTimezone)
}

// Convertir de UTC a la zona horaria del salón para mostrar en UI
function toSalonTime(dateUTC: Date, salonTimezone: string): Date {
  return toZonedTime(dateUTC, salonTimezone)
}
```

---

## 8. Ubicación en el proyecto

El algoritmo debe vivir en:

```
lib/
  availability/
    get-available-slots.ts     ← función principal
    check-date.ts              ← paso 2
    generate-slots.ts          ← paso 4
    filter-slots.ts            ← paso 5
    calculate-end-time.ts      ← cálculo de end_time
    time-utils.ts              ← timeToMinutes, formatTime, etc.
    types.ts                   ← interfaces AvailabilityQuery, TimeSlot, etc.
  __tests__/
    availability.test.ts       ← unit tests de todos los casos edge
```

El algoritmo es una **función pura** (dado los mismos datos, mismo resultado). Esto hace que sea fácil de testear con Jest sin necesidad de mocks de base de datos.

---

## 9. API endpoint de disponibilidad

```typescript
// app/api/public/[slug]/availability/route.ts
// GET /api/public/[slug]/availability?date=2026-07-15&serviceIds=uuid1,uuid2&specialistId=uuid3

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const serviceIds = searchParams.get('serviceIds')?.split(',') ?? []
  const specialistId = searchParams.get('specialistId') ?? undefined

  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug, status: { in: ['active', 'trial'] } }
  })
  if (!salon) return Response.json({ error: 'Salon not found' }, { status: 404 })

  const result = await getAvailableSlots({
    salonId: salon.id,
    date: date!,
    serviceIds,
    specialistId
  })

  return Response.json(result)
}
```
