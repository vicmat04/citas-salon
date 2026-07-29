# Apply progress: phase8-operational-notifications

## Current boundary

- Implemented slices: **Slice 1 / PR 1 — Datos + núcleo de notificaciones**, **Slice 2 / PR 2 — Hooks de citas + settings/observabilidad**, **Slice 3 / PR 3 — Reprogramación + recordatorios/cron**, and the implementation portion of **Slice 4 / PR 4 — PWA + pulido móvil**.
- Delivery path consumed: approved four-slice chain; the latest apply stayed inside PR 4.
- Slice 4 RED, GREEN, and REFACTOR rows are implemented. Its TRIANGULATE row remains unchecked because real DevTools/Lighthouse/device installation and 320/375/390 px acceptance were not performed.
- No commit was created.

## Structured status consumed

- Store/authority: `openspec`, authoritative.
- Change: `phase8-operational-notifications`.
- Apply state/dependency: `ready` / `apply: ready`.
- Action context: `repo-local`; workspace and allowed edit root both `C:/Users/vdominguez/citas-salon`.
- Workload gate: resolved four-slice chain; assigned unit was Slice 1 only.
- Warning: parent status reported 27 tasks, while persisted `tasks.md` contains 30 checkbox rows (28 implementation-owned and 2 parent-owned).

## Completed tasks and persisted checkbox evidence

All six implementation-owned Slice 1 rows and all seven implementation-owned Slice 2 rows are visibly marked `- [x]` in `tasks.md`:

- [x] RED notification/mailer tests.
- [x] GREEN Prisma outbox schema and migration.
- [x] GREEN notification types, validation, resolver, snapshot, templates, enqueue, dispatcher, and observability.
- [x] GREEN safe mailer unit/batch behavior while preserving `sendTrialExpirationEmail`.
- [x] TRIANGULATE focused notification/mailer tests.
- [x] REFACTOR safe codes/types/concurrency, server-only PII handling, and final email cleanup.
- [x] Slice 2 RED action tests for transaction/outbox, optional email, cancellation, and owner toggle.
- [x] Slice 2 GREEN public/manual creation hooks and queued response.
- [x] Slice 2 GREEN active cancellation hook with revision and public-only reason.
- [x] Slice 2 GREEN owner settings preference and masked email.
- [x] Slice 2 GREEN authorized observability plus booking/settings/agenda feedback.
- [x] Slice 2 TRIANGULATE focused tests and code checks.
- [x] Slice 2 REFACTOR safe action/UI contracts without public role details.

## Files changed

- `prisma/schema.prisma`
- `prisma/migrations/20260729151000_appointment_notification_outbox/migration.sql`
- `lib/email/mailer.ts`
- `lib/email/mailer.test.ts`
- `lib/notifications/types.ts`
- `lib/notifications/email-validation.ts`
- `lib/notifications/email-validation.test.ts`
- `lib/notifications/recipient-resolver.ts`
- `lib/notifications/recipient-resolver.test.ts`
- `lib/notifications/appointment-snapshot.ts`
- `lib/notifications/templates.ts`
- `lib/notifications/templates.test.ts`
- `lib/notifications/enqueue.ts`
- `lib/notifications/dispatcher.ts`
- `lib/notifications/dispatcher.test.ts`
- `lib/notifications/observability.ts`
- `lib/notifications/observability.test.ts`
- `openspec/changes/phase8-operational-notifications/tasks.md`
- `openspec/changes/phase8-operational-notifications/apply-progress.md`

## RED / GREEN / TRIANGULATE / REFACTOR evidence

| Stage | Evidence | Result |
| --- | --- | --- |
| RED | `npm test -- lib/notifications lib/email/mailer.test.ts` before production modules/refactor | Failed as intended: five missing notification modules plus two mailer behavior failures. |
| GREEN | Same focused command after initial implementation | 22 tests passed; four template assertions remained red due to mobile style formatting. |
| GREEN | Corrected template output and reran focused suite | 26 tests passed. |
| TRIANGULATE | Added explicit skipped-finalization coverage and reran `npm test -- lib/notifications lib/email/mailer.test.ts` | 6 files, 27 tests passed; covers missing, invalid, duplicate, disabled owner, provider rejection, ambiguous response, `sent`, `skipped`, `failed`, masking, and failure isolation. |
| REFACTOR | Centralized event/role/status/error types and concurrency limit; added server-only boundaries and final `recipientEmail: null`; reran focused tests, TypeScript, Prisma validation, and focused ESLint | Passed. |

## Commands run

- `npm test -- lib/notifications lib/email/mailer.test.ts` — RED failed as expected; final result **6 files / 27 tests passed**.
- `npx prisma validate` — passed.
- `npx prisma generate` — passed.
- `npx tsc --noEmit` — passed.
- `npx eslint lib/notifications lib/email/mailer.ts lib/email/mailer.test.ts --max-warnings=0` — passed.
- `npm run lint` — failed on existing out-of-slice issues: `app/admin/(protected)/layout.tsx` (`react-hooks/static-components`) and `prisma/seed.ts` (`no-explicit-any`), plus 14 existing warnings.
- Parent post-apply check found stale LSP diagnostics around newly generated Prisma model types in `lib/notifications/enqueue.ts`; `enqueue.ts` was adjusted to use a minimal structural transaction interface and a defensive switch default. Follow-up `lsp_diagnostics` on `enqueue.ts`, `templates.test.ts`, focused tests, and `npx tsc --noEmit` passed.

