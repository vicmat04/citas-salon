# Diseño técnico: Notificaciones operacionales y experiencia app-like (Fase 8)

## 1. Objetivo y decisiones de diseño

La implementación usará un **outbox persistente en PostgreSQL** para separar el éxito de una cita de la entrega por Gmail. La mutación de cita y el registro del evento notificable se confirman en la misma transacción; el envío ocurre después de la respuesta mediante `after()` de Next.js y un cron recupera trabajo pendiente. Así, una caída o rechazo de Gmail no revierte la cita y el resultado queda observable.

Decisiones concretas:

- Ventana de recordatorio: **24 horas antes**. Un cron cada 15 minutos toma citas futuras cuyo inicio vigente esté entre `now()` y `now() + 24h`; la idempotencia evita repetirlas.
- Preferencia inicial del dueño: `ownerEmailNotificationsEnabled = true`; puede deshabilitarse por salón. Un kill switch de entorno permite pausar todos los envíos durante el rollout.
- El correo del dueño es `Salon.owner.email`, no `Salon.email` ni `Salon.notificationEmails`.
- `notificationEmails` queda explícitamente fuera de las notificaciones de citas. En configuración se aclarará que solo conserva su uso administrativo/de suscripción de Fase 7.
- Una dirección repetida entre roles recibe **un solo mensaje**. La entrega guarda todos los roles representados; para la plantilla se usa precedencia `client > owner > specialist` y texto neutral cuando agrupa roles.
- Reprogramar mantiene el estado activo actual (`pending` o `confirmed`); `rescheduled` no se usará como estado permanente. La reprogramación se expresa con el tipo de evento.
- No habrá reintento automático después de iniciar una llamada a Gmail: ante una respuesta ambigua se registra `failed/unknown_after_send`. Esto prioriza “como máximo una entrega efectiva” sobre reintentos que podrían duplicar correos.

## 2. Línea base actual

### Datos y autorización

- `prisma/schema.prisma` define `User`, `Salon`, `Customer`, `Specialist`, `Appointment` y `AppointmentService`.
- El correo principal del dueño está en `User.email`; `Salon.ownerId` enlaza al dueño.
- Cliente y especialista tienen `Customer.email` y `Specialist.email` opcionales.
- `Salon.notificationEmails` es un CSV introducido en Fase 7 y hoy se edita desde configuración.
- `Appointment` separa `appointmentDate` (`DATE`) de `startTime`/`endTime` (`TIME`), tiene estados de texto y relaciones al cliente, especialista y servicios.
- `lib/auth/helpers.ts` provee `requireSalonOwner(slug)` y restringe las mutaciones al dueño de un salón operativo.

### Flujos de citas

- `app/actions/booking.ts#createPublicAppointment` crea cliente/cita pública confirmada. Hoy exige correo del cliente y usa una validación mínima con `includes("@")`.
- `app/actions/appointments.ts#createManualAppointment` crea citas manuales y permite cliente sin correo.
- `app/actions/appointments.ts#updateAppointmentStatus` actualiza estado/notas y es el punto actual de cancelación.
- No existe acción ni interfaz de reprogramación. `lib/salons/availability.ts` tampoco permite excluir la propia cita al recalcular disponibilidad.
- `app/s/[slug]/(protected)/appointments/appointments-view.tsx` contiene agenda, cancelación y cambios de estado; sus botones rápidos miden actualmente 32 px de alto.
- `app/book/[slug]/booking-wizard.tsx` y `app/book/[slug]/confirmacion/page.tsx` manejan la reserva pública y confirmación.

### Correo, UI y ejecución

