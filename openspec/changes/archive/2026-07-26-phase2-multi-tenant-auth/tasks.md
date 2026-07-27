# Implementation Tasks: Multi-Tenant Authentication and Salon Lifecycle

## Review Workload Forecast

| Field | Value |
| ------- | ------- |
| Estimated changed lines | 1,200–1,700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 helpers, tests, middleware, and auth; PR 2 provisioning, registration, and owner UI; PR 3 lifecycle/public guards and admin controls |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

> Keep the PR boundaries above autonomous: each must build and lint independently; rollback is a revert of that PR without deleting tenant, subscription, or audit data.

## Test foundation and shared helpers (PR 1)

- [x] Add Vitest Node-mode configuration, `npm test` script, and test-only dependencies in `package.json` and `vitest.config.ts`; verify the runner executes an initial passing smoke test. <!-- sdd-owner: implementation -->
- [x] **RED:** Add unit tests under `lib/auth/tenant-next.test.ts`, `lib/salons/lifecycle.test.ts`, and `lib/salons/trial.test.ts` for all status classes (including fail-closed `pending`), safe fallback/query preservation, redirect attack inputs, Panama/SQL-DATE boundaries, and same-day/expired zero-day trials. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Create `lib/actions/result.ts`, `lib/auth/tenant-next.ts`, `lib/salons/lifecycle.ts`, and `lib/salons/trial.ts`; implement the specified result/status/tenant-next/trial contracts, fresh public salon lookup, trusted trial config, and trial-subscription lookup until the helper tests pass. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Extend those tests with malformed encoding, encoded separators/dot segments, duplicate slash/backslash/control-character, cross-tenant/login-loop, DST-capable timezone, and missing/null trial-end-date cases; harden implementations without inventing dates or accepting unsafe paths. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Consolidate server-only imports, shared types, and safe error/logging boundaries in the new helper modules; run `npm test` and `npm run lint`. <!-- sdd-owner: implementation -->

## Middleware and authentication (PR 1)

- [x] **RED:** Add mocked tests for `middleware.ts` and `app/actions/auth.ts` covering exact public exemptions, tenant path/query preservation, `/my-salons` and admin redirects, generic owner/admin destinations, tenant ownership/lifecycle routing, missing DB user sign-out, and safe failed-login errors. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Update `middleware.ts` matcher and exact route classification for `/admin/:path*`, `/s/:path*`, and `/my-salons`; preserve refreshed cookies, redirect unauthenticated tenant routes to tenant login with encoded local `next`, and leave tenant login/inactive loop-free. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Update `app/actions/auth.ts`, `app/login/page.tsx`, add `app/login/login-form.tsx`, and update `app/admin/login/page.tsx` plus `app/s/[slug]/login/page.tsx` so credentials are server-validated, provider errors are non-sensitive, roles come from the DB, and tenant returns are sanitized and ownership/lifecycle checked. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Exercise generic, tenant, and admin login tests with forged `next`, cross-tenant ownership, inactive/pending salons, and client-supplied role/destination fields; verify no password or provider error reaches a URL or rendered error. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Keep redirect/not-found control flow outside broad action catches and remove the demo-salon routing path; run `npm test`, `npm run lint`, and `npm run build`. <!-- sdd-owner: implementation -->

## Owner provisioning and registration (PR 2)

- [x] **RED:** Add tests for `lib/salons/provision-owner.ts` and `app/actions/registration.ts` covering normalized duplicate email, reserved/colliding slug candidates, missing active trial plan/config, successful atomic User/Salon/Subscription creation with matching `planId` and deterministic dates, transaction rollback, compensation, and narrowly allowed pending-identity recovery. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Add `lib/supabase/admin.ts` as the server-only service-role client and `lib/salons/provision-owner.ts` to validate trusted configuration before external writes, generate unique reserved-safe slugs, create/recover only verified pending identities, sign in cookie-aware sessions, transact relational provisioning, and compensate failures without logging secrets. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Add `app/actions/registration.ts`, `app/registro-salon/page.tsx`, `app/registro-salon/registration-form.tsx`, and `.env.example` trial configuration documentation; use Zod/action state, reject or ignore privileged client fields, expose only safe field/form errors, and redirect successful sessions to `/s/{createdSlug}/dashboard`. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Mock Prisma P2002 and Supabase create/sign-in/delete failure permutations to prove no partial relational tenant survives, retries cannot attach an existing identity, and only one repeated submission can succeed. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Centralize correlation-ID-only failure logging and provisioning cleanup ownership; confirm `prisma/schema.prisma` remains unchanged, then run `npm test`, `npm run lint`, and `npm run build`. <!-- sdd-owner: implementation -->

## Owner lifecycle helpers, mutations, and management UI (PR 2)