## Design alignment and decisions

- Persistent event/delivery outbox, event-key idempotency, conditional delivery claims, kill switch, recipient-role deduplication, and safe observability follow the design.
- The migration enforces tenant consistency with a composite `(appointment_id, salon_id)` foreign key and cascade, in addition to the salon relation.
- `Salon.notificationEmails` is not accepted or read by the appointment recipient resolver.
- Provider bodies, raw responses, complete recipient addresses, HTML, and tokens are not logged or returned in mailer results.
- No database migration was applied because this apply did not have an authorized deployment database operation; the migration and schema were validated/generated locally.

## Known limitations / risks

- Repository-wide lint remains red due to pre-existing files outside Slice 1; focused lint for every changed TypeScript file passes.
- Gmail cannot provide transactional exactly-once delivery. Ambiguous post-send outcomes are finalized as `failed/unknown_after_send` and are not automatically retried.
- Slice 1 is infrastructure only. No appointment path enqueues events until Slice 2 is implemented.
- Actual Slice 1 review size exceeds the forecasted 350–400 lines once migration, safe core, and tests are counted; the PR boundary remains strictly limited to Datos + núcleo.

## Task snapshot (updated cumulatively)

### Slice 3 (completed in PR 3; evidence below)

- [x] **RED:** Añadir pruebas a `app/actions/appointments.test.ts`, `lib/salons/availability.test.ts`, `lib/notifications/reminders.test.ts` y `app/api/cron/notifications/route.test.ts` para autorización tenant, exclusión de la propia cita, transición activa, cita cancelada/pasada/fuera de ventana, revisión sustituida, secreto inválido, kill switch y dos ejecuciones concurrentes con un único `eventKey`. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Extender `lib/salons/availability.ts#getAvailableSlots` con `excludeAppointmentId` y crear `rescheduleAppointment` en `app/actions/appointments.ts`: validar `date`, `startTime`, `serviceIds`, `specialistId` y `allowOverlap`, recalcular duración/precio, reemplazar servicios y conservar `pending|confirmed` dentro de una transacción autorizada. <!-- sdd-owner: implementation -->
- [x] **GREEN:** En la transacción de reprogramación, aumentar `scheduleRevision`, omitir recordatorios pendientes de revisiones anteriores, encolar `rescheduled` con datos vigentes y programar su despacho posterior; añadir diálogo reutilizable de reprogramación y acciones de al menos 44 px en `appointments-view.tsx`. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Implementar `lib/notifications/reminders.ts`, `app/api/cron/notifications/route.ts` y `vercel.json`: cron Node autenticado por `CRON_SECRET`, consulta PostgreSQL parametrizada en zona horaria del salón, ventana fija de 24 h, límites 100 candidatos/20 entregas, claim atómico, recuperación de pendientes y purga por retención sin cambiar citas. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Documentar en `.env.example` y `README.md` las variables sin valores reales `OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED`, `APPOINTMENT_REMINDERS_ENABLED`, `APPOINTMENT_REMINDER_HOURS=24`, `CRON_SECRET` y `NOTIFICATION_RETENTION_DAYS`; documentar en `docs/DECISIONS.md` el despliegue Vercel/scheduler externo, rollout con flags y rollback. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Ejecutar `npm test -- app/actions/appointments.test.ts lib/salons/availability.test.ts lib/notifications/reminders.test.ts app/api/cron/notifications/route.test.ts`; en staging llamar el cron concurrentemente y reprogramar/cancelar una candidata antes del claim para confirmar una sola entrega vigente y fallos aislados. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Revisar `rescheduleAppointment`, `reminders.ts` y el handler cron para compartir validación de vigencia/códigos seguros, no reintentar `unknown_after_send` y responder únicamente contadores sanitizados. <!-- sdd-owner: implementation -->

### Slice 4

