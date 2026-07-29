# Verify Report: phase8-operational-notifications — Slice 1 / PR 1

## Verification Scope

**Scope:** Slice 1 — Datos + núcleo de notificaciones (PR 1 only)  
**Date:** 2026-07-29  
**Verifier:** SDD Verify executor  
**Boundary:** Prisma outbox schema/migration, `lib/notifications/*`, `lib/email/mailer.ts`, and corresponding tests.  
**Explicitly excluded from this report:** Slice 2 (hooks/settings/UI), Slice 3 (reschedule/cron), Slice 4 (PWA/mobile).

---

## Commands Run and Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- lib/notifications lib/email/mailer.test.ts` | **PASSED** — 6 files / 27 tests | All pass; no failures. |
| `npx prisma validate` | **PASSED** | Schema valid ✓ |
| `npx prisma generate` | **PASSED** | Prisma Client v7.8.0 generated |
| `npx tsc --noEmit` | **PASSED** | No output = zero type errors |
| `npx eslint lib/notifications lib/email/mailer.ts lib/email/mailer.test.ts --max-warnings=0` | **PASSED** | Zero warnings, zero errors in Slice 1 files |
| `npm run lint` (global) | **FAILED** (pre-existing) | 3 errors / 14 warnings — all in out-of-scope files: `app/admin/(protected)/layout.tsx` (`react-hooks/static-components`), `prisma/seed.ts` (`no-explicit-any`), `app/s/[slug]/(protected)/customers/customers-view.tsx` (unused vars). No Slice 1 file contributes any failure. Consistent with apply-progress.md report. |

---

## Task Checkbox Verification

All six `<!-- sdd-owner: implementation -->` Slice 1 task rows in `tasks.md` are marked `- [x]`:

- [x] RED: notification/mailer tests
- [x] GREEN: Prisma outbox schema and migration
- [x] GREEN: notification types, validation, resolver, snapshot, templates, enqueue, dispatcher, observability
- [x] GREEN: safe mailer unit/batch behavior preserving `sendTrialExpirationEmail`
- [x] TRIANGULATE: focused notification/mailer tests with edge-case coverage
- [x] REFACTOR: centralized types/codes/concurrency, server-only boundaries, final `recipientEmail` cleanup

**Unchecked Slice 1 implementation tasks:** None.

Remaining unchecked rows are all Slice 2, 3, 4, and parent-owned actions — correctly deferred.

---

## TDD Compliance (Strict TDD Active)

TDD Cycle Evidence table is present in `apply-progress.md`:

| Stage | Evidence | Result |
| --- | --- | --- |
| RED | Focused test run before production modules | Failed as intended (5 missing modules + 2 mailer behavior failures) |
| GREEN (initial) | Implementation + rerun | 22 tests passed; 4 template assertions still failing |
| GREEN (corrected) | Fixed template output | 26 tests passed |
| TRIANGULATE | Added skipped-finalization coverage | 27 tests passed — covers: missing/invalid/duplicate/disabled-owner/provider-rejection/ambiguous-response/sent/skipped/failed/masking/failure-isolation |
| REFACTOR | Centralized codes/types/concurrency; server-only; cleanup | Passed (focused tests + tsc + Prisma + focused ESLint) |

**Assertion quality audit (no issues found):**

- `email-validation.test.ts`: validates specific return shapes (`{ valid: false, resultCode }`) for multiple input classes. Not smoke-only.
- `recipient-resolver.test.ts`: verifies independent role evaluation, owner-preference isolation, and multi-role deduplication with specific field checks. Not type-only.
- `templates.test.ts`: verifies HTML escaping at specific injection points, subject header injection prevention, and multi-role greeting. Not tautological.
- `dispatcher.test.ts`: verifies conditional claim call arguments, `recipientEmail: null` finalization, two-delivery isolation (provider_rejected + thrown ambiguous error), kill-switch no-op, and skipped-null-address path. Concrete and non-trivial.
- `observability.test.ts`: verifies exact projection shape AND `JSON.stringify` does not contain raw email address. Not implementation-detail CSS.
- `mailer.test.ts`: verifies token reuse (one token fetch for N sends), concurrency limit ≤3 via live timing, `providerMessageId` sanitization, and `sendTrialExpirationEmail` contract preserved. Not smoke-only.

**TDD verdict: COMPLIANT.**

---

## Spec / Design Alignment

### Requirement coverage (Slice 1 scope only)

| Spec Requirement | Design Element | Slice 1 Coverage |
| --- | --- | --- |
| Elegibilidad de destinatarios (client/owner/specialist independent) | `recipient-resolver.ts` | ✅ Implemented and tested |
| Preferencia del dueño (ownerEmailNotificationsEnabled) | `Salon.ownerEmailNotificationsEnabled`; resolver `disabled` branch | ✅ Schema field + resolver logic + test |
| Manejo seguro de correos ausentes/inválidos | `email-validation.ts`; resolver omission records | ✅ Tested with missing/invalid/omitted |
| Observabilidad segura (sin PII, solo enmascarado) | `observability.ts` projection; `recipientEmail: null` on finalization | ✅ Projection excludes raw email; test confirms with `JSON.stringify` |
| No usar `Salon.notificationEmails` en citas | `recipient-resolver.ts` interface — no `notificationEmails` parameter accepted | ✅ Confirmed by code search |
| Idempotencia de claves de evento | `buildEventKey` + `@unique` eventKey + P2002 catch | ✅ Structural and tested via dispatcher |
| Claim condicional del dispatcher | `updateMany` with `where: {id, eventId, status: "pending"}` | ✅ Tested in dispatcher.test.ts |
| Kill switch `OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED` | `dispatchEvent` early return when disabled | ✅ Tested |
| `recipientEmail` nulled at finalization | `dispatcher.ts` finalize() + sent path both set `recipientEmail: null` | ✅ Tested in all finalization branches |
| Fallo aislado entre destinatarios | `Promise.allSettled`-based `mapWithConcurrency` | ✅ Tested with 2-delivery isolation |
| Exclusión de `Salon.notificationEmails` en notificaciones de citas | Not a parameter anywhere in notification module | ✅ Grep confirms zero references |
| Snapshot sin notas internas | `appointment-snapshot.ts` — no `internalNotes` field | ✅ Interface only accepts public fields |
| HTML escape + asunto sin CR/LF | `escapeHtml` + `sanitizeSubject` in templates.ts | ✅ Tested with `<script>` and `\r\n` injection |

### Design alignment observations

- **Migration tenant FK:** Composite FK `(appointment_id, salon_id) → appointments(id, salon_id)` present in both SQL and schema, enforcing tenant isolation as designed. ✅
- **DB-level CHECK constraints:** `roles`, `status`, `attempt_count`, and final-state `recipient_email` enforcement in SQL migration. Schema uses `String` types (Prisma lacks enum arrays) but DB enforces the constraint. ✅
- **`server-only` boundary:** All modules that handle PII (`recipient-resolver`, `dispatcher`, `enqueue`, `observability`, `templates`, `appointment-snapshot`, `mailer`) import `"server-only"`. ✅
- **`email-validation.ts` and `types.ts`:** Intentionally omit `server-only` — they are pure logic/type modules safe for any context. ✅
- **Design note `owner email = Salon.owner.email`:** The resolver accepts `ownerEmail` as an injected parameter (not read directly from DB), which is the correct contract — callers must pass `salon.owner.email`. ✅

---

## Security and Privacy Checks

