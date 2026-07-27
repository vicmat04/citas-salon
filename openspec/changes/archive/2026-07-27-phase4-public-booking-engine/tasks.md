# Plan de Tareas: Motor de Disponibilidad y Reserva Pública (Fase 4)

## Pronóstico de Carga de Revisión

| Campo | Valor |
| --- | --- |
| Líneas estimadas | 800–1,200 |
| Riesgo de presupuesto 400 líneas | Alto |
| PRs Encadenadas Recomendadas | Sí |
| División sugerida | PR 1: Motor de disponibilidad y tests. PR 2: Server Actions de reserva y tests. PR 3: Vistas públicas y wizard de reserva. |

---

## Tareas

### PR 1: Motor de Disponibilidad en Tiempo Real

- [ ] Crear `lib/salons/availability.ts` con `calculateServicesTotalDuration`, `getCandidateSpecialists` y `getAvailableSlots`.
- [ ] Crear `lib/salons/availability.test.ts` evaluando duraciones acumuladas, buffers, rangos de horarios del salón/especialista, bloqueos y citas previas.

### PR 2: Server Actions de Reserva Pública

- [ ] Crear `app/actions/booking.ts` con `getAvailableSlotsAction` y `createPublicAppointment` (validación de salón operativo, re-evaluación atómica de slots, creación/vincular `Customer`, creación de `Appointment` estado `confirmed` y `AppointmentService`).
- [ ] Crear `app/actions/booking.test.ts` evaluando la creación limpia de citas y prevención de reservas duplicadas.

### PR 3: Vistas Públicas del Salón y Wizard de Reserva

- [ ] Actualizar `app/[slug]/page.tsx` para cargar los datos e imágenes del salón y su catálogo real desde Prisma.
- [ ] Crear `app/book/[slug]/booking-wizard.tsx` y actualizar `app/book/[slug]/page.tsx` con el wizard interactivo de 4 pasos (Servicios, Especialista, Fecha/Slot, Datos cliente).
- [ ] Actualizar `app/book/[slug]/confirmacion/page.tsx` para cargar la cita real creada desde Prisma y generar el enlace de constancia para WhatsApp.
- [ ] Ejecutar la suite completa de pruebas (`npx vitest run`) y verificar TypeScript (`npx tsc --noEmit`).
