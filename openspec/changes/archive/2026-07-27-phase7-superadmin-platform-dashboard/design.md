# Diseño Técnico: Panel Global de SuperAdmin y Métricas de Plataforma (Fase 7)

## Arquitectura y Flujo de Datos

Este módulo implementa el panel de control global para el administrador del SaaS (`platform_admin`), métricas de ingresos y citas a nivel plataforma, gestión de suscripciones y planes, extensión de días de trial (+7, +14, +30 días), notas administrativas privadas y notificaciones por correo SMTP.

```text
+-----------------------------------------------------------------------------------+
|                           SuperAdmin Panel (/admin/*)                             |
|       /admin/dashboard (KPIs & Alertas 7 Días)  |  /admin/salons (Filtros & Modal)  |
+-----------------------------------------------------------------------------------+
                                         |
                                (Server Actions)
                                         v
+-----------------------------------------------------------------------------------+
|                            app/actions/admin.ts                                   |
|  - updateSalonStatusAndPlan(salonId, nextStatus, planId)                          |
|  - extendSalonTrial(salonId, extraDays)                                           |
|  - updateAdminNotes(salonId, adminNotes)                                          |
|  - sendTrialExpirationNotice(salonId)                                             |
+-----------------------------------------------------------------------------------+
                     |                                   |
                     v                                   v
+-----------------------------+         +-------------------------------------------+
|    lib/email/mailer.ts      |         |   Prisma ORM & PostgreSQL Database        |
|  (Gmail API + OAuth 2.0     |         | (Salon, Subscription, Plan, Appointment,  |
|   refresh token flow)       |         |  AuditLog, User, etc.)                    |
+-----------------------------+         +-------------------------------------------+
```

---

## Módulos y Responsabilidades

### 1. Servicio de Correo Electrónico (`lib/email/mailer.ts`)

- Configuración mediante Gmail API + OAuth 2.0, sin contraseña SMTP en código:
  - `GMAIL_CLIENT_ID`: Cliente OAuth de Google Cloud.
  - `GMAIL_CLIENT_SECRET`: Secreto OAuth inyectado por entorno.
  - `GMAIL_REFRESH_TOKEN`: Token persistente para refrescar `access_token`.
  - `GMAIL_SENDER`: Remitente del sistema (`victorpty999@gmail.com`).
  - `SYSTEM_NOTIFICATION_EMAILS`: correos internos por defecto (`vicmat04@gmail.com`, `dayanisr270@gmail.com`).
- Flujo:
  - Refresca `access_token` contra `https://oauth2.googleapis.com/token`.
  - Construye correo MIME HTML.
  - Codifica el mensaje en Base64 URL-safe.
  - Envía vía `https://gmail.googleapis.com/v1/users/me/messages/send`.
- Funciones:
  - `sendEmailNotification({ to, subject, htmlBody })`: Envía correos transaccionales a uno o varios destinatarios.
  - `sendTrialExpirationEmail({ ownerEmail, ownerName, salonName, remainingDays, newEndDate, additionalNotificationEmails })`: Envía notificación formal de vencimiento de trial al dueño, a los correos internos y a los correos adicionales configurados en el salón.

---

### 2. Server Actions de SuperAdmin (`app/actions/admin.ts`)

- `updateSalonStatusAndPlan(salonId: string, nextStatus: AdminMutableSalonStatus, planId?: string)`:
  - Ejecuta `getUser` y valida `dbUser.role === 'platform_admin'`.
  - Actualiza `salon.status` y `salon.planId` en la BD de forma atómica.
  - Registra evento en `AuditLog`.
  - Revalida `/admin/dashboard`, `/admin/salons`, `/my-salons`.

- `extendSalonTrial(salonId: string, extraDays: 7 | 14 | 30)`:
  - Valida rol `platform_admin`.
  - Busca la `Subscription` activa en estado `trial` del salón.
  - Suma `extraDays` a la fecha `endDate` de la suscripción.
  - Si `salon.status` estaba en `suspended` o `cancelled`, lo cambia a `trial`.
  - Registra evento en `AuditLog` (`action: 'salon.trial.extended'`).
  - Revalida las rutas administrativas y del salón.

- `updateAdminNotes(salonId: string, adminNotes: string)`:
  - Valida rol `platform_admin`.
  - Actualiza `salon.adminNotes` en Prisma.

- `sendTrialExpirationNotice(salonId: string)`:
  - Valida rol `platform_admin`.
  - Consulta los datos del salón, dueño y fecha de fin de trial.
  - Llama a `sendTrialExpirationEmail`.

---

### 3. Vistas e Interfaces de Usuario

#### `app/admin/(protected)/dashboard/page.tsx`

- Servidor: Valida `requireAdmin()`.
- Consulta en paralelo de métricas del SaaS:
  - `totalRevenueProcessed`: Suma de `totalPriceSnapshot` de todas las citas en estado `completed`.
  - `totalAppointmentsCount`: Total de citas registradas a nivel global.
  - `activeSalons`, `trialSalons`, `suspendedSalons`, `totalUsers`.
  - `expiringSalons`: Salones en `status === 'trial'` con fecha `endDate` que vence en los próximos 7 días.
  - `recentAuditLogs`: Últimos 10 registros de auditoría.
- Renderiza tarjetas KPI globales, tabla destacada de **Alertas de Vencimiento de Trial** con acciones rápidas (Extender +7/+14/+30 días o Enviar Notificación) y tabla de auditoría.

#### `app/admin/(protected)/salons/page.tsx` y `salons-view.tsx`

- Servidor: Carga salones con relaciones `owner`, `plan`, `subscriptions`. Carga todos los `Plan` activos.
- Cliente (`salons-view.tsx`):
  - Buscador en tiempo real por Nombre, Slug o Correo del dueño.
  - Filtro desplegable por Estado y por Plan.
  - Modal de Gestión de Salón:
    - Selector de Estado y Selector de Plan Activo.
    - Botones predefinidos de Extensión de Trial (+7, +14, +30 días).
    - Editor de Notas Administrativas Privadas (`adminNotes`).
    - Botón de envío de correo de aviso.

---

## Plan de Pruebas

- `lib/email/mailer.test.ts`: Pruebas unitarias de construcción de correos.
- `app/actions/admin.test.ts`: Pruebas de integración para extensión de trial (+7, +14, +30 días), cambio de planes, notas del administrador, notificaciones por correo y validaciones de autorización de SuperAdmin.