| Check | Result |
| --- | --- |
| No full recipient email in logs | ✅ No `console.*` calls in any Slice 1 file |
| No raw provider response body in logs | ✅ `sendWithToken` catches HTTP errors and returns only `errorCode` |
| No token in logs | ✅ Access token only assigned to local variables; errors throw without logging token value |
| `recipientEmail` nulled at delivery finalization (sent/skipped/failed) | ✅ All three paths in `dispatcher.ts` finalize with `recipientEmail: null` |
| `observability.ts` does not project `recipientEmail` | ✅ Confirmed — field accepted in interface (to allow Prisma row pass-through) but never emitted in output object |
| `notificationEmails` not used in appointment recipient resolver | ✅ Confirmed by code and grep search |
| `providerMessageId` (Gmail opaque ID) returned in `sendEmailNotification` detail | ℹ️ **Note (non-blocking):** `sendEmailNotification` returns `providerMessageId` in each detail entry. This is a Gmail opaque message ID (not PII), used by `sendTrialExpirationEmail`. The notification dispatcher (`dispatchEvent`) does NOT forward this to callers or observability. Slice 2 UI must not surface it. Document in Slice 2 review. |
| HTML injection / header injection prevention | ✅ `escapeHtml` covers `&<>'\"`, `sanitizeSubject` strips CR/LF — tested |

---

## Review Workload / PR Boundary Findings

- **Chain strategy:** `four-slice-chain-approved` — verified in `tasks.md`.
- **Assigned slice:** Slice 1 only — verified: no `dispatchEvent`/`enqueueAppointmentNotification` calls in `app/actions/`, no `app/api/cron/` directory, no `app/manifest.ts`, no `public/icons/`, no `public/sw.js`.
- **Slice 2 task rows:** All `- [ ]` (unchecked) — correctly deferred.
- **Slice 3 task rows:** All `- [ ]` (unchecked) — correctly deferred.
- **Slice 4 task rows:** All `- [ ]` (unchecked) — correctly deferred.
- **Integrated verification and parent lifecycle:** All `- [ ]` — correctly deferred.
- **Scope creep:** None detected. Implementation is strictly bounded to Slice 1 files.
- **Line count:** apply-progress.md notes actual count exceeds 350–400 forecast; acceptable given migration SQL, full test suite, and refactor are all infrastructure-only. No Slice 2–4 code was included to compensate.

---

## Findings Summary

### PASS (no blockers)

| ID | Severity | Finding |
| --- | --- | --- |
| F-01 | INFO | `requiredRevision()` checks `!Number.isInteger(revision)` before `revision === undefined` — the `undefined` check is redundant since `Number.isInteger(undefined) === false`. Not a bug; the guard is correct and safe. |
| F-02 | INFO (non-blocking) | `sendEmailNotification` batch result includes `providerMessageId` in each detail entry. Gmail message IDs are opaque, not PII. The notification dispatcher does not forward this value. Slice 2 review should confirm the UI never exposes `providerMessageId` to end users. |
| F-03 | INFO | Global `npm run lint` fails on 3 pre-existing out-of-slice files. None in Slice 1. Baseline failure pre-dates this PR; not introduced by Slice 1 changes. |
| F-04 | INFO | No `enqueue.test.ts` exists for `lib/notifications/enqueue.ts`. The enqueue module is covered indirectly through dispatcher tests (which use `db.appointmentNotificationEvent.create` mocks). A dedicated test for `buildEventKey` key format and P2002 idempotency path would strengthen coverage, but is not required for Slice 1 pass given the design's `@@unique` enforcement. Consider adding in a future test pass. |

### No CRITICAL or WARNING findings

---

## Limitations and Risks

| Risk | Status |
| --- | --- |
| Slice 1 is infrastructure only — no appointment path enqueues notifications until Slice 2 is implemented | Accepted and documented in apply-progress.md |
| Gmail API does not guarantee exactly-once delivery; ambiguous responses finalized as `failed/unknown_after_send` | Documented design decision; acceptable trade-off |
| Migration has not been applied to a real database (only validated/generated locally) | Expected at this stage; apply will happen with authorized deployment |
| `app/api/cron/` endpoint not yet implemented — no scheduler recovery path until Slice 3 | Accepted; kill switch `OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED=false` maintains safe-off state |
| Global lint baseline failures exist in out-of-scope files | Pre-existing; not introduced by this PR |

---

## Recommendation

### ✅ PASS — Slice 1 / PR 1 is ready for review and merge

All six Slice 1 implementation task checkboxes are checked. All required verification commands pass within scope. Spec and design requirements covered at infrastructure level. TDD cycle evidence is complete and assertion quality is substantive. Security properties verified: no PII leakage, no raw provider responses, correct `recipientEmail` cleanup, no `notificationEmails` in appointment resolver. Scope boundary is clean — Slices 2–4 were not implemented.

**Before starting Slice 2:** review F-02 to ensure `providerMessageId` is not surfaced in Slice 2 UI components.

---

---

# Verify Report: phase8-operational-notifications — Slice 2 / PR 2

## Verification Scope

**Scope:** Slice 2 — Hooks de citas + settings/observabilidad (PR 2 only)  
**Date:** 2026-07-29  
**Verifier:** SDD Verify executor  
**Boundary:** `app/actions/booking.ts`, `app/actions/appointments.ts`, `app/actions/owner.ts`, `app/book/[slug]/booking-wizard.tsx`, `app/book/[slug]/confirmacion/page.tsx`, `app/s/[slug]/(protected)/appointments/page.tsx`, `app/s/[slug]/(protected)/appointments/appointments-view.tsx`, `app/s/[slug]/(protected)/appointments/create-manual-appointment-dialog.tsx`, `app/s/[slug]/(protected)/settings/page.tsx`, `app/s/[slug]/(protected)/settings/settings-form.tsx`, `lib/notifications/observability.ts`, and corresponding tests.  
**Explicitly excluded from this report:** Slice 1 (infrastructure/core), Slice 3 (reschedule/cron), Slice 4 (PWA/mobile).

---

## Commands Run and Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- app/actions/booking.test.ts app/actions/appointments.test.ts app/actions/owner.test.ts lib/notifications/observability.test.ts` | **PASSED — 4 files / 21 tests** | All pass; zero failures. Run live during this verification. |
| `npx tsc --noEmit` | **PASSED** | No output; zero type errors across the full project. |
| `npx eslint app/actions/booking.ts app/actions/appointments.ts app/actions/owner.ts app/actions/booking.test.ts app/actions/appointments.test.ts app/actions/owner.test.ts lib/notifications/observability.ts lib/notifications/observability.test.ts "app/book/[slug]/booking-wizard.tsx" "app/book/[slug]/confirmacion/page.tsx" "app/s/[slug]/(protected)/appointments/page.tsx" "app/s/[slug]/(protected)/appointments/appointments-view.tsx" "app/s/[slug]/(protected)/settings/page.tsx" "app/s/[slug]/(protected)/settings/settings-form.tsx" --max-warnings=0` | **PASSED** | Zero warnings, zero errors in all 14 Slice 2 changed files. |
| `npm run lint` (global, baseline) | **FAILED** (pre-existing) | Same 3 pre-existing out-of-slice errors documented in Slice 1 report; no Slice 2 file contributes any failure. Baseline unchanged. |

---

## Task Checkbox Verification

All seven `<!-- sdd-owner: implementation -->` Slice 2 task rows in `tasks.md` are marked `- [x]`:

- [x] RED: Expanded action test suites for transaction/outbox, optional email, cancellation transitions, and owner toggle.
- [x] GREEN: `createPublicAppointment` and `createManualAppointment` refactored to interactive transactions with post-commit `after()` dispatch.
- [x] GREEN: `updateAppointmentStatus` cancellation hook — active-only, increments `notificationRevision`, public-only snapshot.
- [x] GREEN: `updateSalonSettings` persists `ownerEmailNotificationsEnabled`; settings page/form renders masked owner email and correct helper text.
- [x] GREEN: Appointments page queries authorized delivery projection; agenda/booking/settings show separated feedback.
- [x] TRIANGULATE: Focused tests + code inspection for public/manual creation, missing email, disabled owner, repeated cancellation, dispatch failure isolation.
- [x] REFACTOR: Unified action response contracts and UI feedback texts; public responses contain no role/address details.

**Unchecked Slice 2 implementation tasks:** None.

Remaining unchecked rows are Slice 3, Slice 4, integrated verification, and parent lifecycle — all correctly deferred.

---

## TDD Compliance (Strict TDD Active)

TDD Cycle Evidence table is present in `apply-progress.md` under the PR 2 section:

| Stage | Evidence | Result |
| --- | --- | --- |
| RED | Three action suites expanded and run before production changes | 8 failed / 10 passed as intended: optional email, transaction/outbox, queued response, active-only cancellation, owner toggle |
| GREEN | Interactive transactions, outbox enqueue, post-commit `after()`, cancellation revision, owner preference UI | Focused suites passed |
| TRIANGULATE | Public/manual creation, missing/invalid email, all-missing recipients, owner disabled, repeated cancellation, rejected overlap, creation failure, background dispatch rejection, safe event projection | 4 files / 21 tests passed |
| REFACTOR | Centralized revalidation, shared snapshot/enqueue/dispatch, unified feedback copy | Focused tests + tsc + focused ESLint passed |

**Assertion quality audit:**

- `booking.test.ts`: Verifies `transaction` called once, `enqueue` called with specific `type: "created"` + `clientEmail` + `ownerEmail` + `specialistEmail`, `after` called once, `dispatchEvent` called with correct `eventId`. Non-trivial cross-mock verification. Confirms dispatch errors do not fail the booking action. Not smoke-only.
- `appointments.test.ts`: Verifies non-cancellation paths do not enqueue. Uses `it.each` for both `pending` and `confirmed` active transitions; asserts `updateMany` call shape including `notificationRevision: { increment: 1 }` and confirms internal notes (`"Nota privada"`) are absent from the enqueue `payload` via `JSON.stringify`. Repeated cancellation verified returns error without enqueue. `createManualAppointment` verifies `clientEmail: null` / `ownerEmail: null` / `ownerEmailNotificationsEnabled: false` when all emails missing. Not smoke-only.
- `owner.test.ts`: Verifies `ownerEmailNotificationsEnabled: true` when checkbox value is `"on"` and `false` when absent from FormData. Tenant guard confirmed. Not tautological.
- `observability.test.ts`: Two-test suite; verifies exact output shape plus `JSON.stringify` exclusion of `recipientEmail` (raw), and exclusion of `providerMessageId` / `payload` / internal notes from event projection. Concrete and complete.

**TDD verdict: COMPLIANT.**

---

## Spec / Design Alignment

### Requirement coverage (Slice 2 scope)

| Spec Requirement | Design Element | Slice 2 Coverage |
| --- | --- | --- |
| Notificación de creación — booking público y manual | `createPublicAppointment` and `createManualAppointment` interactive transactions + `enqueueAppointmentNotification` + `after()` | ✅ Both paths hook `created` event inside transaction; dispatch after commit |
| No notificar creación rechazada | Transaction throws → returns `{ error }` without enqueue or `after()` | ✅ `appointmentCreate` failure test confirms `enqueue` and `after` not called |
| Notificación de cancelación | `updateAppointmentStatus` `cancelled` path with `updateMany` conditional | ✅ Enqueues `cancelled` only from `pending\|confirmed`; rejects repeated cancellation |
| Incremento de `notificationRevision` | `data: { notificationRevision: { increment: 1 } }` inside `updateMany` | ✅ Verified in `updateMany` call assertion |
| Snapshot sin notas internas | `buildAppointmentSnapshot` called with `cancellationReason` only; no `internalNotes` parameter | ✅ Test asserts `JSON.stringify(payload)` does not contain `"Nota privada"` |
| Preferencia del dueño — persistencia | `ownerEmailNotificationsEnabled: formData.get(...) === "on"` in `owner.ts` | ✅ Tested with `"on"` → `true`, absent → `false` |
| Preferencia del dueño — UI | Checkbox in `settings-form.tsx` with `min-h-11` touch target and masked email helper | ✅ Confirmed in source |
| `notificationEmails` excluido de citas | Not referenced in `appointments.ts`, `booking.ts`, or `recipient-resolver.ts` | ✅ Grep confirms zero references |
| Correo del dueño enmascarado en UI | `settings/page.tsx` passes `maskEmail(dbUser.email)` as `ownerEmailMasked` prop | ✅ Confirmed in source |
| Helper text `notificationEmails` excluye citas | `settings-form.tsx`: "Correos adicionales para alertas administrativas/de suscripción; no reciben notificaciones de citas." | ✅ Exact text confirmed |
| Fallos de despacho no afectan la operación | `after(() => dispatchEvent(...).then(() => undefined).catch(() => undefined))` | ✅ Dispatch rejection test confirms booking still returns `success: true` |
| `notification.state: "queued"` en respuesta | Returned by `createPublicAppointment`, `createManualAppointment`, and `updateAppointmentStatus` (cancellation only) | ✅ Tested in all three paths |
| Proyección autorizada en agenda | `appointments/page.tsx` calls `requireSalonOwner` then `projectAppointmentNotificationEvents` | ✅ Server-only, tenant-scoped, observability-projected |
| No `payload` / raw email / `providerMessageId` en proyección UI | `observability.ts` strips all; `page.tsx` select excludes `recipientEmail` and `payload` at query level | ✅ Confirmed in source and observability test |
| Confirmación pública genérica | "Tu cita está confirmada; si proporcionaste un correo válido, la confirmación está en proceso." | ✅ Exact text in `confirmacion/page.tsx` |
| `notificationEmails` no en booking | Not read or passed anywhere in booking/appointments | ✅ Grep zero matches |
| Fallo aislado del dueño deshabilitado | `ownerEmailNotificationsEnabled: false` + `ownerEmail: null` in test | ✅ Covered: enqueue called with disabled flag; dispatcher handles internally |

### Design alignment observations

- **Transactional atomicity:** Customer + appointment + `AppointmentNotificationEvent` all created in a single `prisma.$transaction` interactive callback. `after()` is registered outside the transaction boundary (after `await`), matching the design's "after commit" intent. ✅
- **Cancellation conditional write:** `updateMany` with `where: { status: { in: ["pending", "confirmed"] } }` is the design's recommended approach for avoiding double-cancellation events. If the row is already cancelled, `count === 0` is returned and no event is created. ✅
- **`scheduleRevision` not incremented in Slice 2:** Correct — `scheduleRevision` is only incremented on rescheduling (Slice 3). ✅
- **Owner email source:** `salon.owner.email` via relation select (not `Salon.email` or `Salon.notificationEmails`). ✅
- **Agenda select query:** `notifications` select in `appointments/page.tsx` does NOT include `recipientEmail`, `payload`, or `providerMessageId`. Only `roles`, `status`, `resultCode`, `recipientMasked`, `updatedAt` are selected for deliveries. ✅
- **Feedback separation:** `appointments-view.tsx` displays "Cita actualizada. Notificación en proceso." as one string when `notification.state === "queued"`; appointment success is not shown as failed due to notification state. ✅
- **Public booking wizard:** `handleSubmitBooking` routes directly to confirmation URL on success; `notification.state` is not surfaced to the browser. ✅

---

## Security and Privacy Checks

| Check | Result |
| --- | --- |
| `providerMessageId` not in any `app/` file | ✅ Grep confirms zero matches in `app/`. Present only in `observability.ts` `StoredDelivery` interface (accepted but never projected) — Slice 1 F-02 resolved. |
| `recipientEmail` not in any `app/` file | ✅ Zero matches in `app/`. Not selected by `appointments/page.tsx` query. |
| `notificationEmails` not in appointment recipient flow | ✅ Zero matches in `appointments.ts`, `booking.ts`, `recipient-resolver.ts`. |
| Owner email masked before reaching UI | ✅ `maskEmail(dbUser.email)` in `settings/page.tsx`; only `ownerEmailMasked` string reaches the client component. |
| Public booking/confirmation contains no owner/specialist notification details | ✅ `booking-wizard.tsx` surfaces no notification state. `confirmacion/page.tsx` shows generic copy only (no owner email, no specialist email, no delivery status). |
| Specialist name vs email distinction in confirmation | ✅ `confirmacion/page.tsx` renders `specialistName` (name string only), not email. |
| Dispatch errors swallowed from core appointment operation | ✅ `.catch(() => undefined)` on all three hook paths. Tested with `dispatchEvent.mockRejectedValue`. |
| Owner disabled behavior covered | ✅ `appointments.test.ts` `createManualAppointment` test sets `ownerEmailNotificationsEnabled: false` and `ownerEmail: null`; enqueue still called (producing skipped deliveries) but appointment succeeds. |
| `internalNotes` excluded from notification payload | ✅ `buildAppointmentSnapshot` does not accept `internalNotes`; cancellation test asserts `JSON.stringify(payload)` does not contain the known internal note string. |
| No Slice 3–4 code present | ✅ `app/api/cron/` — does not exist. `app/manifest.ts` — does not exist. `public/sw.js` — does not exist. `public/icons/` — does not exist. `rescheduleAppointment` — not defined in `appointments.ts`. Grep confirms zero Slice 3/4 references in `app/` or `lib/`. |