- `lib/email/mailer.ts` usa Gmail REST + OAuth2. Actualmente devuelve detalles con destinatarios/respuesta de proveedor y registra correo y cuerpo de error del proveedor; esa salida no es adecuada para observabilidad operacional segura.
- `sendTrialExpirationEmail` depende del contrato existente del mailer y debe conservarse funcional.
- `app/s/[slug]/(protected)/settings/settings-form.tsx` edita `notificationEmails`, pero no existe preferencia del dueño.
- Hay llamadas a `toast` de Sonner, pero no se encontró un `<Toaster>` montado; el nuevo feedback crítico no dependerá solo de toast.
- `app/layout.tsx` conserva “Create Next App”, `lang="en"`; no hay manifest, iconos PWA ni service worker.
- `app/s/[slug]/(protected)/layout.tsx` tiene navegación inferior fija sin safe-area.
- El objetivo de despliegue documentado es Vercel (`docs/DECISIONS.md`, D-08), pero no hay cron ni `vercel.json`.
- `package.json` sí incluye Vitest (`npm test`) y existen pruebas de acciones/mailer, aunque `openspec/config.yaml` quedó desactualizado y declara que no detectó runner.

## 3. Modelo de datos propuesto

Modificar `prisma/schema.prisma` y aplicar una migración versionada antes del código que escribe el outbox.

### `Salon`

```prisma
ownerEmailNotificationsEnabled Boolean @default(true) @map("owner_email_notifications_enabled")
notificationEvents AppointmentNotificationEvent[]
```

### `Appointment`

```prisma
notificationRevision Int @default(0) @map("notification_revision")
scheduleRevision     Int @default(0) @map("schedule_revision")
notificationEvents   AppointmentNotificationEvent[]
```

`notificationRevision` aumenta en cada transición notificable y permite distinguir, por ejemplo, una segunda cancelación después de reabrir. `scheduleRevision` aumenta solo cuando cambian fecha, hora, servicios o especialista y permite invalidar recordatorios basados en una agenda sustituida.

### `AppointmentNotificationEvent`

Campos:

- `id`, `salonId`, `appointmentId`.
- `type`: `created | cancelled | rescheduled | reminder_24h`.
- `eventKey String @unique`: claves `created:{appointmentId}`, `cancelled:{appointmentId}:{revision}`, `rescheduled:{appointmentId}:{scheduleRevision}` y `reminder_24h:{appointmentId}:{scheduleRevision}`.
- `scheduleRevision Int?` para verificar vigencia de recordatorios.
- `payload Json`: snapshot mínimo del evento (salón, cliente, fecha/hora, servicios, especialista, total y motivo público de cancelación si existe). Nunca incluye notas internas, cuerpo HTML, tokens o credenciales. Para recordatorios se materializa después de releer la cita vigente.
- `status`: `pending | processing | completed | partial_failed`.
- `availableAt`, `createdAt`, `completedAt`.
- Índices por `(status, availableAt)`, `(salonId, createdAt)` y `(appointmentId, createdAt)`.
- Relaciones con `Salon`/`Appointment` usando `onDelete: Cascade`.

### `AppointmentNotificationDelivery`

Campos:

- `id`, `eventId`.
- `roles String[]`: uno o más de `client`, `owner`, `specialist` después de deduplicar.
- `recipientEmail String?`: necesario mientras la entrega está en cola; nunca se devuelve a UI y se borra al alcanzar un estado final.
- `recipientMasked String?`: única representación mostrable (`m***@example.com`).
- `recipientKey String`: correo normalizado o `omitted:{role}`; `@@unique([eventId, recipientKey])`.
- `status`: `pending | sending | sent | skipped | failed`.
- `resultCode`: código controlado, por ejemplo `missing_email`, `invalid_email`, `owner_disabled`, `duplicate_merged`, `provider_rejected`, `oauth_failed`, `network_error`, `unknown_after_send`.
- `attemptCount`, `startedAt`, `sentAt`, `createdAt`, `updatedAt`.
- Índices por `(status, createdAt)` y `eventId`.

La UI traduce `sent/skipped/failed` a `enviada/omitida/fallida`; `pending/sending` se muestra solo como “procesando”. Una entrega `sending` estancada se marca `failed/unknown_after_send` y no se reenvía automáticamente. Al finalizar se elimina `recipientEmail`, conservando solo el valor enmascarado; eventos y snapshots se purgan a los 90 días.