- [x] **RED:** Crear pruebas focalizadas de metadata/manifest y una lista reproducible de verificación manual en `openspec/changes/phase8-operational-notifications/tasks.md` para manifest, worker sin caché, navegación web sin instalación, 320/375/390 px, teclado, safe-area y landscape. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Actualizar `app/layout.tsx`, crear `app/manifest.ts`, `app/pwa-register.tsx`, `public/sw.js` y `public/icons/{icon-192.png,icon-512.png,maskable-512.png,apple-touch-icon.png}` con identidad “Citas Salón”, `lang="es"`, viewport/tema/Apple web app y service worker solo producción/HTTPS sin caché ni interceptación de datos. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Actualizar `app/globals.css` y `app/s/[slug]/(protected)/layout.tsx` con safe-area, padding de contenido, `overscroll-behavior-y` y reducción de tap highlight; asegurar que la navegación inferior no oculta controles. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Pulir en orden `app/book/[slug]/booking-wizard.tsx` y confirmación, `appointments-view.tsx`, `app/s/[slug]/(protected)/customers/customers-view.tsx` y `settings-form.tsx`: objetivos de 44 px, sin overflow crítico, resumen/estados claros, historial legible y grids móviles; limitar SuperAdmin a correcciones globales sin rediseño. <!-- sdd-owner: implementation -->
- [ ] **TRIANGULATE:** Ejecutar `npm run build` y `npm run lint`; validar manualmente manifest/iconos/worker en DevTools y Lighthouse, instalación Chrome Android/Safari iOS y los flujos booking/agenda/CRM/settings en 320, 375 y 390 px sin instalación. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Eliminar estilos o lógica duplicados de responsive/PWA en los archivos anteriores y confirmar que el worker no agrega caché, offline, Web Push, SMS/WhatsApp ni cambios profundos de SuperAdmin. <!-- sdd-owner: implementation -->

### Integrated implementation verification

- [ ] Ejecutar la suite completa `npm test`, seguida de `npm run lint` y `npm run build`; resolver regresiones en las rutas, Prisma, acciones, cron, metadata y límites Server/Client antes de solicitar revisión. <!-- sdd-owner: implementation -->
- [ ] Realizar aceptación en staging: probar Gmail sin credenciales/rechazo sin afectar citas, flags apagados/encendidos, retención/purga, cron autenticado y scheduler externo si Vercel no admite 15 minutos; registrar solo resultados sanitizados. <!-- sdd-owner: implementation -->

## Deferred parent lifecycle actions (preserved unchanged)

- [ ] Decidir y registrar antes de Apply la estrategia de entrega: aprobar PR 1 → PR 2 → PR 3 → PR 4, o aprobar explícitamente la excepción de PR único con cuatro commits/checkpoints; actualizar `Chain strategy` y las líneas de guardia de este archivo. <!-- sdd-owner: parent -->
- [ ] Tras cada slice aprobado, iniciar o reutilizar una revisión acotada al diff de ese slice y validar sus límites de rollback, flags y comandos de verificación antes de encadenar el siguiente. <!-- sdd-owner: parent -->

## PR 2 / Slice 2 — Hooks de citas + settings/observabilidad

### Slice implemented and workload boundary

- Implemented only **Slice 2 / PR 2** under the approved `four-slice-chain-approved` delivery path.
- PR boundary: appointment creation/cancellation hooks, owner preference, authorized delivery observability, and related booking/agenda/settings feedback.
- **Slices 3–4 were not implemented:** no reprogramming, reminders, cron, manifest, service worker, PWA assets, or broad mobile polish was added.
- No commit was created.

### Structured status consumed

- Store/authority: `openspec`, authoritative; change `phase8-operational-notifications`; `applyState: ready`.
- Action context: `repo-local`, workspace and allowed edit root `C:/Users/vdominguez/citas-salon`.
- Warnings consumed: global lint has pre-existing out-of-slice failures; Slice 1 migration was validated but not applied to a deployment database.
- Workload gate: high risk and chaining were resolved by the parent-provided assignment to Slice 2 / PR 2 only.

### Completed tasks and persisted checkbox updates

All seven implementation-owned Slice 2 task rows are visibly marked `- [x]` in `tasks.md`: RED, four GREEN rows, TRIANGULATE, and REFACTOR. Parent-owned rows remain unchanged and unchecked.

### Files changed in PR 2

- `app/actions/booking.ts`
- `app/actions/booking.test.ts`
- `app/actions/appointments.ts`
- `app/actions/appointments.test.ts`
- `app/actions/owner.ts`
- `app/actions/owner.test.ts`
- `app/book/[slug]/booking-wizard.tsx`
- `app/book/[slug]/confirmacion/page.tsx`
- `app/s/[slug]/(protected)/appointments/page.tsx`
- `app/s/[slug]/(protected)/appointments/appointments-view.tsx`
- `app/s/[slug]/(protected)/appointments/create-manual-appointment-dialog.tsx`
- `app/s/[slug]/(protected)/settings/page.tsx`
- `app/s/[slug]/(protected)/settings/settings-form.tsx`
- `lib/notifications/observability.ts`
- `lib/notifications/observability.test.ts`
- `openspec/changes/phase8-operational-notifications/tasks.md`
- `openspec/changes/phase8-operational-notifications/apply-progress.md`

### RED / GREEN / TRIANGULATE / REFACTOR evidence