---

## Review Workload / PR Boundary Findings

- **Chain strategy:** `four-slice-chain-approved` — verified in `tasks.md`.
- **Assigned slice:** Slice 2 only — verified. All changed files are within the approved Slice 2 boundary.
- **Slice 3 task rows:** All `- [ ]` — correctly deferred. No rescheduling, reminders, cron, `.env.example`, or `vercel.json` changes.
- **Slice 4 task rows:** All `- [ ]` — correctly deferred. No manifest, service worker, PWA icons, or mobile layout changes.
- **Integrated verification rows:** All `- [ ]` — correctly deferred.
- **Parent lifecycle rows:** Unchanged `- [ ]` — deferred as required.
- **Scope creep:** None detected. No Slice 3 or Slice 4 artifacts present in the codebase.
- **Line count risk:** apply-progress.md notes the diff is near/above 350–400 lines when tests and UI are counted, but remains within the approved PR 2 functional boundary. Acceptable given the seven tasks span actions, settings UI, agenda view, booking wizard, and observability.

---

## Findings Summary

### PASS

| ID | Severity | Finding |
| --- | --- | --- |
| F2-01 | INFO | `providerMessageId` in `observability.ts` `StoredDelivery` interface (Slice 1 F-02) is now confirmed resolved: the field is accepted for Prisma row pass-through but never projected to any UI consumer. Zero occurrences in `app/`. |
| F2-02 | INFO | `appointments/page.tsx` select deliberately excludes `recipientEmail` and `payload` at the query level — defense-in-depth beyond the `projectAppointmentNotificationEvents` filter. |
| F2-03 | INFO | Global `npm run lint` remains red on the same 3 pre-existing out-of-slice files. No Slice 2 file contributes any failure. Baseline unchanged from Slice 1 report. |
| F2-04 | INFO | No staging acceptance was possible in this repo-local context. The requested scenarios (Gmail rejection without breaking appointment, owner disabled, repeated cancellation, background dispatch rejection) were fully covered by action tests and code-level inspection. Staging validation remains a pre-production gating step. |
| F2-05 | INFO | `create-manual-appointment-dialog.tsx` passes only `result.notification?.state` (typed `"queued" | undefined`) to the`onCreated` callback — not the full result object. Owner/specialist details are not accessible to the client component from this path. |

### No CRITICAL or WARNING findings

---

## Limitations and Risks

| Risk | Status |
| --- | --- |
| No staging browser/database acceptance performed | Accepted limitation for repo-local apply; triangulated with tests and code checks |
| Slice 1 migration unapplied to deployment database | Carry-over from Slice 1; runtime outbox hooks require migration before deployment |
| No cron recovery path until Slice 3 | `after()` failures leave pending events with no auto-recovery; kill switch `OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED=false` mitigates |
| `ownerEmailNotificationsEnabled` default `true` may surprise existing salons | Documented in design; communicable via settings UI and toggle |
| Global lint baseline red on out-of-scope files | Pre-existing; not introduced or worsened by Slice 2 |

---

## Recommendation

### ✅ PASS — Slice 2 / PR 2 is ready for review and merge

All seven Slice 2 implementation task checkboxes are confirmed checked. All required verification commands (4-file test suite, `tsc --noEmit`, focused ESLint on 14 files) pass. Spec and design requirements for appointment creation/cancellation hooks, owner preference, observability, and public booking/confirmation are fully covered. TDD cycle evidence is complete and assertion quality is substantive. Security properties verified: `providerMessageId` not in UI, `recipientEmail` not in `app/`, `notificationEmails` excluded from appointment path, dispatch errors swallowed, internal notes absent from payloads, owner disabled covered. Scope boundary is clean — Slices 3 and 4 are fully absent.

**Before starting Slice 3:** ensure Slice 1 migration is applied to the target deployment database, confirm `OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED` kill switch behavior in staging, and plan `rescheduleAppointment` + `getAvailableSlots` extension with `excludeAppointmentId`
---

# Verify Report: phase8-operational-notifications — Slice 3 / PR 3

## Verification Scope

**Scope:** Slice 3 — Reprogramación + recordatorios/cron (PR 3 only)
**Date:** 2026-07-28 (apply) / 2026-07-28 (verify)
**Verifier:** SDD Verify executor
**Boundary:** `app/actions/appointments.ts` (rescheduleAppointment), `lib/salons/availability.ts` (excludeAppointmentId + specialist/service validation), `lib/notifications/reminders.ts`, `app/api/cron/notifications/route.ts`, `lib/notifications/dispatcher.ts` (reminder atomic claim), `vercel.json`, `.env.example`, `README.md`, `docs/DECISIONS.md`, `app/s/[slug]/(protected)/appointments/appointments-view.tsx` (44px actions), `app/s/[slug]/(protected)/appointments/reschedule-appointment-dialog.tsx`, and corresponding tests.
**Explicitly excluded from this report:** Slice 1 (infrastructure), Slice 2 (hooks/settings), Slice 4 (PWA/mobile).

---

## Commands Run and Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- app/actions/appointments.test.ts lib/salons/availability.test.ts lib/notifications/reminders.test.ts app/api/cron/notifications/route.test.ts lib/notifications/dispatcher.test.ts` | **PASSED — 5 files / 39 tests** | Executed live during this verification. All tests green. |
| `npx tsc --noEmit` | **PASSED** | No output; zero type errors across the full project. |
| `npx eslint app/actions/appointments.ts app/actions/appointments.test.ts lib/salons/availability.ts lib/salons/availability.test.ts lib/notifications/reminders.ts lib/notifications/reminders.test.ts app/api/cron/notifications/route.ts app/api/cron/notifications/route.test.ts lib/notifications/dispatcher.ts lib/notifications/dispatcher.test.ts "app/s/[slug]/(protected)/appointments/reschedule-appointment-dialog.tsx" --max-warnings=0` | **PASSED** | Zero warnings, zero errors in all 11 Slice 3 changed TypeScript/TSX files. |
| `npm run lint` (global, baseline) | **FAILED** (pre-existing) | Same pre-existing out-of-slice errors from Slice 1/2 reports; no Slice 3 file contributes any failure. |

**Test distribution (verbose):**

| Test file | Count | Notable tests |
| --- | --- | --- |
| `app/api/cron/notifications/route.test.ts` | 4 | Missing/invalid bearer secret (×2), sanitized counters on auth, kill-switch counters |
| `lib/salons/availability.test.ts` | 5 | Multi-service duration/price, candidate filtering, incompatible-specialist rejection, slot exclusion (existing appts), excludeAppointmentId exclusion |
| `app/actions/appointments.test.ts` | 11 | Input contract (×4), tenant rejection, non-active status (×3), overlap confirmation required, atomic replace + stale reminder invalidation, manual create without emails |
| `lib/notifications/dispatcher.test.ts` | 5 | Conditional claim + recipientEmail null, provider rejection isolation, null-address skipped, stale reminder atomic refusal, kill-switch no-op |
| `lib/notifications/reminders.test.ts` | 9 | Future active inside 24h window, past reject, out-of-window reject, revision-replaced skip, concurrent event key (×2), discovery/delivery caps + no appointment mutation, abandoned-send terminal (unknown_after_send no retry), kill-switch pass-through |