## 4. Arquitectura del servicio de notificaciones

Crear `lib/notifications/`:

| Archivo | Responsabilidad |
| --- | --- |
| `types.ts` | Tipos de evento, rol, snapshot y resultado sanitizado. |
| `email-validation.ts` | Normalización en minúsculas, validación estricta y enmascarado. |
| `recipient-resolver.ts` | Evalúa cliente, `salon.owner.email` + preferencia y especialista; crea omisiones y fusiona correos repetidos. Ignora siempre `notificationEmails`. |
| `appointment-snapshot.ts` | Construye snapshot sin notas internas y formatea fecha/hora usando `Salon.timezone`. |
| `templates.ts` | Asunto y HTML responsive por evento/rol; escapa todo valor dinámico y elimina CR/LF del asunto. |
| `enqueue.ts` | Inserta evento y entregas dentro de la transacción Prisma; trata conflicto de `eventKey` como operación idempotente. |
| `dispatcher.ts` | Reclama entregas con actualización condicional `pending -> sending`, renderiza, llama al mailer y persiste resultado. |
| `observability.ts` | Proyecta solo roles, estado, código, fecha y correo enmascarado para usuarios autorizados. |
| `reminders.ts` | Descubre candidatos, verifica vigencia y crea eventos `reminder_24h`. |

Refactorizar `lib/email/mailer.ts` sin romper `sendTrialExpirationEmail`:

- Añadir un envío unitario que retorne únicamente `{ accepted: boolean, providerMessageId?: string, errorCode?: SafeEmailErrorCode }`.
- No registrar dirección completa, respuesta cruda de Google, access/refresh tokens ni cuerpo HTML. Logs estructurados: `eventId`, `deliveryId`, tipo y `errorCode`.
- Reutilizar el access token durante una invocación cuando sea posible.
- Procesar destinatarios con aislamiento (`Promise.allSettled` y concurrencia máxima 3); un rechazo no corta los demás.

### Flujo de datos

```text
Server Action
  -> autoriza y valida
  -> transacción: muta cita + snapshot + evento + entregas
  -> commit de la cita
  -> after(() => dispatchEvent(eventId))
  -> respuesta { success, notification: { state: "queued" } }

Cron autenticado
  -> crea recordatorios elegibles con eventKey único
  -> recupera eventos/entregas pendientes de cualquier tipo
  -> reclama cada entrega una sola vez
  -> Gmail
  -> sent | skipped | failed sanitizado
```

`after()` mejora la inmediatez, pero no es la garantía de entrega; el cron recupera pendientes si la función posterior no se ejecuta. Ni `after` ni el cron propagan fallos hacia la operación de cita.

## 5. Integración con creación, cancelación y reprogramación

### Creación pública y manual

Refactorizar `createPublicAppointment` y `createManualAppointment` para que cliente, cita, servicios y outbox se creen mediante una transacción interactiva. Después del commit se llama `after()`.

- En booking público, el correo pasa a ser **opcional**: vacío se acepta; un valor no vacío e inválido se rechaza. Se actualizan etiqueta y `required` en `booking-wizard.tsx`.
- Resultado común:

```ts
{
  success: true,
  appointmentId: string,
  notification: { state: "queued" as const }
}
```

La falta de todos los correos produce entregas `skipped`; no cambia el resultado anterior.

### Cancelación

`updateAppointmentStatus` solo encola `cancelled` cuando la transición confirmada es desde `pending|confirmed` a `cancelled`. Guardar notas, completar, marcar no-show o reabrir no genera correo. Una cancelación rechazada o repetida no crea evento.

La actualización, incremento de revisión notificable y evento se escriben en una transacción. El motivo de cancelación puede entrar al snapshot como texto para destinatarios; nunca se copia `internalNotes` completo.

