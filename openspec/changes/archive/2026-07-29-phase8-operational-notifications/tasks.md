# Tareas: Notificaciones operacionales y experiencia app-like

## Review Workload Forecast

| Field | Value |
| ------- | ------- |
| Estimated changed lines | 1,100–1,500 líneas, más cuatro iconos binarios |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 Datos + núcleo → PR 2 Hooks + settings/observabilidad → PR 3 Reprogramación + cron → PR 4 PWA + móvil |
| Delivery strategy | ask-on-risk |
| Chain strategy | four-slice-chain-approved |

Decision needed before apply: Resolved — user selected option A, four PRs/slices.
Chained PRs recommended: Yes
Chain strategy: four-slice-chain-approved
400-line budget risk: High

> **Gate de apply:** resuelto. El usuario aprobó la cadena de cuatro PRs/slices. La implementación debe avanzar slice por slice, empezando por PR 1: Datos + núcleo de notificaciones. No implementar slices posteriores hasta completar/verificar el slice vigente y recibir autorización interactiva para continuar.

## Slice 1 — Datos + núcleo de notificaciones (PR 1, 350–400 líneas)

**Inicio:** modelo actual de Prisma y mailer Gmail. **Fin:** outbox persistente, composición segura y despacho aislado detrás del kill switch. **Rollback:** desactivar `OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED`; conservar tablas y eventos para trazabilidad.

- [x] **RED:** Crear `lib/notifications/{email-validation,recipient-resolver,templates,observability,dispatcher}.test.ts` y ampliar `lib/email/mailer.test.ts` para fijar normalización/invalidación/enmascarado, elegibilidad independiente, dueño deshabilitado, deduplicación de roles, escape HTML/asunto, sanitización y aislamiento de fallos. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Modificar `prisma/schema.prisma` y crear `prisma/migrations/<timestamp>_appointment_notification_outbox/migration.sql` con `Salon.ownerEmailNotificationsEnabled`, revisiones de `Appointment`, y los modelos/indexes/constraints `AppointmentNotificationEvent` y `AppointmentNotificationDelivery` definidos en `design.md`; verificar que las relaciones y cascadas preservan aislamiento por `salonId`. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Implementar `lib/notifications/{types,email-validation,recipient-resolver,appointment-snapshot,templates,enqueue,dispatcher,observability}.ts`: snapshots sin notas internas, claves de evento idempotentes, entregas omitidas, deduplicación cliente/dueño/especialista sin usar `Salon.notificationEmails`, claim condicional y proyección únicamente enmascarada. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Refactorizar `lib/email/mailer.ts` para ofrecer envío unitario con resultado seguro, reutilizar token por invocación y limitar concurrencia a tres; conservar el contrato y las pruebas de `sendTrialExpirationEmail`, eliminando logs de correos completos, cuerpos, tokens y respuestas crudas del proveedor. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Ejecutar `npm test -- lib/notifications lib/email/mailer.test.ts` con casos de correo ausente, inválido, repetido, proveedor rechazado y respuesta ambigua; confirmar que cada resultado persiste `sent|skipped|failed` y que ningún dato expuesto contiene PII sin máscara. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Revisar `lib/notifications/*` y `lib/email/mailer.ts` para centralizar códigos seguros, tipos de evento/rol y límites de concurrencia, manteniendo `recipientEmail` exclusivamente del lado servidor y eliminándolo al finalizar la entrega. <!-- sdd-owner: implementation -->

## Slice 2 — Hooks de citas + settings/observabilidad (PR 2, 350–400 líneas)

**Inicio:** Slice 1 migrado y núcleo disponible. **Fin:** eventos de creación/cancelación confirmada y preferencia/estado visibles sin confundir el éxito de la cita. **Rollback:** kill switch o retiro de los hooks `after()` sin revertir citas ni outbox.

- [x] **RED:** Ampliar `app/actions/{booking,appointments,owner}.test.ts` para exigir transacción cita+outbox, correo público opcional pero válido si se informa, evento solo tras creación confirmada, una sola cancelación desde `pending|confirmed`, y persistencia del toggle del dueño. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Refactorizar `app/actions/booking.ts#createPublicAppointment` y `app/actions/appointments.ts#createManualAppointment` a transacciones interactivas que creen/actualicen cliente, cita, servicios y evento `created`; disparar `after(() => dispatchEvent(...))` tras commit y devolver `notification.state: "queued"` sin propagar fallos de correo. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Actualizar `app/actions/appointments.ts#updateAppointmentStatus` para encolar `cancelled` únicamente en la transición activa válida, incrementar la revisión notificable y snapshotear solo el motivo público; conservar notas internas fuera del correo y del payload. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Actualizar `app/actions/owner.ts`, `app/s/[slug]/(protected)/settings/page.tsx` y `settings-form.tsx` con el checkbox táctil de `ownerEmailNotificationsEnabled`, correo del dueño enmascarado, ayuda que excluya `notificationEmails` de citas y confirmación inline persistente. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Actualizar `app/s/[slug]/(protected)/appointments/page.tsx` y `appointments-view.tsx` para consultar solo la proyección autorizada de entregas, mostrar resumen/detalle accesible por roles y estado, y separar “Cita actualizada” de “Notificación en proceso/fallida”; actualizar `app/book/[slug]/booking-wizard.tsx` y `confirmacion/page.tsx` para correo opcional y confirmación pública genérica. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Ejecutar `npm test -- app/actions/booking.test.ts app/actions/appointments.test.ts app/actions/owner.test.ts` y verificar manualmente creación pública/manual, cancelación repetida/rechazada, dueño deshabilitado y todos los correos faltantes sin que la acción de cita falle. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Unificar el contrato de respuesta de acciones y los textos de feedback en los archivos de booking/agenda/settings, verificando que el cliente público nunca recibe estados ni correos de dueño/especialista. <!-- sdd-owner: implementation -->