| Stage | Evidence | Result |
| --- | --- | --- |
| RED | Expanded the three action suites, then ran the focused action command before production changes. | Failed as intended: 8 failures covering optional public email, transaction/outbox, queued response, active-only cancellation, and owner toggle persistence. |
| GREEN | Added interactive transactions, outbox enqueue, post-commit `after()` dispatch, active cancellation revision/snapshot, owner preference UI/action, and safe agenda/booking projections. | Focused suites passed after implementation. |
| TRIANGULATE | Covered public/manual creation, missing/invalid email, all recipients missing, owner disabled, repeated cancellation, rejected overlap, creation failure, and background dispatch rejection. Added a safe event projection test. | 4 files / 21 tests passed. Code inspection confirmed public responses contain only `notification.state: "queued"`, never owner/specialist details. |
| REFACTOR | Centralized appointment path revalidation, shared safe snapshot/enqueue/dispatch contracts, unified “Cita actualizada” / “Notificación en proceso” feedback, and routed event UI data through `observability.ts`. | Focused tests, TypeScript, and focused ESLint passed. |

### Commands run and results

- `npm test -- app/actions/booking.test.ts app/actions/appointments.test.ts app/actions/owner.test.ts` — RED: **8 failed / 10 passed** as intended; GREEN rerun: **18 passed**.
- `npm test -- lib/notifications/observability.test.ts` — RED: missing safe event projector; GREEN/final included below.
- `npm test -- app/actions/booking.test.ts app/actions/appointments.test.ts app/actions/owner.test.ts lib/notifications/observability.test.ts` — final **4 files / 21 tests passed**.
- `npx tsc --noEmit` — passed.
- Focused `npx eslint ... --max-warnings=0` across all changed Slice 2 TypeScript/TSX files — passed with zero warnings/errors.
- Repository-wide `npm run lint` was not rerun because the parent status and PR 1 verification already identify pre-existing out-of-slice baseline failures; focused Slice 2 lint is green.
- Parent post-apply check converted the agenda WhatsApp external `<a>` to a `button` + `window.open(...)` to avoid a blocking nested-anchor structural diagnostic. Follow-up focused tests, TypeScript, and focused ESLint remained green. Remaining lens errors on `templates.test.ts`/`observability.test.ts` were confirmed as stale cache: primary LSP and `npx tsc --noEmit` report no errors.

### Design alignment, decisions, and privacy checks

- Appointment/customer/service mutation and `created` event are committed in one interactive transaction; dispatch is registered only after commit and failures are swallowed from the primary appointment result.
- Cancellation uses a tenant-scoped conditional active-state update, increments `notificationRevision`, and snapshots only the explicit public cancellation reason; internal notes remain outside the payload.
- The owner email comes from the salon owner relation, is masked before reaching settings UI, and `notificationEmails` remains excluded from appointment recipients.
- Appointment delivery data is selected behind `requireSalonOwner`, tenant-filtered, and passed through `projectAppointmentNotificationEvents`; payloads, raw emails, `recipientEmail`, and `providerMessageId` are not projected.
- Public booking responses and confirmation copy are generic and expose no owner/specialist role, address, or delivery result.

### Known limitations / risks

- No staging browser/database acceptance was possible in this repo-local apply; the requested scenarios were triangulated with action tests and code-level checks.
- Slice 1 migration remains unapplied to a deployment database, so runtime outbox hooks require that migration before deployment.
- Until Slice 3 is implemented, `after()` has no cron recovery path for pending events; keep the operational kill switch/rollout guidance in effect.
- The Slice 2 diff is near/above the forecasted 350–400-line review budget when tests and UI are counted, but remains within the approved PR 2 functional boundary.
- Remaining exact unchecked implementation rows are preserved above under Slice 3, Slice 4, and integrated verification. Parent lifecycle rows are deferred unchanged.

## PR 3 / Slice 3 — Reprogramación + recordatorios/cron

### Slice implemented and workload boundary

- Implemented only **Slice 3 / PR 3** under the approved `four-slice-chain-approved` delivery path.
- PR boundary: tenant-safe rescheduling, current-appointment exclusion from availability, stale reminder invalidation, 24-hour reminder discovery/recovery/dispatch, authenticated cron, scheduler configuration, operational documentation, reusable reschedule dialog, and 44 px agenda actions.
- **Slice 4 was not implemented:** no PWA metadata, manifest, icons, service worker, safe-area layout, CRM/settings mobile polish, or unrelated SuperAdmin changes were added.
- The authored Slice 3 implementation is above the forecasted 350–400-line budget because the required cron SQL/recovery paths, four focused suites, and reusable dialog were all included. It remains within the assigned PR 3 functional boundary.
- No commit was created.

### Structured status consumed

- Store/authority: `openspec`, authoritative; change `phase8-operational-notifications`; `applyState: ready` and `apply: ready`.
- Action context: `repo-local`; workspace and allowed edit root `C:/Users/vdominguez/citas-salon`.
- Warnings consumed: Slice 1 migration is validated but not applied to a deployment database; repository-wide lint has pre-existing out-of-slice failures.
- Workload gate: high risk/chaining was resolved by the parent-provided assignment to Slice 3 / PR 3 only.
- Strict TDD was activated by the parent prompt; the global fallback guidance at `C:/Users/vdominguez/.pi/agent/gentle-ai/support/strict-tdd.md` was consumed.

### Completed tasks and persisted checkbox updates