### Reprogramación

Agregar en `app/actions/appointments.ts`:

```ts
rescheduleAppointment(
  appointmentId: string,
  formData: FormData,
  slug: string,
): Promise<ActionResult>
```

Contrato de entrada: `date`, `startTime`, `serviceIds`, `specialistId`, `allowOverlap`. Solo `pending|confirmed` es reprogramable. Reutiliza cálculo de duración/precio y amplía `getAvailableSlots` con `excludeAppointmentId` para no detectar la propia cita como solape.

En una transacción:

1. releer y bloquear lógicamente la cita del salón;
2. actualizar fecha/hora/especialista, duración, total y conservar estado activo;
3. reemplazar `AppointmentService` y sus snapshots;
4. incrementar `scheduleRevision`;
5. marcar recordatorios `pending` de revisiones previas como `skipped/appointment_rescheduled`;
6. insertar evento `rescheduled` con datos nuevos.

La agenda añade diálogo “Reprogramar” reutilizando controles de cita manual. Si la cita cambia mientras el recordatorio compite, el cambio de `pending -> sending` es el punto de orden: una revisión que ya no coincide antes de ese punto se omite.

## 6. Scheduler de recordatorios e idempotencia

Agregar `app/api/cron/notifications/route.ts` (runtime Node) y `vercel.json` con `*/15 * * * *`. El handler exige `Authorization: Bearer ${CRON_SECRET}` y responde solo contadores sanitizados. Un scheduler externo puede llamar al mismo endpoint si el plan Vercel no admite esa frecuencia.

Configuración:

- `APPOINTMENT_REMINDERS_ENABLED=true|false`.
- `APPOINTMENT_REMINDER_HOURS=24` (en esta fase solo se admite 24).
- `OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED=true|false` como kill switch global.
- `CRON_SECRET` obligatorio en producción.
- `NOTIFICATION_RETENTION_DAYS=90`; el mismo cron elimina por lotes eventos finalizados más antiguos.

Elegibilidad se calcula en PostgreSQL combinando las columnas existentes:

```sql
(appointment_date + start_time) AT TIME ZONE salons.timezone
```

Solo se consideran `pending|confirmed`, inicio futuro y no posterior a `now() + interval '24 hours'`. Se usa SQL parametrizado para obtener IDs y luego Prisma relee relaciones vigentes. Esto evita depender de la zona horaria del proceso Node.

Antes de crear/reclamar cada recordatorio se releen estado, `scheduleRevision`, fecha/hora, servicios, especialista, correos y preferencia. La clave única `reminder_24h:{appointmentId}:{scheduleRevision}` hace idempotentes invocaciones repetidas y concurrentes. Un recordatorio de revisión antigua queda omitido; una reprogramación futura genera una nueva ventana lógica cuando corresponda.

Procesamiento por invocación: hasta 100 candidatos y 20 entregas, concurrencia de Gmail 3, dejando backlog para el cron siguiente. El fallo de una entrega usa `allSettled`, no modifica citas ni detiene el lote.

Límite reconocido: Gmail API no ofrece una idempotency key transaccional. Para cumplir at-most-once, una entrega reclamada no se reintenta automáticamente si la respuesta fue ambigua. Se gana protección contra duplicados a costa de una posible entrega perdida, visible como fallida.

## 7. Configuración, observabilidad y feedback UI

### Configuración

Cambios en `app/actions/owner.ts`, `settings/page.tsx` y `settings-form.tsx`:

- Añadir checkbox táctil “Recibir en mi correo las notificaciones de citas”.
- Mostrar el correo del dueño enmascarado y explicar que cliente/especialista no dependen del toggle.
- Parsear ausencia del checkbox como `false` y persistir `ownerEmailNotificationsEnabled`.
- Mantener `notificationEmails`, pero cambiar su ayuda a: “Correos adicionales para alertas administrativas/de suscripción; no reciben notificaciones de citas”.
- Feedback inline persistente además de toast.