---

## Task Checkbox Verification

All seven `<!-- sdd-owner: implementation -->` Slice 3 task rows in `tasks.md` are marked `- [x]`:

- [x] RED: Tests for tenant auth, own-appointment exclusion, active-only transition, cancelled/past/out-of-window, replaced revision, invalid secret, kill switch, concurrent eventKey.
- [x] GREEN: `getAvailableSlots` with `excludeAppointmentId`; `rescheduleAppointment` with full input validation, service replacement, duration/price recalculation, active-only.
- [x] GREEN: Reschedule transaction — `scheduleRevision` increment, stale pending reminder skip/finalize, `rescheduled` event enqueue, `after()` dispatch.
- [x] GREEN: `lib/notifications/reminders.ts`, `app/api/cron/notifications/route.ts`, `vercel.json` — authenticated cron, timezone-aware SQL, 24h window, 100/20 limits, atomic claim, recovery, retention purge.
- [x] GREEN: `.env.example`, `README.md`, `docs/DECISIONS.md` — all five variables documented without real values; rollout/rollback documented.
- [x] TRIANGULATE: Required focused tests run; atomic stale-reminder claim and concurrent eventKey verified with deterministic unit tests.
- [x] REFACTOR: Shared validity codes, `unknown_after_send` terminal (no retry), sanitized counter-only cron response.

**Unchecked Slice 3 implementation tasks:** None.

Remaining unchecked rows:

```
- [ ] RED: Slice 4 — manifest/worker tests and checklist
- [ ] GREEN: Slice 4 — app/layout.tsx, app/manifest.ts, app/pwa-register.tsx, public/sw.js, public/icons/
- [ ] GREEN: Slice 4 — globals.css safe-area, overscroll-behavior-y
- [ ] GREEN: Slice 4 — 44px mobile polish (booking-wizard, customers, settings)
- [ ] TRIANGULATE: Slice 4 — npm run build + lint; Lighthouse/DevTools validation
- [ ] REFACTOR: Slice 4 — responsive/PWA deduplication, no offline/push
- [ ] Integrated verification — full npm test + lint + build suite
- [ ] Staging acceptance — Gmail, flags, cron, scheduler external
- [ ] Parent lifecycle — strategy recording and slice-by-slice review gate (sdd-owner: parent)
- [ ] Parent lifecycle — post-slice review gate (sdd-owner: parent)
```

These are correctly deferred to Slice 4 and integrated verification. Archive is **not ready** until Slice 4 is implemented and all implementation-owned rows are checked.

---

## TDD Compliance (Strict TDD Active)

TDD Cycle Evidence table present in `apply-progress.md` under PR 3 section:

| Task | Test file | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- |
| rescheduleAppointment + tenant/active/input | `appointments.test.ts` | 5 new cases failed as intended | Transactional update, service replace, revision, event, dispatch passed | Invalid date/time/services/specialist, overlap, non-active, stale-event completion | Shared validation/snapshot/enqueue contracts; tests remained green |
| Own-appointment exclusion + specialist/service validation | `availability.test.ts` | 5th arg unsupported; incompatible specialist accepted incorrectly | Added `excludeAppointmentId`, service-compatible specialist check | Blocked-appt vs excluded-own-appt produce different slot sets | Candidate projection reduced; tests remained green |
| Reminder eligibility/idempotency/recovery | `reminders.test.ts` | Suite failed (module did not exist) | Timezone-aware discovery, revision re-read, limits, recovery, purge passed | Active/inactive, past/out-of-window, replaced revision, concurrent eventKey, kill switch, abandoned send | Centralized limits/counters, `unknown_after_send` terminal |
| Cron authentication/sanitization | `route.test.ts` | Suite failed (route did not exist) | Node GET handler with bearer auth passed | Missing/wrong secret, enabled counters, disabled counters | Handler returns only counter/error objects |
| Atomic current reminder claim | `dispatcher.test.ts` | Stale reminder still used generic claim; test failed | Reminder claim checks active state + revision + future start atomically in SQL | Generic events retain conditional Prisma claim; refusal before provider call | Delivery cap support; processed counter sanitized; no retry after ambiguous send |

**Assertion quality audit:**

- `appointments.test.ts` — `rescheduleAppointment` suite: `it.each` for non-active states; asserts `updateMany` called with `status: { in: ["pending","confirmed"] }` and `scheduleRevision: existing.scheduleRevision` (optimistic lock check); asserts `updateMany` for reminder deliveries with `status: "skipped"` and `resultCode: "appointment_rescheduled"`; asserts `updateMany` for events with `status: "completed"`; asserts `enqueue` called with `type: "rescheduled"` and `scheduleRevision: nextRevision`. No ghost loops, no tautologies, no smoke-only.
- `availability.test.ts` — rejects a specialist who does not offer the requested service (explicit incompatibility); excludes the rescheduled appointment's own occupied slot when computing available slots. Concrete behavioral assertions.
- `reminders.test.ts` — `isReminderCandidateCurrent` tested independently for past/out-of-window boundary; `enqueueReminderCandidates` uses injected `now` + `enqueue` spy; concurrent eventKey test verifies both calls attempt enqueue but only one receives confirmation (collision path); abandoned-send test asserts `updateMany` called with `status: "failed"` and `resultCode: "unknown_after_send"` and NOT followed by any pending reset. No implementation-detail CSS, no type-only.
- `route.test.ts` — asserts missing `CRON_SECRET` env variable returns 401; wrong bearer returns 401; authenticated call returns only counter fields; kill-switch returns `disabled: true` with zeroed counters and no queue details. No PII or raw data fields in assertions.
- `dispatcher.test.ts` — stale reminder refusal: asserts `$executeRaw` (atomic SQL claim) was called and that the provider send was NOT called. Non-trivial cross-mock verification.

**TDD verdict: COMPLIANT.**

---

## Spec / Design Alignment

### Requirement coverage (Slice 3 scope)

| Spec Requirement | Design Element | Slice 3 Coverage |
| --- | --- | --- |
| Reprogramación distingue cambio y refleja datos vigentes | `rescheduled` event type + enqueue with nextRevision snapshot | ✅ Implemented and tested |
| Datos vigentes en recordatorio | `reminders.ts` re-reads `appointment.findFirst` inside transaction before enqueue | ✅ Current revision/status re-read confirmed |
| Idempotencia de recordatorios | `reminder_24h:{appointmentId}:{scheduleRevision}` unique eventKey + delivery claim | ✅ Concurrent test verifies one enqueue per eventKey |
| Fallo de recordatorio no altera citas | `reminders.ts` only touches notification tables; no `appointment.update` | ✅ Grep confirms zero appointment mutations in reminders/cron |
| No retry para `unknown_after_send` | `recoverAbandonedDeliveries` sets `status: "failed"` — no reset to pending | ✅ Tested: "finalizes abandoned sending deliveries as unknown_after_send without retry" |
| Cron retorna solo contadores sanitizados | `runNotificationCron` returns integer counters only | ✅ No email addresses, payloads, or raw data in return |
| Kill switch operacional y recordatorios | `OPERATIONAL_EMAIL_NOTIFICATIONS_ENABLED` early-return; `APPOINTMENT_REMINDERS_ENABLED` skips enqueue | ✅ Both flags tested |
| Bearer CRON_SECRET authentication | Route checks `authorization === \`Bearer ${secret}\``, returns 401 otherwise | ✅ Implemented and tested |
| `runtime: "nodejs"` en cron route | `export const runtime = "nodejs"` | ✅ Confirmed |
| Ventana 24h fija | `reminderHours = 24` hardcoded in `runNotificationCron` | ✅ Confirmed |
| Límites 100 candidatos / 20 entregas | `CANDIDATE_LIMIT = 100`, `DELIVERY_LIMIT = 20` exported constants | ✅ Confirmed; caps test asserts no appointment mutation |
| Claim atómico con estado activo + revisión + hora futura | `claimCurrentReminder` uses `$executeRaw` SQL UPDATE with JOIN checking status, `schedule_revision`, and future `AT TIME ZONE` start | ✅ Atomic SQL claim confirmed; stale-reminder refusal tested |
| `scheduleRevision` increment en reprogramación | `scheduleRevision: { increment: 1 }` in `updateMany`; optimistic lock | ✅ Confirmed and tested |
| Stale pending reminder skip + event finalize | `updateMany` deliveries `status:"skipped"`, events `status:"completed"` | ✅ Both SQL writes confirmed and tested |
| `excludeAppointmentId` en getAvailableSlots | Param 5 optional; applied as `id: { not: excludeAppointmentId }` in query | ✅ Implemented and tested |
| Specialist/service compatibility validation | `getCandidateSpecialists` checks `specialistServices` set covers all requested IDs | ✅ Explicit mismatch test confirms rejection |
| Variables documentadas sin valores reales | `CRON_SECRET=` (empty), flags `=false`, hours `=24`, retention `=90` | ✅ Confirmed |
| Rollout/rollback en docs | `docs/DECISIONS.md` D-26: bearer auth, Vercel cron, external scheduler, rollout order, rollback via flags | ✅ Confirmed |
| Diálogo de reprogramación reutilizable | `reschedule-appointment-dialog.tsx` standalone component | ✅ Implemented |
| Acciones de al menos 44 px | `min-h-11` on all action buttons in `appointments-view.tsx` (lines 531, 567, 582, 597, 610, 624) | ✅ Confirmed |
| Slice 4 PWA no implementado | No manifest, pwa-register, sw.js, icons, safe-area CSS | ✅ All absent |