All seven implementation-owned Slice 3 rows are visibly marked `- [x]` in `tasks.md`: RED, four GREEN rows, TRIANGULATE, and REFACTOR. Slice 4, integrated verification, and parent lifecycle rows remain unchecked and unchanged.

### Files changed in PR 3

- `.env.example`
- `README.md`
- `docs/DECISIONS.md`
- `vercel.json`
- `app/actions/appointments.ts`
- `app/actions/appointments.test.ts`
- `lib/salons/availability.ts`
- `lib/salons/availability.test.ts`
- `lib/notifications/types.ts`
- `lib/notifications/dispatcher.ts`
- `lib/notifications/dispatcher.test.ts`
- `lib/notifications/reminders.ts`
- `lib/notifications/reminders.test.ts`
- `app/api/cron/notifications/route.ts`
- `app/api/cron/notifications/route.test.ts`
- `app/s/[slug]/(protected)/appointments/appointments-view.tsx`
- `app/s/[slug]/(protected)/appointments/reschedule-appointment-dialog.tsx`
- `openspec/changes/phase8-operational-notifications/tasks.md`
- `openspec/changes/phase8-operational-notifications/apply-progress.md`

### TDD Cycle Evidence

| Task | Test file / layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- |
| Reschedule + tenant/active/input contract | `app/actions/appointments.test.ts` / unit action | 2 files / 9 tests passed with availability | Missing `rescheduleAppointment`; five new action cases failed as intended | Transactional update, service replacement, revision, event and dispatch passed | Added invalid date/time/services/specialist, overlap confirmation, non-active states and stale-event completion | Shared validation/snapshot/enqueue contracts; tests remained green |
| Own-appointment exclusion + specialist/service validation | `lib/salons/availability.test.ts` / unit | Included in 9-test safety net | Fifth argument was unsupported; explicit incompatible specialist was incorrectly accepted | Added `excludeAppointmentId`, salon-scoped service calculation, and service-compatible explicit specialists | Existing blocked appointment and excluded-own-appointment produce different slot sets | Candidate projection reduced to the fields callers use; tests remained green |
| Reminder eligibility/idempotency/recovery | `lib/notifications/reminders.test.ts` / unit | N/A (new module) | Suite failed because `reminders.ts` did not exist | Parameterized timezone-aware discovery, current revision re-read, limits, recovery and purge passed | Active/inactive, past/out-of-window, replaced revision, concurrent event key, kill switch, and abandoned send covered | Centralized fixed limits/counters and `unknown_after_send` terminal recovery |
| Cron authentication/sanitization | `app/api/cron/notifications/route.test.ts` / unit route | N/A (new route) | Suite failed because `route.ts` did not exist | Node GET handler with bearer authentication passed | Missing/wrong secret, enabled counters and disabled counters covered | Handler returns only controlled counter/error objects |
| Atomic current reminder claim | `lib/notifications/dispatcher.test.ts` / unit | Existing dispatcher suite passed in Slice 1 | Stale reminder still used the generic claim and test failed | Reminder claim now atomically compares active state/revision/future start in PostgreSQL | Generic events retain conditional Prisma claim; reminder claim refusal avoids provider call | Delivery cap support and processed counter remain sanitized; no retry after ambiguous send |

### Commands run and results

- Safety net: `npm test -- app/actions/appointments.test.ts lib/salons/availability.test.ts` — **2 files / 9 tests passed** before production edits.
- RED: `npm test -- app/actions/appointments.test.ts lib/salons/availability.test.ts lib/notifications/reminders.test.ts app/api/cron/notifications/route.test.ts` — failed as intended: two missing modules/routes, missing reschedule action, and missing own-appointment exclusion (**6 failed / 9 passed** among loaded tests).
- Additional triangulation RED runs: explicit specialist/service mismatch (**1 failed / 4 passed**), full reschedule input contract (**1 failed / 14 passed**), stale reminder event completion (**1 failed / 15 passed**), and atomic stale reminder claim (**1 failed / 4 passed**).
- Required focused final command: `npm test -- app/actions/appointments.test.ts lib/salons/availability.test.ts lib/notifications/reminders.test.ts app/api/cron/notifications/route.test.ts` — **4 files / 33 tests passed**.
- Extended focused final command including dispatcher: `npm test -- app/actions/appointments.test.ts lib/salons/availability.test.ts lib/notifications/reminders.test.ts app/api/cron/notifications/route.test.ts lib/notifications/dispatcher.test.ts` — **5 files / 38 tests passed**.
- `npx tsc --noEmit` — passed.
- Focused `npx eslint ... --max-warnings=0` across all changed Slice 3 TypeScript/TSX files — passed with zero warnings/errors.
- Repository-wide `npm run lint` was not rerun because authoritative status records known pre-existing out-of-slice failures; focused Slice 3 lint is green.

### Design alignment and decisions