### Agenda y booking

- `appointments/page.tsx` consulta las entregas recientes por cita y pasa una proyección sanitizada.
- Cada tarjeta muestra resumen “Correo: 2 enviadas · 1 omitida” y un detalle accesible por rol(es), estado, fecha, correo enmascarado y razón segura. Solo el dueño autorizado accede a estos datos.
- Creación manual, cancelación y reprogramación muestran primero “Cita actualizada” y por separado “Notificación en proceso”; nunca presentan la cita como fallida por correo.
- La confirmación pública muestra un texto genérico: “Tu cita está confirmada; si proporcionaste un correo válido, la confirmación está en proceso”. No expone estados de dueño/especialista.

## 8. PWA y UX móvil

### Identidad e instalación

- `app/layout.tsx`: `lang="es"`, título “Citas Salón”, descripción, `applicationName`, referencia al manifest, Apple Web App y export separado de `viewport` con `viewportFit: "cover"` y `themeColor`.
- `app/manifest.ts`: nombre, `short_name`, `start_url: "/"`, `display: "standalone"`, colores e iconos.
- Activos: `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png` y `apple-touch-icon.png`.
- `public/sw.js` + `app/pwa-register.tsx`: service worker mínimo de red, sin caché ni rutas offline, para instalación progresiva. Se registra solo en producción/HTTPS y no intercepta datos de citas.

### Pulido por prioridad

1. `booking-wizard.tsx` y confirmación: botones/slots de al menos 44 px, cards clicables convertidas en botones accesibles, resumen visible, email opcional y feedback separado.
2. Agenda: acciones mínimas de 44 px, filtros sin overflow, diálogo de reprogramación y estado de notificación.
3. `customers-view.tsx`: historial apilado en pantallas estrechas, áreas táctiles y contacto legible.
4. Settings: grids `grid-cols-1 sm:grid-cols-2`, toggle y ayuda legibles.
5. SuperAdmin: solo correcciones globales de overflow/tamaño táctil derivadas del layout; sin rediseño.

`app/globals.css` añadirá `overscroll-behavior-y`, `-webkit-tap-highlight-color`, y utilidades de safe-area. `app/s/[slug]/(protected)/layout.tsx` usará `padding-bottom: env(safe-area-inset-bottom)` en nav y sumará esa altura al padding del contenido. No se agrega Web Push, caché offline, SMS/WhatsApp ni empaquetado nativo.

## 9. Archivos previstos

- Datos: `prisma/schema.prisma` y nueva migración Prisma.
- Correo/notificaciones: `lib/email/mailer.ts`, `lib/notifications/*`.
- Acciones: `app/actions/booking.ts`, `appointments.ts`, `owner.ts`.
- Scheduler: `app/api/cron/notifications/route.ts`, `vercel.json`, documentación de variables de entorno.
- UI: booking/confirmación, agenda/page/dialogs, CRM, settings y layout protegido.
- PWA: `app/layout.tsx`, `app/manifest.ts`, `app/pwa-register.tsx`, `app/globals.css`, `public/sw.js`, `public/icons/*`.
- Pruebas: suites existentes y nuevas pruebas focalizadas de notificaciones/cron.

## 10. Pruebas y verificación

El repositorio dispone de Vitest aunque OpenSpec no lo detectó. Verificación automatizada:

- `npm test`: resolver (faltante, inválido, dueño deshabilitado, especialista, deduplicación), escape/plantillas, sanitización del mailer, claim atómico, fallo aislado y recordatorios.
- Actualizar `booking.test.ts`, `appointments.test.ts` y `owner.test.ts` para eventos solo después de mutaciones exitosas, cancelación única, reprogramación autorizada y preferencia.
- Probar el route handler: secreto ausente/incorrecto, kill switch, candidato futuro, cancelado/pasado, revisión sustituida y dos invocaciones concurrentes con un solo `eventKey`.
- `npm run lint` como control obligatorio.
- `npm run build` para validar Prisma/Next metadata, manifest y límites Server/Client.

