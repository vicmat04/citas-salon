# Especificación: Panel Global de SuperAdmin y Métricas de Plataforma (Fase 7)

## Propósito

Definir las reglas de autorización, contratos API, cálculo de KPIs globales del SaaS, extensión de días de prueba, actualización de planes y notificaciones para el panel de administración global (`platform_admin`).

---

## Requisitos y Especificaciones Ejecutables

### 1. Autorización de SuperAdmin

- Todas las Server Actions y vistas en `/admin/*` DEBEN verificar que el usuario autenticado tenga el rol `platform_admin`.
- Intentos por usuarios no administradores o no autenticados deben retornar `{ ok: false, code: 'UNAUTHORIZED' }` o redirigir a `/admin/login`.

---

### 2. Extensión de Días de Trial (`extendSalonTrial`)

#### 2.1 Entradas y Validación

- **Entradas:** `salonId` (UUID), `extraDays` (7, 14, o 30).
- **Validación:**
  - `extraDays` debe ser estrictamente `7`, `14` o `30`.
  - El salón debe existir.
- **Comportamiento:**
  - Buscar la `Subscription` activa en estado `trial` del salón.
  - Si existe `endDate`, sumar `extraDays` a la fecha `endDate`. Si no existe `endDate`, establecer `endDate = hoy + extraDays`.
  - Si el salón estaba en estado `suspended` o `cancelled` por fin de prueba, cambiar `salon.status` de regreso a `trial`.
  - Registrar evento en `AuditLog` (`action: 'salon.trial.extended'`, `metadata: { extraDays, newEndDate }`).
  - Revalidar `/admin/dashboard`, `/admin/salons`, `/my-salons` y `/s/${slug}/dashboard`.

---

### 3. Asignación de Plan, Notas Administrativas y Destinatarios de Notificación (`updateSalonDetails`)

#### 3.1 Cambio de Plan y Estado (`updateSalonStatusAndPlan`)

- **Entradas:** `salonId`, `nextStatus` (`trial`, `active`, `suspended`), `planId` (UUID opcional).
- **Comportamiento:**
  - Actualiza `salon.status` y `salon.planId` en la BD.
  - Registra evento en `AuditLog`.

#### 3.2 Notas Administrativas (`updateAdminNotes`)

- **Entradas:** `salonId`, `adminNotes` (string).
- **Comportamiento:** Actualiza `salon.adminNotes` en la BD para almacenar observaciones internas del SuperAdmin.

#### 3.3 Correos Adicionales de Notificación del Salón

- **Campo:** `salon.notificationEmails` (string CSV opcional).
- **Configuración:** El propietario del salón puede agregar correos adicionales desde su panel de configuración.
- **Comportamiento:** Las notificaciones críticas del salón deben enviarse al cliente cuando aplique, al propietario, a los correos internos de plataforma y a los correos adicionales configurados.

---

### 4. Gmail API OAuth 2.0 para Correo Transaccional

- El sistema DEBE enviar correos desde el remitente configurado en `GMAIL_SENDER` usando Gmail API + OAuth 2.0 con refresh token persistente.
- El sistema NO DEBE depender de contraseña SMTP ni guardar secretos OAuth en el repositorio.
- Variables requeridas en entorno: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER`.
- Variables recomendadas: `SYSTEM_NOTIFICATION_EMAILS` para copias internas de plataforma, por defecto `vicmat04@gmail.com` y `dayanisr270@gmail.com`.
- El servicio debe construir mensajes MIME HTML, codificarlos como Base64 URL-safe y enviarlos contra `https://gmail.googleapis.com/v1/users/me/messages/send`.

---

### 5. Cálculo de KPIs Globales del SaaS

#### 5.1 Métricas del Dashboard

- **Ingresos totales procesados (`totalRevenueProcessed`):**
  - Suma de `totalPriceSnapshot` de todas las citas en estado `completed` a nivel plataforma.
- **Total citas procesadas (`totalAppointmentsCount`):**
  - Conteo total de citas agendadas en la plataforma (`Appointment.count()`).
- **Salones Próximos a Vencer (Alertas 7 Días):**
  - Filtra salones en `status === 'trial'` cuya suscripción `endDate` venza entre hoy y hoy + 7 días.

---

## Seguridad y Auditoría

- Todas las mutaciones generan un registro inmutable en la tabla `AuditLog` asociando el `userId` del SuperAdmin.