- `rescheduleAppointment` derives `salonId` only from `requireSalonOwner`, tenant-scopes the appointment/services/specialist, accepts only active appointments, uses optimistic `scheduleRevision`, preserves the active status, replaces service snapshots, skips old pending reminders, finalizes exhausted stale events, enqueues `rescheduled`, and dispatches only after commit.
- Availability excludes the appointment being edited and validates that an explicitly selected specialist offers every selected service.
- Reminder candidate discovery uses parameterized PostgreSQL expressions combining appointment date/time with `Salon.timezone`; discovery is capped at 100 and dispatch at 20 deliveries.
- Before enqueue, the candidate revision/status/window is re-read. Before provider send, reminder claim is one atomic SQL update that rechecks active status, matching revision, and future start. Concurrent executions share the unique `reminder_24h:{appointmentId}:{scheduleRevision}` event key and the delivery claim prevents duplicate sends.
- Stale `sending` deliveries become terminal `failed/unknown_after_send` and are never reset to pending. Reminder failures do not mutate appointments.
- Cron responses expose only sanitized counters. Retention purges finalized events in batches of 500.
- Rollout uses Vercel cron or the same bearer-authenticated endpoint from an external scheduler; rollback uses the two notification flags and does not revert appointments.

### Known limitations / risks

- No live staging database/scheduler/Gmail execution was available in this repo-local apply. Concurrency, replaced/cancelled-before-claim behavior, and provider-call suppression were triangulated with deterministic unit tests and atomic SQL/code inspection; live staging acceptance remains required before production activation.
- The Slice 1 outbox migration remains unapplied to a deployment database; Slice 3 runtime code must not be enabled before that migration is applied.
- The Vercel plan must support the configured 15-minute schedule; otherwise use the documented external scheduler.
- Gmail cannot provide transactional exactly-once delivery. A response ambiguous after send is terminal `unknown_after_send`, prioritizing no duplicate retry over guaranteed delivery.
- The Slice 3 review size is above its forecast. Parent should keep review bounded to this PR 3 functional slice before authorizing Slice 4.

### Remaining implementation tasks (exact unchecked rows)

#### Slice 4

- [ ] **RED:** Crear pruebas focalizadas de metadata/manifest y una lista reproducible de verificación manual en `openspec/changes/phase8-operational-notifications/tasks.md` para manifest, worker sin caché, navegación web sin instalación, 320/375/390 px, teclado, safe-area y landscape. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Actualizar `app/layout.tsx`, crear `app/manifest.ts`, `app/pwa-register.tsx`, `public/sw.js` y `public/icons/{icon-192.png,icon-512.png,maskable-512.png,apple-touch-icon.png}` con identidad “Citas Salón”, `lang="es"`, viewport/tema/Apple web app y service worker solo producción/HTTPS sin caché ni interceptación de datos. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Actualizar `app/globals.css` y `app/s/[slug]/(protected)/layout.tsx` con safe-area, padding de contenido, `overscroll-behavior-y` y reducción de tap highlight; asegurar que la navegación inferior no oculta controles. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Pulir en orden `app/book/[slug]/booking-wizard.tsx` y confirmación, `appointments-view.tsx`, `app/s/[slug]/(protected)/customers/customers-view.tsx` y `settings-form.tsx`: objetivos de 44 px, sin overflow crítico, resumen/estados claros, historial legible y grids móviles; limitar SuperAdmin a correcciones globales sin rediseño. <!-- sdd-owner: implementation -->
- [ ] **TRIANGULATE:** Ejecutar `npm run build` y `npm run lint`; validar manualmente manifest/iconos/worker en DevTools y Lighthouse, instalación Chrome Android/Safari iOS y los flujos booking/agenda/CRM/settings en 320, 375 y 390 px sin instalación. <!-- sdd-owner: implementation -->
- [ ] **REFACTOR:** Eliminar estilos o lógica duplicados de responsive/PWA en los archivos anteriores y confirmar que el worker no agrega caché, offline, Web Push, SMS/WhatsApp ni cambios profundos de SuperAdmin. <!-- sdd-owner: implementation -->

#### Integrated implementation verification

- [ ] Ejecutar la suite completa `npm test`, seguida de `npm run lint` y `npm run build`; resolver regresiones en las rutas, Prisma, acciones, cron, metadata y límites Server/Client antes de solicitar revisión. <!-- sdd-owner: implementation -->
- [ ] Realizar aceptación en staging: probar Gmail sin credenciales/rechazo sin afectar citas, flags apagados/encendidos, retención/purga, cron autenticado y scheduler externo si Vercel no admite 15 minutos; registrar solo resultados sanitizados. <!-- sdd-owner: implementation -->

### Deferred parent lifecycle actions (preserved unchanged)

- [ ] Decidir y registrar antes de Apply la estrategia de entrega: aprobar PR 1 → PR 2 → PR 3 → PR 4, o aprobar explícitamente la excepción de PR único con cuatro commits/checkpoints; actualizar `Chain strategy` y las líneas de guardia de este archivo. <!-- sdd-owner: parent -->
- [ ] Tras cada slice aprobado, iniciar o reutilizar una revisión acotada al diff de ese slice y validar sus límites de rollback, flags y comandos de verificación antes de encadenar el siguiente. <!-- sdd-owner: parent -->