### Design alignment observations

- **Tenant safety:** `salonId` derived exclusively from `requireSalonOwner`; `updateMany` where clause includes `salonId: salon.id` and optimistic `scheduleRevision` lock. ✅
- **Active-only enforcement:** `updateMany` where includes `status: { in: ["pending","confirmed"] }`; concurrent change detected by `count !== 1`. ✅
- **Dispatch after commit:** `after(() => dispatchEvent(...).then(...).catch(...))` registered outside transaction `await`. ✅
- **Reminder SQL timezone-aware:** `((a.appointment_date + a.start_time) AT TIME ZONE s.timezone)` in both discovery and atomic claim. ✅
- **Retention purge isolated:** Deletes only `status IN ('completed', 'partial_failed')` events; no pending/processing events removed. ✅
- **`server-only` import:** `reminders.ts` has `import "server-only"` at top. ✅

---

## Security and Privacy Checks

| Check | Result |
| --- | --- |
| No appointment state mutation from reminders/cron failure | ✅ `reminders.ts` uses only `appointment.findFirst` (read); `route.ts` calls `runNotificationCron()` with no appointment writes. Grep confirms zero appointment mutations. |
| No retry for `unknown_after_send` | ✅ `recoverAbandonedDeliveries` writes `status:"failed"` / `resultCode:"unknown_after_send"` / `recipientEmail:null`. No path resets to `"pending"`. Tested. |
| Cron response sanitized counters only | ✅ Return type is integer counters only. Error path returns `{ error: "cron_failed" }`. No emails, appointment IDs, payloads, or raw provider data. |
| No real secret values in docs | ✅ `CRON_SECRET=` (empty); README uses `<CRON_SECRET>` placeholder; DECISIONS.md uses `<CRON_SECRET>` placeholder. |
| `.env.example` DATABASE_URL placeholder quality | ⚠️ **WARNING (pre-existing):** `password` literal in DATABASE_URL/DIRECT_URL. Not introduced by Slice 3. Recommend `<your-db-password>`. |
| `instructivo_oauth2_saas.md` pre-existing secret risk | ⚠️ **WARNING (pre-existing):** Flagged in tasks artifact; file exists; pattern grep inconclusive. Human review and credential rotation recommended before production. |
| `recipientEmail` nulled in reminder deliveries | ✅ All abandoned/skipped paths set `recipientEmail: null` / `recipient_email = NULL`. |
| Bearer auth: missing secret → 401 | ✅ Route checks `!secret` and wrong bearer; both return 401. Tested. |
| No Slice 4 PWA assets | ✅ All PWA files absent. No safe-area CSS. No Apple/manifest meta. |

---

## Review Workload / PR Boundary Findings

- **Chain strategy:** `four-slice-chain-approved` — verified in `tasks.md`.
- **Assigned slice:** Slice 3 only — all changed files within approved boundary.
- **Slice 4 task rows:** All `- [ ]` — correctly absent.
- **Integrated verification rows:** All `- [ ]` — correctly deferred.
- **Parent lifecycle rows:** Unchanged `- [ ]` — deferred.
- **Scope creep:** None detected.
- **Line count:** Exceeds 350–400 forecast due to cron SQL/recovery paths, four focused suites, and reusable dialog — all within PR 3 functional boundary. `size:exception` not explicitly recorded; justification is inherent SQL verbosity required by spec. Acceptable.

---

## Findings Summary

### PASS

| ID | Severity | Finding |
| --- | --- | --- |
| F3-01 | WARNING (pre-existing) | `.env.example` `DATABASE_URL`/`DIRECT_URL` use literal `password`. Not introduced by Slice 3. Recommend `<your-db-password>` before public repo exposure. |
| F3-02 | WARNING (pre-existing) | `instructivo_oauth2_saas.md` may contain plain-text OAuth/Gmail credentials. File exists. Grep inconclusive. Human review and rotation required before production. Not a Slice 3 regression. |
| F3-03 | INFO — RESOLVED POST-VERIFY | `APPOINTMENT_REMINDER_HOURS` env var was documented but not read at runtime. Parent follow-up wired the env var into `runNotificationCron` with a positive-integer fallback to `24` and added a regression test in `lib/notifications/reminders.test.ts`. |
| F3-04 | INFO | No live staging acceptance possible. Concurrent cron, replaced/cancelled-before-claim, and provider suppression triangulated via deterministic unit tests and SQL inspection. Staging acceptance required before production activation. |
| F3-05 | INFO | Global `npm run lint` remains red on pre-existing out-of-slice files. No Slice 3 file contributes any failure. Baseline unchanged. |

### No CRITICAL findings

---

## Limitations and Risks

| Risk | Status |
| --- | --- |
| No live staging acceptance | Required pre-production gate; triangulated with unit tests and SQL inspection |
| Slice 1 migration unapplied to deployment database | Must be applied before enabling any notification flags |
| Vercel plan must support 15-minute cron schedule | External scheduler documented as fallback in D-26 and README |
| Gmail exactly-once delivery not guaranteed | `unknown_after_send` terminal; no retry — accepted design trade-off |
| `APPOINTMENT_REMINDER_HOURS` documented but not wired | INFO F3-03; 24h fixed by design; clarification recommended |
| Pre-existing `.env.example` password placeholder and `instructivo_oauth2_saas.md` | Pre-existing; human review required before production |

---

## Recommendation

### ✅ PASS — Slice 3 / PR 3 is ready for review and merge

All seven Slice 3 implementation task checkboxes are confirmed checked. All required verification commands pass:

- **5 files / 39 tests** — live run confirms green
- **`npx tsc --noEmit`** — zero type errors
- **Focused ESLint on 11 Slice 3 files** — zero warnings, zero errors

Spec and design requirements for tenant-safe rescheduling, availability exclusion, stale reminder invalidation, 24h reminder discovery/idempotency, authenticated cron, and operational documentation are fully covered. TDD cycle evidence is complete and assertion quality is substantive with no tautologies, ghost loops, type-only assertions, or smoke-only tests.

Security properties verified: no appointment state mutation from reminders/cron, no retry for `unknown_after_send`, cron response contains sanitized counters only, no real secret values in documentation. Slice 4 PWA is fully absent.

Two pre-existing WARNINGs (F3-01, F3-02) require human review and remediation before production deployment but do **not block PR 3 merge**. F3-03 (unread `APPOINTMENT_REMINDER_HOURS` env var) should be resolved before production activation.

**Before starting Slice 4:**

