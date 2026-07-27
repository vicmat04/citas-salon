# Plan de Tareas: Panel Interno de Citas y Calendario (Fase 5)

## Pronóstico de Carga de Revisión

| Campo | Valor |
| --- | --- |
| Líneas estimadas | 700–1,100 |
| Riesgo de presupuesto 400 líneas | Alto |
| PRs Encadenadas Recomendadas | Sí |
| División sugerida | PR 1: Server Actions de citas y tests. PR 2: Modal de agendamiento manual. PR 3: Vistas adaptativas de citas del salón. |

---

## Tareas

### PR 1: Server Actions de Gestión de Citas y Pruebas

- [ ] Crear `app/actions/appointments.ts` con `updateAppointmentStatus` (soporta motivos de cancelación y notas internas) y `createManualAppointment` (soporta flag de sobreescritura de solapamiento `allowOverlap`).
- [ ] Crear `app/actions/appointments.test.ts` evaluando transiciones de estado, notas internas, aislación multi-tenant y creación manual autorizada.

### PR 2: Modal de Agendamiento Manual del Salón

- [ ] Crear `app/s/[slug]/(protected)/appointments/create-manual-appointment-dialog.tsx` con soporte para selección de cliente, servicios, especialista, fecha, hora y banner de advertencia de solapamiento con casilla de confirmación autorizada.

### PR 3: Vistas Adaptativas del Panel de Citas del Salón

- [ ] Actualizar `app/s/[slug]/(protected)/appointments/page.tsx` para cargar las citas reales del salón desde Prisma con sus relaciones (`customer`, `specialist`, `appointmentServices`).
- [ ] Crear `app/s/[slug]/(protected)/appointments/appointments-view.tsx` con pestañas (Hoy, Próximas, Todas), filtros (Especialista, Estado), tarjetas adaptativas `mobile-first` y menú de acciones rápidas (Atendida, No-Show, Cancelar, Reabrir, Editar notas).
- [ ] Ejecutar la suite completa de pruebas (`npx vitest run`) y verificar TypeScript (`npx tsc --noEmit`).