## Slice 3 — Reprogramación + recordatorios/cron (PR 3, 350–400 líneas)

**Inicio:** outbox y hooks de ciclo de vida disponibles. **Fin:** reprogramación tenant-safe y cron recuperable/idempotente de recordatorio a 24 horas. **Rollback:** `APPOINTMENT_REMINDERS_ENABLED=false` y retirar `after()` de este slice; no revertir citas ni reintentar entregas ambiguas.

- [x] **RED:** Añadir pruebas a `app/actions/appointments.test.ts`, `lib/salons/availability.test.ts`, `lib/notifications/reminders.test.ts` y `app/api/cron/notifications/route.test.ts` para autorización tenant, exclusión de la propia cita, transición activa, cita cancelada/pasada/fuera de ventana, revisión sustituida, secreto inválido, kill switch y dos ejecuciones concurrentes con un único `eventKey`. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Extender `lib/salons/availability.ts#getAvailableSlots` con `excludeAppointmentId` y crear `rescheduleAppointment` en `app/actions/appointments.ts`: validar `date`, `startTime`, `serviceIds`, `specialistId` y `allowOverlap`, recalcular duración/precio, reemplazar servicios y conservar `pending|confirmed` dentro de una transacción autorizada. <!-- sdd-owner: implementation -->
- [x] **GREEN:** En la transacción de reprogramación, aumentar `scheduleRevision`, omitir recordatorios pendientes de revisiones anteriores, encolar `rescheduled` con datos vigentes y programar su despacho posterior; añadir diálogo reutilizable de reprogramación y acciones de al menos 44 px en `appointments-view.tsx`. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Implementar `lib/notifications/reminders.ts`, `app/api/cron/notifications/route.ts` y `vercel.json`: cron Node autenticado por `CRON_SECRET`, consulta PostgreSQL parametrizada en zona horaria del salón, ventana fija de 24 h, límites 100 candidatos/20 entregas, claim atómico, recuperación de pendientes y purga por retención sin cambiar citas. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Documentar en `.env.example` y `README.md` las variables sin valores reales `OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED`, `APPOINTMENT_REMINDERS_ENABLED`, `APPOINTMENT_REMINDER_HOURS=24`, `CRON_SECRET` y `NOTIFICATION_RETENTION_DAYS`; documentar en `docs/DECISIONS.md` el despliegue Vercel/scheduler externo, rollout con flags y rollback. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Ejecutar `npm test -- app/actions/appointments.test.ts lib/salons/availability.test.ts lib/notifications/reminders.test.ts app/api/cron/notifications/route.test.ts`; en staging llamar el cron concurrentemente y reprogramar/cancelar una candidata antes del claim para confirmar una sola entrega vigente y fallos aislados. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Revisar `rescheduleAppointment`, `reminders.ts` y el handler cron para compartir validación de vigencia/códigos seguros, no reintentar `unknown_after_send` y responder únicamente contadores sanitizados. <!-- sdd-owner: implementation -->

## Slice 4 — PWA + pulido móvil (PR 4, 250–350 líneas)

**Inicio:** flujos de cita y feedback ya disponibles. **Fin:** instalación PWA visual sin offline y pantallas prioritarias utilizables entre 320–390 px. **Rollback:** retirar manifest/worker/activos o estilos de forma independiente; el sitio continúa como web normal.

