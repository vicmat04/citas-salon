# Exploración: phase7-superadmin-platform-dashboard

## Análisis del Estado Actual

- **Rutas de SuperAdmin (`app/admin/(protected)/`):**
  - `/admin/dashboard`: Muestra tarjetas simples con contadores de salones activos, en prueba, suspendidos y total de dueños.
  - `/admin/salons`: Lista de salones con `StatusControl` (cambio de estado entre `active`, `trial`, `suspended`) y `CreateSalonDialog`.
  - `/admin/login`: Pantalla de inicio de sesión para el SuperAdmin.

- **Modelos y Persistencia en Prisma (`schema.prisma`):**
  - `User`: `role = 'platform_admin'`.
  - `Salon`: `id`, `name`, `slug`, `status`, `ownerId`, `planId`, `adminNotes`, `bookingRangeDays`, `minAdvanceHours`, `createdAt`.
  - `Subscription`: `id`, `salonId`, `planId`, `status` (`active`, `trial`, `cancelled`), `startDate`, `endDate`.
  - `AuditLog`: `id`, `salonId`, `userId`, `action`, `entityType`, `entityId`, `metadata`, `createdAt`.
  - `Appointment`: `id`, `salonId`, `status`, `totalPriceSnapshot`, `createdAt`.

## Análisis de Brechas (Reglas de Negocio)

1. **Gestión Completa de Suscripciones y Extensión de Trial:**
   - **Necesidad:** El SuperAdmin debe poder extender los días de trial de un salón o cambiar manualmente el plan asignado (`planId`) desde la interfaz de salones.
   - **Notas Administrativas (`adminNotes`):** Poder agregar observaciones internas de SuperAdmin sobre un salón (ej: "Acordó pago por transferencia bancaria el 30/08").

2. **Métricas Financieras y de Actividad Global del SaaS:**
   - **Necesidad:** En `/admin/dashboard`:
     - Volumen total de citas procesadas a nivel plataforma.
     - Estimado de ingresos procesados por salones (suma de `totalPriceSnapshot` de citas `completed`).
     - Lista de **salones próxmos a vencer su trial** (con días restantes e indicador visual).
     - Registro reciente de auditoría (`AuditLog`) para monitorear acciones administrativas.

3. **Búsqueda y Filtros de Salones:**
   - **Necesidad:** En `/admin/salons`:
     - Buscador por Nombre, Slug o Correo del Dueño.
     - Filtros por Estado (`trial`, `active`, `suspended`, `cancelled`) y por Plan.
     - Detalle del Salón (modal con información del dueño, fecha de registro, notas del admin y extensión de trial).

## Propuesta de Cambios Arquitectónicos

1. **Server Actions (`app/actions/admin.ts`):**
   - Extender `updateSalonStatus` y agregar:
     - `extendSalonTrial(salonId, extraDays, slug)`: Amplía la fecha `endDate` del registro `Subscription` y revalida.
     - `updateSalonAdminNotes(salonId, notes)`: Guarda observaciones internas del SuperAdmin.
     - `changeSalonPlan(salonId, planId)`: Asigna o cambia el plan del salón.

2. **Vistas e Interfaces de Usuario (`app/admin/(protected)/`):**
   - `/admin/dashboard/page.tsx`: Enriquecer con gráfico/tarjetas de citas procesadas, ingresos globales, lista de trials por vencer y registro de auditoría.
   - `/admin/salons/salons-view.tsx`: Vista dinámica de salones con buscador, filtros y modal de gestión integral (estado, días de trial, plan, notas admin).