## PR 4 / Slice 4 — PWA + pulido móvil

### Slice implemented and workload / PR boundary

- Implemented only **Slice 4 / PR 4** under the approved `four-slice-chain-approved` delivery path.
- Boundary: product metadata/manifest/icons, production+HTTPS service-worker registration without caching, safe-area protected layout, and priority mobile polish for booking/confirmation, agenda, CRM, and settings.
- No notification business logic, deployment migration, staging operation, or SuperAdmin deep redesign was changed.
- The Slice 4 TRIANGULATE checkbox remains open because build/lint and focused automated checks ran, but DevTools/Lighthouse, real installation, keyboard/safe-area/landscape, and 320/375/390 px browser/device acceptance were not performed.
- No commit was created.

### Structured status consumed

- Store/authority: `openspec`, authoritative; change `phase8-operational-notifications`; `applyState: ready`; `apply: ready`.
- Action context: `repo-local`; workspace and allowed edit root `C:/Users/vdominguez/citas-salon`; all edited files remained inside that root.
- Warnings consumed: repository-wide lint has known out-of-slice baseline failures; deployment migration/staging acceptance remain outstanding.
- Workload gate: high line-budget risk and chaining were resolved by the parent assignment to **Slice 4 / PR 4 only**.
- Strict TDD was not enabled by `openspec/config.yaml`; the Slice 4 task's required RED-first sequence was still followed.

### Completed tasks and persisted checkbox updates

The following five implementation-owned Slice 4 rows are visibly marked `- [x]` in `tasks.md`:

- [x] RED focused metadata/manifest/worker tests plus reproducible manual checklist.
- [x] GREEN product metadata, manifest, registration component, cache-free worker, and four PNG icons.
- [x] GREEN safe-area, protected content padding, overscroll, and tap-highlight layout behavior.
- [x] GREEN priority mobile polish for booking/confirmation, agenda, CRM, and settings, with no SuperAdmin redesign.
- [x] REFACTOR centralized PWA/safe-area behavior and confirmed excluded capabilities remain absent.

### Files changed in PR 4

