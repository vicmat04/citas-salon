# Propuesta: Panel Global de SuperAdmin y Métricas de Plataforma (Fase 7)

## Intención

Brindar al administrador de la plataforma (`platform_admin`) un centro de control integral para monitorear el rendimiento global del SaaS, gestionar salones y suscripciones, extender períodos de prueba con opciones predefinidas (+7, +14, +30 días), cambiar planes de pago, redactar notas administrativas internas y supervisar las alertas de vencimiento de trial.

Este módulo transforma `/admin/dashboard` y `/admin/salons` en herramientas avanzadas de monitoreo de KPIs (citas globales, ingresos procesados, salones destacados) e integra el diseño para notificaciones por correo electrónico de vencimiento de prueba.

## Decisiones de Producto Confirmadas

1. **Extensión de Trial con Opciones Predefinidas**:
   - El SuperAdmin puede extender el período de prueba de cualquier salón seleccionando entre opciones predeterminadas (+7 días, +14 días, +30 días).
   - Se actualiza automáticamente la fecha `endDate` de la suscripción y se registra en `AuditLog`.

2. **Asignación y Cambio de Plan de Pago**:
   - Al cambiar el estado de un salón a `active` o en cualquier momento, el SuperAdmin puede seleccionar qué plan asignarle (*Básico*, *Pro*, etc.).

3. **Métricas y KPIs Globales del SaaS**:
   - En `/admin/dashboard`:
     - Total acumulado de ingresos procesados por la plataforma (suma de citas `completed`).
     - Total de citas procesadas a nivel global.
     - Ranking de salones destacados por volumen de citas e ingresos.
     - Gráfico/distribución de salones por estado y por plan.

4. **Alertas de Vencimiento de Trial y Notificaciones por Correo**:
   - Sección destacada en el dashboard con salones que vencen en los próximos 7 días.
   - Infraestructura y acción para envío de alerta de vencimiento por correo electrónico al dueño del salón y copia al SuperAdmin (preparado para integrar el proveedor SMTP/Resend con las credenciales que suministrará el usuario).

5. **Notas Administrativas Privadas (`adminNotes`)**:
   - Campo para que el SuperAdmin guarde observaciones internas de gestión sobre el salón.

## Alcance

### Dashboard de SuperAdmin (`app/admin/(protected)/dashboard/page.tsx`)

- KPIs globales: Ingresos totales procesados ($), Total citas globales, Salones activos, Salones en trial, Salones suspendidos.
- Tabla de **Salones Próximos a Vencer Trial (Próximos 7 días)** con días restantes y botón de acción directa.
- Registro reciente de auditoría (`AuditLog`).

### Gestión de Salones y Suscripciones (`app/admin/(protected)/salons/`)

- Buscador en tiempo real por nombre de salón, slug o email del dueño.
- Filtros por estado (`trial`, `active`, `suspended`, `cancelled`) y por plan.
- Modal de Gestión de Salón:
  - Cambio de estado.
  - Selección de plan activo (`planId`).
  - Botones de Extensión de Trial (+7, +14, +30 días).
  - Editor de notas administrativas (`adminNotes`).

### Server Actions (`app/actions/admin.ts`)

- Extender `updateSalonStatus` (soporta selección de `planId`).
- `extendSalonTrial(salonId, extraDays)`: Amplía la fecha de fin de prueba.
- `updateAdminNotes(salonId, notes)`: Guarda notas internas del administrador.
- `sendTrialExpirationNotice(salonId)`: Acción de notificación de vencimiento por correo.

## Áreas Afectadas

| Área | Cambio |
| --- | --- |
| `app/actions/admin.ts` | Server Actions para extender trial, actualizar planes, notas administrativas y notificaciones. |
| `app/actions/admin.test.ts` | Pruebas de integración de Server Actions de SuperAdmin. |
| `app/admin/(protected)/dashboard/page.tsx` | Dashboard enriquecido con KPIs globales, ranking de salones y lista de trials por vencer. |
| `app/admin/(protected)/salons/page.tsx` | Carga protegida con datos reales de salones, planes y notas. |
| `app/admin/(protected)/salons/salons-view.tsx` | Vista dinámica con buscador, filtros y modal de gestión de suscripciones y extensión de trial. |

## No Objetivos

- Cobro directo de tarjetas de crédito del SaaS en esta fase.

## Criterios de Éxito

1. `/admin/dashboard` muestra los KPIs reales de ingresos procesados, citas totales y la lista de salones que vencen en los próximos 7 días.
2. El SuperAdmin puede extender el trial de un salón por +7, +14 o +30 días actualizando la suscripción.
3. El SuperAdmin puede cambiar el estado y el plan asignado a cualquier salón.
4. El SuperAdmin puede guardar y consultar notas administrativas privadas por salón.
5. El buscador de salones permite filtrar por nombre, slug o email del dueño.
6. Todos los 181+ tests existentes y los nuevos tests de SuperAdmin pasan al 100% en verde.