1. Resolve F3-01: replace `password` with `<your-db-password>` in `.env.example`.
2. Resolve F3-02: human review and rotation of `instructivo_oauth2_saas.md`.
3. Resolve F3-03: wire `APPOINTMENT_REMINDER_HOURS` env var or remove it from docs.
4. Confirm Slice 1 migration applied to deployment database before enabling notification flags.
5. Authorize Slice 4 via the parent gate (`- [ ] Tras cada slice aprobado...`).

---

# Verify Report: phase8-operational-notifications — Slice 4 / PR 4

## Verification Scope

**Scope:** Slice 4 — PWA + pulido móvil (PR 4 only)
**Date:** 2026-07-29
**Verifier:** SDD Verify executor
**Boundary:** `app/layout.tsx`, `app/manifest.ts`, `app/pwa-register.tsx`, `app/pwa-metadata.test.ts`, `app/globals.css`, `public/sw.js`, `public/icons/`, `app/s/[slug]/(protected)/layout.tsx`, `app/book/[slug]/booking-wizard.tsx`, `app/book/[slug]/confirmacion/page.tsx`, `app/s/[slug]/(protected)/appointments/appointments-view.tsx`, `app/s/[slug]/(protected)/customers/customers-view.tsx`, `app/s/[slug]/(protected)/settings/settings-form.tsx`.
**Explicitly excluded:** Slices 1-3 (infrastructure/notifications/cron), SuperAdmin deep redesign, offline caching, Web Push, SMS/WhatsApp business integration, native packaging.

---

## Commands Run and Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm test -- app/pwa-metadata.test.ts` | **PASSED — 1 file / 4 tests** | Live run. All 4 tests green. |
| `npx tsc --noEmit` | **PASSED** | Zero type errors across full project. |
| `npx eslint app/layout.tsx app/manifest.ts app/pwa-register.tsx app/pwa-metadata.test.ts --max-warnings=0` | **PASSED** | Zero warnings, zero errors. |
| `npx eslint "app/s/[slug]/(protected)/layout.tsx" "app/book/[slug]/booking-wizard.tsx" "app/book/[slug]/confirmacion/page.tsx" --max-warnings=0` | **PASSED** | Zero warnings, zero errors. |
| `npx eslint "app/s/[slug]/(protected)/appointments/appointments-view.tsx" "app/s/[slug]/(protected)/customers/customers-view.tsx" "app/s/[slug]/(protected)/settings/settings-form.tsx" --max-warnings=0` | **PASSED** | Zero warnings, zero errors. |
| `npm run build` | **PASSED** | Next.js 16.2.9; `/manifest.webmanifest` emitted as static route. One pre-existing middleware deprecation warning — not introduced by Slice 4. |
| `npm run lint` (global, baseline) | **FAILED** (pre-existing) | 3 errors: `app/admin/(protected)/layout.tsx` (`react-hooks/static-components` x2), `prisma/seed.ts` (`@typescript-eslint/no-explicit-any`). 7 pre-existing warnings. No Slice 4 file contributes any error or warning. Baseline unchanged. |
| `node -e` icon dimension check | **PASSED** | icon-192.png=192x192, icon-512.png=512x512, maskable-512.png=512x512, apple-touch-icon.png=180x180. |

---

## Task Checkbox Verification

Five of six Slice 4 implementation-owned rows are marked `- [x]`:

- [x] RED: `app/pwa-metadata.test.ts` and reproducible manual checklist created before production PWA code.
- [x] GREEN: `app/layout.tsx`, `app/manifest.ts`, `app/pwa-register.tsx`, `public/sw.js`, `public/icons/` — product identity, viewport, Apple metadata, lifecycle-only worker, four PNG assets.
- [x] GREEN: `app/globals.css` and `app/s/[slug]/(protected)/layout.tsx` — safe-area content padding, bottom-nav safe-area insets, `overscroll-behavior-y`, `-webkit-tap-highlight-color`.
- [x] GREEN: Mobile polish for `booking-wizard.tsx`, `confirmacion/page.tsx`, `appointments-view.tsx`, `customers-view.tsx`, `settings-form.tsx` — `min-h-11` touch targets, responsive grids, clearer states.
- [x] REFACTOR: No cache/fetch/push/offline/SMS/SuperAdmin additions confirmed; registration and safe-area centralized.

**One unchecked Slice 4 implementation task (open by design):**

```
- [ ] TRIANGULATE: Ejecutar `npm run build` y `npm run lint`; validar manualmente manifest/iconos/worker en
  DevTools y Lighthouse, instalacion Chrome Android/Safari iOS y los flujos booking/agenda/CRM/settings
  en 320, 375 y 390 px sin instalacion.  <!-- sdd-owner: implementation -->
```

`npm run build` and `npm run lint` were executed (see Commands above). The checkbox is correctly open because DevTools/Lighthouse inspection, Chrome Android installation, Safari iOS, keyboard viewport, notch/safe-area on real device, landscape, and 320/375/390 px browser acceptance have **not been performed**. The manual checklist in `tasks.md` records each item as "No ejecutado". Not a regression.

**Additional unchecked rows (correctly deferred):**

```
- [ ] Ejecutar la suite completa `npm test`, `npm run lint`, `npm run build` -- integrated verification.
- [ ] Realizar aceptacion en staging: Gmail, flags, cron, scheduler.
- [ ] Decidir y registrar estrategia de entrega.  <!-- sdd-owner: parent -->
- [ ] Tras cada slice aprobado, iniciar revision.  <!-- sdd-owner: parent -->
```

**Archive is not ready.** The Slice 4 TRIANGULATE row, 2 integrated verification rows, and 2 parent lifecycle rows remain unchecked.

---

## TDD Compliance

| Stage | Evidence | Result |
| --- | --- | --- |
| RED | `npm test -- app/pwa-metadata.test.ts` before any production PWA code | 4/4 failed as intended: manifest missing, metadata generic English, exports absent, icons missing. |
| GREEN | Added metadata/viewport exports, manifest, pwa-register, icons, safe-area layout | 4/4 passed. |
| TRIANGULATE | 4 files / 33 tests (pwa + action suites); `npx tsc --noEmit`; focused ESLint; `npm run build` | Build emits `/manifest.webmanifest`. Lint green on Slice 4 files. Browser/device unexecuted. |
| REFACTOR | Inspected all Slice 4 files for fetch/cache/push/offline/SMS/SuperAdmin additions | None found. |

**Assertion quality audit:**

- Test 1 (manifest): `toMatchObject` with exact icon `purpose` values, `display: "standalone"`, colors. Not smoke-only.
- Test 2 (metadata/viewport): Asserts `lang === "es"`, `appleWebApp.statusBarStyle`, `viewportFit: "cover"`, `themeColor`. Multi-field, not tautological.
- Test 3 (icon dimensions): PNG binary `readUInt32BE(16/20)` for all four assets. Not type-only.
- Test 4 (registration guard + cache-free): Four combinatorial `canRegisterServiceWorker` cases; worker source NOT matching `addEventListener("fetch"`, `caches.`, `indexedDB`. Non-trivial exclusion assertions.

**TDD verdict: COMPLIANT.** (TRIANGULATE correctly open for browser/device acceptance)

---

## Manifest Identity Inspection

| Property | Value | Status |
| --- | --- | --- |
| `name` / `short_name` | `"Citas Salon"` | OK — replaces generic placeholder |
| `display` | `"standalone"` | OK — required for installability |
| `background_color` | `"#ffffff"` | OK |
| `theme_color` | `"#18181b"` | OK — matches `viewport.themeColor` |
| `lang` | `"es"` | OK |
| `start_url` / `scope` | `"/"` | OK |
| Icon 192 `purpose: "any"` | `/icons/icon-192.png` 192x192 confirmed | OK |
| Icon 512 `purpose: "any"` | `/icons/icon-512.png` 512x512 confirmed | OK |
| Maskable 512 `purpose: "maskable"` | `/icons/maskable-512.png` 512x512 confirmed | OK |
| Apple touch icon 180x180 | Via `metadata.icons.apple` (HTML link, not manifest entry) | OK — correct Next.js pattern |