Verificación manual en staging:

- Forzar Gmail sin credenciales/rechazo y confirmar que crear/cancelar/reprogramar sigue exitoso y muestra `fallida` sanitizada.
- Ejecutar dos llamadas concurrentes al cron y comprobar una sola entrega por evento/dirección.
- Reprogramar/cancelar una candidata antes del claim y confirmar que se omite el recordatorio viejo.
- Revisar 320, 375 y 390 px, teclado móvil, safe-area de iPhone y landscape.
- Validar manifest/iconos/service worker en DevTools/Lighthouse, instalación en Chrome Android y “Añadir a inicio” en Safari iOS; confirmar que sin service worker el sitio web crítico sigue navegable.

## 11. Rollout, rollback y operación

1. Aplicar migración con defaults e índices; verificar que no altera citas existentes.
2. Desplegar con `OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED=false` y cron autenticado; validar creación de outbox sin envío.
3. Activar envíos en staging, luego producción; observar conteos por código, sin PII en logs.
4. Activar recordatorios después de validar consulta temporal y backlog.
5. Comunicar a dueños que la preferencia inicia habilitada y dónde desactivarla.

Rollback: deshabilitar envíos y recordatorios por entorno; no hace falta revertir citas. Se puede retirar `after()` conservando cron/outbox. PWA y pulido visual se revierten independientemente. Las columnas/tablas nuevas permanecen hasta una migración posterior para no perder trazabilidad.

## 12. Tradeoffs, riesgos y mitigaciones

| Riesgo/tradeoff | Mitigación |
| --- | --- |
| Outbox añade tablas, transacciones y complejidad frente a llamar Gmail directamente. | Garantiza observabilidad y desacopla proveedor de la cita. |
| Default `true` puede sorprender a salones existentes. | Texto claro, comunicación, toggle y kill switch global. |
| Exactamente-una-vez no es demostrable con Gmail. | Claim atómico y no reintentar estados ambiguos; documentar pérdida potencial. |
| Cron cada 15 min puede no estar disponible en todos los planes Vercel. | Endpoint portable y scheduler externo autenticado. |
| Query temporal por `DATE + TIME` y timezone es sensible. | Ejecutarla en PostgreSQL con timezone del salón y cubrir casos de frontera. |
| `after()` está ligado al runtime de Next/Vercel. | Cron es la ruta de recuperación; no se usa fire-and-forget sin persistencia. |
| Datos de correo persisten en la cola. | Acceso solo servidor, UI enmascarada, sin cuerpos/tokens y borrado/retención futura documentable. |
| El service worker puede cachear accidentalmente datos. | Worker sin caché ni fetch handler; no implementar offline. |
| La reprogramación es capacidad nueva, no solo un hook. | Acción tenant-safe, exclusión de cita actual, validación y pruebas dedicadas. |

## 13. Previsión de revisión y slices

Estimación: **1,100–1,500 líneas cambiadas**, más cuatro iconos binarios; excede ampliamente el presupuesto de 400 líneas. Aunque la estrategia por defecto sea un solo PR, una sola revisión no es recomendable.

Slices sugeridos, cada uno desplegable detrás de flags:

1. **Datos + núcleo de notificaciones** (350–400 líneas): migración, resolver, templates, wrapper sanitizado y pruebas.
2. **Hooks de ciclo de vida + UI de preferencia/observabilidad** (350–400): creación, cancelación, settings y agenda.
3. **Reprogramación + recordatorios/cron** (350–400): acción/UI, schedule revision, endpoint e idempotencia.
4. **PWA + pulido móvil** (250–350): manifest, activos, worker, safe-area y pantallas prioritarias.

Si se mantiene un único PR por política, usar estos mismos cuatro commits/checkpoints y exigir revisión incremental; esto mejora navegación, aunque no reduce el tamaño final del PR.
