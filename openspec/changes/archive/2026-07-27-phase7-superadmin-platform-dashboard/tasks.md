# Plan de Tareas: Panel Global de SuperAdmin y Métricas de Plataforma (Fase 7)

## Pronóstico de Carga de Revisión

| Campo | Valor |
| --- | --- |
| Líneas estimadas | 750–1,100 |
| Riesgo de presupuesto 400 líneas | Alto |
| PRs Encadenadas Recomendadas | Sí |
| División sugerida | PR 1: Servicio SMTP y Server Actions de SuperAdmin. PR 2: Dashboard enriquecido con KPIs y alertas de trial. PR 3: Vista dinámica de salones con filtros, planes y extensión de trial. |

---

## Tareas

### PR 1: Gmail API OAuth 2.0, Configuración de Destinatarios y Server Actions de SuperAdmin

- [x] Crear `lib/email/mailer.ts` con Gmail API + OAuth 2.0 (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER`) y función `sendTrialExpirationEmail`.
- [x] Agregar `salon.notificationEmails` para que el propietario configure correos adicionales que recibirán notificaciones del salón.
- [x] Actualizar el panel de configuración del propietario para editar los correos adicionales de notificación.
- [x] Actualizar `app/actions/admin.ts` con `updateSalonStatusAndPlan`, `extendSalonTrial` (opciones predefinidas 7, 14, 30 días), `updateAdminNotes` y `sendTrialExpirationNotice`.
- [x] Actualizar pruebas de correo, configuración del salón y acciones de SuperAdmin.

### PR 2: Dashboard Enriquecido con KPIs y Alertas de Trial 7 Días

- [x] Actualizar `app/admin/(protected)/dashboard/page.tsx` agregando KPIs globales de ingresos procesados ($) y citas totales, sección destacada de **Salones Próximos a Vencer Trial (Próximos 7 días)** con botones de extensión directa y envío de correo, y registro de auditoría (`AuditLog`).

### PR 3: Vista Dinámica de Salones con Filtros, Planes y Extensión de Trial

- [x] Actualizar `app/admin/(protected)/salons/page.tsx` y crear `app/admin/(protected)/salons/salons-view.tsx` con buscador en tiempo real por nombre/email/slug, filtros por estado y plan, y modal de gestión integral (estado, asignación de plan, extensión de trial +7/+14/+30 días y notas administrativas `adminNotes`).
- [x] Ejecutar la suite completa de pruebas (`npx vitest run`) y verificar TypeScript (`npx tsc --noEmit`).