- [x] **RED:** Add tests for `lib/auth/helpers.ts` and `app/actions/owner.ts` that permit only owned operational salons and prove cross-owner/cross-salon IDs, inactive status changes between render/write, and pending status cannot expose data or mutate records. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Update `lib/auth/helpers.ts` (and `lib/auth/session.ts` only if needed) so `requireSalonOwner(slug)` returns verified `{ user, dbUser, salon }`, reads ownership/status fresh, redirects recognized inactive salons, and fails closed on missing/pending states. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Refactor `app/actions/owner.ts`, `app/s/[slug]/(protected)/settings/settings-form.tsx`, `app/s/[slug]/(protected)/specialists/create-specialist-dialog.tsx`, and `app/s/[slug]/(protected)/specialists/page.tsx` to remove client `salonId` parameters, accept slug, and scope all writes/deletes to the verified `salon.id`. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Add `components/salons/trial-banner.tsx` and update `app/s/[slug]/(protected)/layout.tsx` to use the verified salon name, show a `/my-salons` switcher, and render non-negative trial days plus `https://wa.me/50767005805` only for a trial salon with a valid authoritative end date. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Test trial-at-zero, valid active, missing legacy trial subscription, and suspension-before-mutation behavior; verify trial expiry does not change status or access and active salons do not show a trial banner. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Ensure all owner writes obtain the guard before catches/writes and resource predicates include the verified salon ID; run `npm test`, `npm run lint`, and `npm run build`. <!-- sdd-owner: implementation -->

## Owner hub, inactive route, and public booking guards (PR 3)

- [x] **RED:** Add route/helper tests for `app/my-salons/page.tsx`, `app/s/[slug]/inactive/page.tsx`, `app/[slug]/page.tsx`, `app/book/[slug]/page.tsx`, and `app/book/[slug]/confirmacion/page.tsx` covering mixed ownership/statuses, empty state, public inactive output, unknown/pending not-found, operational inactive redirect, and no public mock content for inactive salons. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Add `app/my-salons/page.tsx` as a dynamic authenticated relation-derived hub: operational cards go to dashboards; suspended/cancelled cards show exact `Suspendido` and link inactive; pending is non-actionable `Pendiente`; and no-owned-salons renders an explicit empty state. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Add `app/s/[slug]/inactive/page.tsx` with a fresh lookup that renders only a public unavailable notice/name for suspended/cancelled salons, not-founds unknown/pending slugs, and redirects operational salons to `/{slug}`. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Call `requireOperationalPublicSalon(slug)` before rendering in `app/[slug]/page.tsx`, `app/book/[slug]/page.tsx`, and `app/book/[slug]/confirmacion/page.tsx`; document beside the current mock-only flow that any future booking write must re-read status inside its write transaction. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Validate fresh status enforcement by changing an operational fixture to suspended between requests and confirming owner/public/booking routes terminate at inactive without exposing services, availability, or private data. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Remove duplicated lifecycle branching in routes in favor of shared guards; run `npm test`, `npm run lint`, and `npm run build`. <!-- sdd-owner: implementation -->

## SuperAdmin lifecycle controls (PR 3)

- [x] **RED:** Add server-action/UI tests for non-admin denial, malformed UUID/invalid/cancelled/pending target rejection, unknown salon, idempotence, successful status persistence with AuditLog, and reactivation without business-data rewrites. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Add `updateSalonStatus(salonId, nextStatus)` to `app/actions/admin.ts`; authenticate/load the DB role server-side, Zod-validate ID/enum, atomically update only status plus actor/old/new AuditLog, return the shared `ActionResult`, and revalidate admin, hub, tenant, public, and booking paths. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Add `app/admin/(protected)/salons/status-control.tsx` and update `app/admin/(protected)/salons/page.tsx` with server-action-backed trial/active/suspended controls, disabled current status, pending/safe error states, and server-refresh behavior while retaining cancelled rows. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE:** Verify a persisted suspension affects the next owner/public/booking request and a subsequent active transition restores access while preserving subscriptions, appointments, and ownership. <!-- sdd-owner: implementation -->
- [x] **REFACTOR:** Confirm no client role/status claim is relied on and no lifecycle action modifies plan, subscription, or tenant business data; run `npm test`, `npm run lint`, and `npm run build`. <!-- sdd-owner: implementation -->

## Integration, rollout, and bounded review

- [x] Run the manual acceptance smoke test in staging with two owners, mixed-status salons, and one SuperAdmin: registration/session/compensation, banner/WhatsApp, generic and tenant login return safety, hub isolation, suspension/reactivation, public inactive output, and unchanged operational flows; record non-sensitive results in the PR. <!-- sdd-owner: implementation -->
- [x] Verify `TRIAL_PLAN_NAME` names an active production-equivalent plan and `TRIAL_DURATION_DAYS` is positive before exposing registration; retain a rollback plan that reverts feature PRs/hides controls without deleting records. <!-- sdd-owner: implementation -->

## Parent-owned lifecycle actions

- [ ] Start or reuse bounded review. <!-- sdd-owner: parent -->
- [ ] Confirm the PR-chain decision and choose `stacked-to-main`, `feature-branch-chain`, or documented `size-exception` before apply. <!-- sdd-owner: parent -->