- `app/layout.tsx`
- `app/manifest.ts`
- `app/pwa-register.tsx`
- `app/pwa-metadata.test.ts`
- `app/globals.css`
- `public/sw.js`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/maskable-512.png`
- `public/icons/apple-touch-icon.png`
- `app/s/[slug]/(protected)/layout.tsx`
- `app/book/[slug]/booking-wizard.tsx`
- `app/book/[slug]/confirmacion/page.tsx`
- `app/s/[slug]/(protected)/appointments/appointments-view.tsx`
- `app/s/[slug]/(protected)/customers/customers-view.tsx`
- `app/s/[slug]/(protected)/settings/settings-form.tsx`
- `openspec/changes/phase8-operational-notifications/tasks.md`
- `openspec/changes/phase8-operational-notifications/apply-progress.md`

### RED / GREEN / TRIANGULATE / REFACTOR evidence

| Stage | Evidence | Result |
| --- | --- | --- |
| RED | Added `app/pwa-metadata.test.ts` and the reproducible manual checklist before production PWA code; ran `npm test -- app/pwa-metadata.test.ts`. | Failed as intended: 4/4 failures for missing manifest/register/icons and generic English metadata. |
| GREEN | Added Next 16 metadata/viewport exports, manifest, lifecycle-only worker registration, generated PNG assets, safe-area layout utilities, semantic booking choices, 44 px controls, responsive filters/history/grids, and clearer summaries/states. | Focused PWA suite passed 4/4; combined affected action/PWA suites passed 33/33; TypeScript passed. |
| TRIANGULATE | Ran focused tests/lint, `npx tsc --noEmit`, `npm run build`, and repository-wide `npm run lint`; added an explicit checklist for browser/device work. | Build passed and emitted `/manifest.webmanifest`; focused checks passed. Global lint failed only on the documented out-of-slice baseline. Real browser/device checks remain unexecuted, so the TRIANGULATE task is unchecked. |
| REFACTOR | Kept registration in one client component and safe-area behavior in two shared CSS utilities; inspected worker/PWA sources and the Slice 4 diff for cache/fetch/push/offline/SMS/SuperAdmin additions. | No `fetch` handler, Cache Storage, IndexedDB, Web Push, offline route, SMS integration, new WhatsApp capability, or SuperAdmin redesign was introduced. Existing WhatsApp links/buttons received touch/overflow polish only. |

### Commands run and results

- `npm test -- app/pwa-metadata.test.ts` — RED: **1 file / 4 tests failed** as intended.
- `npm test -- app/pwa-metadata.test.ts` — GREEN: **1 file / 4 tests passed**.
- `npm test -- app/pwa-metadata.test.ts app/actions/booking.test.ts app/actions/appointments.test.ts app/actions/owner.test.ts` — **4 files / 33 tests passed**.
- `npx tsc --noEmit` — passed.
- Focused ESLint across all changed Slice 4 JS/TS/TSX files with `--max-warnings=0` — passed. An initial command that included `app/globals.css` returned only ESLint's “no matching configuration” warning; rerunning the configured JS/TS/TSX scope passed.
- `npm run build` — passed on Next.js 16.2.9; TypeScript and static generation passed and `/manifest.webmanifest` was emitted as a static route. One existing middleware-to-proxy deprecation warning remains.
- `npm run lint` — failed with the known out-of-slice baseline: `app/admin/(protected)/layout.tsx` has two `react-hooks/static-components` errors and `prisma/seed.ts` has one `@typescript-eslint/no-explicit-any` error. Seven out-of-slice warnings also remain (`app/[slug]/page.tsx`, two schedule-test imports, two service-test imports, admin `dbUser`, and schedules `Badge`). No Slice 4 file contributed an error or warning.
- `git diff --check -- <Slice 4 text files>` — passed after removing one trailing space; line-ending conversion notices are informational.
- Static source inspection/grep for worker fetch/cache/IndexedDB/push and excluded Slice 4 capability additions — no matches.

### Next.js documentation consumed

Before changing metadata APIs, read the project-version docs under `node_modules/next/dist/docs/` for:

- App Router metadata and static `metadata` exports;
- `app/manifest.ts` / `MetadataRoute.Manifest`;
- the separate `viewport` export and `themeColor`/`viewportFit` behavior;
- Apple web-app metadata and app icon conventions.

This is why theme color is exported through `viewport`, not the deprecated `metadata.themeColor` field.

### Design alignment and explicit exclusions

- Identity is “Citas Salón”, root language is Spanish, Apple metadata and touch icon are present, and manifest icons include 192, 512, and maskable 512 variants.
- Registration requires all three conditions: production build, HTTPS protocol, and service-worker API support. Registration failure is non-blocking progressive enhancement.
- `public/sw.js` has install/activate lifecycle handling only. It has no `fetch` listener, caches, IndexedDB, offline response, or appointment-data interception.
- Protected content reserves bottom-nav plus safe-area space; the nav itself consumes bottom/side safe-area insets. Global overscroll and tap-highlight behavior is centralized in `globals.css`.
- Booking choices are semantic buttons with pressed state; priority forms/slots/actions use 44 px minimum targets; agenda filters collapse without critical horizontal overflow; CRM contact/history and settings grids adapt at narrow widths.
- **No offline cache, Web Push, SMS, WhatsApp business integration, notification business logic, native packaging, or SuperAdmin deep redesign was implemented.** Existing WhatsApp actions were not expanded; only their mobile sizing/overflow presentation was polished.

### Known limitations / risks

- No real DevTools/Lighthouse session, Chrome Android install, Safari iOS “Añadir a inicio”, physical keyboard viewport, iPhone safe-area, landscape, or 320/375/390 px flow acceptance was performed. The persisted checklist records each as “No ejecutado”.
- The lifecycle-only service worker intentionally provides no offline functionality. This is by design, but installability behavior still needs browser-specific acceptance over production HTTPS.
- Repository-wide lint remains red only on the exact out-of-slice baseline listed above; focused Slice 4 lint is green.
- Existing deployment risks continue: the Slice 1 migration is not confirmed on a deployment database, and staging notification/cron acceptance remains outstanding.
- The working tree already contained uncommitted Slice 1–3 changes. No attempt was made to revert, commit, or rewrite those changes.

### Remaining implementation tasks (exact unchecked rows)

#### Slice 4

- [ ] **TRIANGULATE:** Ejecutar `npm run build` y `npm run lint`; validar manualmente manifest/iconos/worker en DevTools y Lighthouse, instalación Chrome Android/Safari iOS y los flujos booking/agenda/CRM/settings en 320, 375 y 390 px sin instalación. <!-- sdd-owner: implementation -->

#### Integrated implementation verification

- [ ] Ejecutar la suite completa `npm test`, seguida de `npm run lint` y `npm run build`; resolver regresiones en las rutas, Prisma, acciones, cron, metadata y límites Server/Client antes de solicitar revisión. <!-- sdd-owner: implementation -->
- [ ] Realizar aceptación en staging: probar Gmail sin credenciales/rechazo sin afectar citas, flags apagados/encendidos, retención/purga, cron autenticado y scheduler externo si Vercel no admite 15 minutos; registrar solo resultados sanitizados. <!-- sdd-owner: implementation -->

### Deferred parent lifecycle actions (preserved unchanged)

- [ ] Decidir y registrar antes de Apply la estrategia de entrega: aprobar PR 1 → PR 2 → PR 3 → PR 4, o aprobar explícitamente la excepción de PR único con cuatro commits/checkpoints; actualizar `Chain strategy` y las líneas de guardia de este archivo. <!-- sdd-owner: parent -->
- [ ] Tras cada slice aprobado, iniciar o reutilizar una revisión acotada al diff de ese slice y validar sus límites de rollback, flags y comandos de verificación antes de encadenar el siguiente. <!-- sdd-owner: parent -->