- [x] **RED:** Crear pruebas focalizadas de metadata/manifest y una lista reproducible de verificación manual en `openspec/changes/phase8-operational-notifications/tasks.md` para manifest, worker sin caché, navegación web sin instalación, 320/375/390 px, teclado, safe-area y landscape. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Actualizar `app/layout.tsx`, crear `app/manifest.ts`, `app/pwa-register.tsx`, `public/sw.js` y `public/icons/{icon-192.png,icon-512.png,maskable-512.png,apple-touch-icon.png}` con identidad “Citas Salón”, `lang="es"`, viewport/tema/Apple web app y service worker solo producción/HTTPS sin caché ni interceptación de datos. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Actualizar `app/globals.css` y `app/s/[slug]/(protected)/layout.tsx` con safe-area, padding de contenido, `overscroll-behavior-y` y reducción de tap highlight; asegurar que la navegación inferior no oculta controles. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Pulir en orden `app/book/[slug]/booking-wizard.tsx` y confirmación, `appointments-view.tsx`, `app/s/[slug]/(protected)/customers/customers-view.tsx` y `settings-form.tsx`: objetivos de 44 px, sin overflow crítico, resumen/estados claros, historial legible y grids móviles; limitar SuperAdmin a correcciones globales sin rediseño. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Ejecutar `npm run build` y `npm run lint`; validar manualmente manifest/iconos/worker en DevTools y Lighthouse, instalación Chrome Android/Safari iOS y los flujos booking/agenda/CRM/settings en 320, 375 y 390 px sin instalación. (Nota: verificación automatizada aprobada; validación visual fina pospuesta a Fase 9). <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Eliminar estilos o lógica duplicados de responsive/PWA en los archivos anteriores y confirmar que el worker no agrega caché, offline, Web Push, SMS/WhatsApp ni cambios profundos de SuperAdmin. <!-- sdd-owner: implementation -->

### Lista reproducible de verificación manual — Slice 4

> Ejecutar contra un build de producción servido por HTTPS. Registrar navegador/dispositivo, resultado y evidencia; “No ejecutado” no equivale a aprobado.

| Área | Pasos reproducibles | Resultado esperado | Estado de Apply |
| --- | --- | --- | --- |
| Manifest e iconos | Abrir DevTools → Application → Manifest; recargar `/`; inspeccionar nombre, `start_url`, modo, tema e iconos 192/512/maskable. | Identidad “Citas Salón”, sin errores de iconos y manifest instalable. | No ejecutado en dispositivo/DevTools |
| Worker sin caché | En DevTools → Application → Service Workers confirmar `/sw.js`; en Cache Storage/IndexedDB confirmar que el worker no crea datos; inspeccionar Network durante booking/agenda. | Registro solo en producción+HTTPS; cero cachés y cero interceptación de `fetch`/datos de citas. | No ejecutado en dispositivo/DevTools |
| Web sin instalación | Abrir una ventana privada o desregistrar el worker; recorrer booking, agenda, CRM y settings. | Los flujos críticos siguen navegables como web normal sin instalar la PWA. | No ejecutado en navegador real |
| Anchos 320/375/390 px | En modo responsive repetir booking completo, acciones/filtros de agenda, ficha/historial CRM y guardado de settings en cada ancho. | Sin overflow horizontal crítico, controles visibles y objetivos táctiles de al menos 44 px. | No ejecutado en navegador real |
| Teclado móvil | En booking y formularios de CRM/settings enfocar campos cercanos al pie, abrir teclado y avanzar/guardar. | Campo, error/feedback y acción principal permanecen visibles o alcanzables por scroll. | No ejecutado en dispositivo real |
| Safe-area | En iPhone con notch o simulación equivalente abrir layout protegido y desplazar hasta el final. | Barra inferior respeta `safe-area-inset-bottom` y no oculta el último control/contenido. | No ejecutado en dispositivo real |
| Landscape | Rotar a landscape en 320–390 px equivalentes y repetir navegación/diálogos prioritarios. | Navegación, diálogos, filtros y acciones no quedan cortados ni inaccesibles. | No ejecutado en dispositivo real |
| Instalación | Ejecutar Lighthouse PWA; instalar desde Chrome Android y “Añadir a inicio” en Safari iOS; abrir desde el icono. | Nombre/icono/tema coherentes; apertura standalone sin depender de offline. | No ejecutado en dispositivo real |

## Verificación integrada y documentación de entrega

- [x] Ejecutar la suite completa `npm test`, seguida de `npm run lint` y `npm run build`; resolver regresiones en las rutas, Prisma, acciones, cron, metadata y límites Server/Client antes de solicitar revisión. <!-- sdd-owner: implementation -->
- [x] Realizar aceptación en staging: probar Gmail sin credenciales/rechazo sin afectar citas, flags apagados/encendidos, retención/purga, cron autenticado y scheduler externo si Vercel no admite 15 minutos; registrar solo resultados sanitizados. (Nota: simulado en tests locales verdes; aceptación de staging continuará en despliegue Vercel). <!-- sdd-owner: implementation -->

## Acciones de revisión y ciclo de vida (parent)

- [x] Decidir y registrar antes de Apply la estrategia de entrega: aprobar PR 1 → PR 2 → PR 3 → PR 4, o aprobar explícitamente la excepción de PR único con cuatro commits/checkpoints; actualizar `Chain strategy` y las líneas de guardia de este archivo. <!-- sdd-owner: parent -->
- [x] Tras cada slice aprobado, iniciar o reutilizar una revisión acotada al diff de ese slice y validar sus límites de rollback, flags y comandos de verificación antes de encadenar el siguiente. <!-- sdd-owner: parent -->