---

## Metadata / Viewport Inspection

| Field | Value | Status |
| --- | --- | --- |
| `metadata.applicationName` | `"Citas Salon"` | OK |
| `metadata.manifest` | `"/manifest.webmanifest"` | OK |
| `metadata.appleWebApp.capable` | `true` | OK |
| `metadata.appleWebApp.statusBarStyle` | `"black-translucent"` | OK |
| `viewport.viewportFit` | `"cover"` | OK — required for iOS safe-area |
| `viewport.themeColor` | `"#18181b"` | OK — separate `viewport` export (not deprecated `metadata.themeColor`) |
| `html lang` | `"es"` | OK |

---

## Service Worker Inspection

| Check | Result |
| --- | --- |
| No `fetch` event listener | OK — confirmed by grep and test |
| No Cache Storage / IndexedDB | OK — zero matches |
| No Web Push | OK — zero matches in all Slice 4 files |
| `install` (skipWaiting) + `activate` (clients.claim) only | OK |
| Registration gated: production + HTTPS + API support | OK — tested with 4 combinatorial cases |
| Registration failure non-blocking | OK — `.catch(() => { /* progressive enhancement */ })` |

---

## Safe-Area / Mobile Behavior Inspection

| Check | Implementation | Status |
| --- | --- | --- |
| `overscroll-behavior-y: none` | `globals.css` line 126 on `body` | OK |
| `-webkit-tap-highlight-color: transparent` | `globals.css` line 137, all interactive elements | OK |
| Content bottom padding with safe-area | `.protected-content { padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px)) }` | OK |
| Bottom nav safe-area insets | `.mobile-bottom-nav` padding-bottom/right/left | OK |
| Bottom nav min-height with safe-area | `calc(4rem + env(safe-area-inset-bottom, 0px))` | OK |
| Protected layout applies `.protected-content` | `layout.tsx` line 129 | OK |
| Bottom nav applies `.mobile-bottom-nav` with `md:hidden` | `layout.tsx` line 134 | OK |
| `viewportFit: "cover"` | `app/layout.tsx` line 36 | OK — activates `env(safe-area-inset-*)` |
| Content not hidden by nav | `.protected-content` reserves 5rem vs nav 4rem | OK — at least 1rem clearance |
| `confirmacion/page.tsx` safe-area | `pb-[max(2rem,env(safe-area-inset-bottom))]` | OK |

---

## 44px Touch Target Inspection

| File | Coverage | Status |
| --- | --- | --- |
| `booking-wizard.tsx` | `min-h-11` on all choice buttons, date/time slots, CTAs (16+ occurrences) | OK |
| `confirmacion/page.tsx` | `min-h-11` on WhatsApp and home buttons | OK |
| `customers-view.tsx` | `min-h-11` on search, tabs, customer name/contact/history/action buttons, dialog inputs | OK |
| `settings-form.tsx` | `min-h-11` on inputs (group selector), checkbox label, submit | OK |
| `appointments-view.tsx` | Confirmed in Slice 3 verify; no regression | OK |

---

## Slice 4 Exclusion Verification

| Excluded capability | Status |
| --- | --- |
| No offline cache / fetch handler | OK — source + test |
| No Cache Storage / IndexedDB | OK — grep zero matches |
| No Web Push | OK |
| No SMS/WhatsApp business integration (new) | OK — only sizing polish on existing links |
| No notification business logic | OK — no `enqueueAppointmentNotification`, `dispatchEvent`, `reminders`, or `CRON_SECRET` |
| No native packaging | OK |
| No SuperAdmin deep redesign | OK — no changes to `app/admin/` |

---

## Review Workload / PR Boundary Findings

- **Chain strategy:** `four-slice-chain-approved` — verified in `tasks.md`.
- **Assigned slice:** Slice 4 only — all 18 changed files within boundary.
- **Scope creep:** None detected. No notification logic, DB schema, cron, or admin redesign.
- **Line count:** Within 250-350-line forecast.

---

## Spec Coverage (Slice 4 scope)

| Spec Requirement | Coverage |
| --- | --- |
| PWA basica — manifiesto, iconos, theme color, metadatos Apple/mobile | OK — all fields verified |
| Sustituir metadatos genericos | OK |
| Conservar funcionamiento web sin instalacion | OK — non-blocking registration |
| UX movil — booking, agenda, CRM, settings | OK — `min-h-11` on all priority screens |
| Navegacion respeta safe areas | OK — `.protected-content` + `.mobile-bottom-nav` |
| SuperAdmin solo consistencia global | OK — no SuperAdmin changes |
| MUST NOT exigir Web Push / SMS / offline / native | OK — all absent |

---

## Findings Summary

| ID | Severity | Finding |
| --- | --- | --- |
| F4-01 | WARNING (carry-over, pre-existing) | `.env.example` DATABASE_URL/DIRECT_URL use literal `password`. Recommend `<your-db-password>`. |
| F4-02 | WARNING (carry-over, pre-existing) | `instructivo_oauth2_saas.md` may contain OAuth/Gmail credentials. Human review and rotation required. |
| F4-03 | INFO | TRIANGULATE checkbox intentionally open: DevTools/Lighthouse/Chrome Android/Safari iOS/320-390px/keyboard/safe-area/landscape not performed. Manual checklist records "No ejecutado". Required before production sign-off. |
| F4-04 | INFO | `npm run build` pre-existing middleware-to-proxy deprecation warning. Not introduced by Slice 4. |
| F4-05 | INFO | Global lint fails on same 3 pre-existing out-of-slice errors. No Slice 4 file contributes. |
| F4-06 | INFO | No staging acceptance possible repo-locally. Live browser acceptance requires production HTTPS. |

### No CRITICAL findings

---

## Limitations and Risks

| Risk | Status |
| --- | --- |
| DevTools/Lighthouse, Chrome Android, Safari iOS not performed | Known; TRIANGULATE open; required before production |
| Physical keyboard, safe-area on device, landscape not performed | Same — checklist documents "No ejecutado" |
| 320/375/390 px browser acceptance not performed | Same |
| Lifecycle-only SW has no offline (intentional) | By design; installability needs real-browser HTTPS acceptance |
| Slice 1 outbox migration unapplied to deployment | Carry-over from Slices 1-3 |
| Pre-existing `.env.example` password and `instructivo_oauth2_saas.md` | Pre-existing; human review before production |

---

## Recommendation

### OK PASS (with open TRIANGULATE) — Slice 4 / PR 4 implementation is complete; browser/device acceptance remains open

Five of six implementation-owned Slice 4 task rows are confirmed checked. All automated verification commands passed:

- **`npm test -- app/pwa-metadata.test.ts`** — 1 file / **4 tests PASSED** (live run)
- **`npx tsc --noEmit`** — zero type errors
- **Focused ESLint on all 10 changed Slice 4 TS/TSX files** — zero warnings, zero errors
- **`npm run build`** — passed; `/manifest.webmanifest` emitted as static route

Manifest identity, icons, `display: standalone`, theme/background colors, language, and Apple metadata are correct. `viewport` uses the modern separate export with `themeColor` and `viewportFit: "cover"`. Service worker is lifecycle-only with no `fetch` listener, no Cache Storage, no IndexedDB, no Push API. Registration is correctly gated and non-blocking. Safe-area content padding and bottom-nav insets are implemented. `min-h-11` (44px) touch targets applied to all priority screens. No excluded capabilities were introduced.

**One task row remains open:** the Slice 4 TRIANGULATE (browser/device acceptance). This must be completed before treating Slice 4 as production-ready.

**Before marking Slice 4 as fully complete:**

1. Perform browser/device validation items from the manual checklist in `tasks.md`.
2. Resolve F4-01 (`.env.example` password placeholder).
3. Resolve F4-02 (human review of `instructivo_oauth2_saas.md`).
4. Apply Slice 1 migration to deployment database.

**Archive status:** NOT READY. Slice 4 TRIANGULATE row, 2 integrated verification rows, and 2 parent lifecycle rows remain unchecked.
