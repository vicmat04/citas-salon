# Apply Progress: phase2-multi-tenant-auth

## Apply slice

- Work unit: **PR 1 of 3 — Helpers, Test Foundation, Middleware, and Login Authentication**
- Delivery path consumed: the orchestrator explicitly assigned PR 1 of the forecast three-PR chain. No PR 2, PR 3, staging, or parent-owned lifecycle work was performed.
- Strict TDD: disabled by `openspec/config.yaml`. The task-authored RED/GREEN/TRIANGULATE sequence was still exercised.

## Structured status consumed/produced

```yaml
schemaName: spec-driven
changeName: phase2-multi-tenant-auth
artifactStore: both
planningHome:
  root: C:/Users/vdominguez/citas-salon
  changesDir: openspec/changes
changeRoot: openspec/changes/phase2-multi-tenant-auth
artifactPaths:
  proposal: [openspec/changes/phase2-multi-tenant-auth/proposal.md]
  specs: [openspec/changes/phase2-multi-tenant-auth/spec.md, sdd/phase2-multi-tenant-auth/spec]
  design: [openspec/changes/phase2-multi-tenant-auth/design.md, sdd/phase2-multi-tenant-auth/design]
  tasks: [openspec/changes/phase2-multi-tenant-auth/tasks.md, sdd/phase2-multi-tenant-auth/tasks]
  applyProgress: [openspec/changes/phase2-multi-tenant-auth/apply-progress.md, sdd/phase2-multi-tenant-auth/apply-progress]
artifacts:
  proposal: done
  specs: done
  design: done
  tasks: partial
  applyProgress: partial
taskProgress:
  total: 34
  complete: 10
  remaining: 24
deferredParentActions:
  total: 2
  complete: 0
  remaining: 2
taskArtifactErrors: []
applyState: ready
dependencies:
  apply: ready
  verify: blocked
  sync: blocked
  archive: blocked
actionContext:
  mode: repo-local
  workspaceRoot: C:/Users/vdominguez/citas-salon
  allowedEditRoots: [C:/Users/vdominguez/citas-salon]
  warnings:
    - Parent did not inject actionContext; executor produced conservative repo-local context from the authoritative working directory.
    - The repository contained pre-existing user changes in .gitignore, README.md, lib/auth/helpers.ts, .mcp.json, and .pi/; they were not modified by this apply slice.
nextRecommended: parent-lifecycle
isNonAuthoritative: false
```

The OpenSpec directory makes the `both` status authoritative. Required tasks, spec, and design artifacts were confirmed in both OpenSpec and Engram before implementation. No malformed ownership markers were found.

## Completed tasks and persisted checkbox evidence

All ten implementation-owned PR 1 rows are visibly marked `- [x]` in `openspec/changes/phase2-multi-tenant-auth/tasks.md`:

- [x] Vitest Node-mode configuration, `npm test`, dependencies, and smoke test.
- [x] Helper RED tests.
- [x] Shared result, tenant-next, lifecycle, and trial helper GREEN implementation.
- [x] Helper TRIANGULATE attack/date/missing-data cases.
- [x] Helper REFACTOR/server-only boundaries and verification commands.
- [x] Middleware/auth RED mocked tests.
- [x] Tenant-aware middleware GREEN implementation.
- [x] Server-validated, role/tenant-aware login action and pages GREEN implementation.
- [x] Auth TRIANGULATE forged/cross-tenant/lifecycle/error-safety cases.
- [x] Auth REFACTOR, demo route removal, and verification commands.

## Implementation summary

- Added Vitest 4 in Node mode with TypeScript path aliases and a test-only replacement for the Next.js `server-only` marker.
- Added the shared `ActionResult` contract.
- Added a fail-closed tenant return sanitizer that preserves valid same-tenant queries while rejecting external, protocol-relative, cross-tenant, login-loop, malformed, encoded traversal/separator, duplicate-slash, backslash, and control-character inputs.
- Added lifecycle predicates and a fresh Prisma-backed public operational-salon guard.
- Added trusted trial configuration, SQL-DATE/calendar-day helpers, timezone-aware remaining-day calculation, and authoritative trial-subscription lookup.
- Updated middleware to use exact public exemptions, tenant login redirects with path/query preservation, owner-hub/admin destinations, and refreshed-cookie propagation.
- Reworked login authentication to validate server-side, use fixed safe provider errors, load roles/ownership from Prisma, sign out missing/unsupported identities, sanitize tenant returns, and route lifecycle states safely.
- Replaced the hard-coded demo portal with reusable action-state login UI for generic, admin, and tenant login pages.

## Files changed by this slice

- `package.json`
- `package-lock.json`
- `vitest.config.ts`
- `test/server-only.ts`
- `test/smoke.test.ts`
- `lib/actions/result.ts`
- `lib/auth/tenant-next.ts`
- `lib/auth/tenant-next.test.ts`
- `lib/salons/lifecycle.ts`
- `lib/salons/lifecycle.test.ts`
- `lib/salons/trial.ts`
- `lib/salons/trial.test.ts`
- `middleware.ts`
- `middleware.test.ts`
- `app/actions/auth.ts`
- `app/actions/auth.test.ts`
- `app/login/login-form.tsx`
- `app/login/page.tsx`
- `app/admin/login/page.tsx`
- `app/s/[slug]/login/page.tsx`
- `openspec/changes/phase2-multi-tenant-auth/tasks.md`
- `openspec/changes/phase2-multi-tenant-auth/apply-progress.md`
- `openspec/changes/phase2-multi-tenant-auth/apply.md`

## Verification evidence

| Command | Result |
| --- | --- |
| `npm test` (RED) | Expected failure: missing helper modules plus 20 middleware/auth failures against the old implementation. |
| `npm test` (GREEN) | PASS — 6 test files, 79 tests. |
| `npx tsc --noEmit` | PASS. |
| Focused `npx eslint` over every PR 1 source/test/config file | PASS. |
| `npm run build` | PASS — production compilation, TypeScript, and static generation completed. |
| `npm run lint` | Repository-wide FAIL — 7 errors and 11 warnings in pre-existing out-of-slice files (`app/actions/owner.ts`, admin/protected layout, salon settings form, and `prisma/seed.ts`, plus warnings). No PR 1 file was reported; focused lint passed. |

`npm install` reported 9 existing audit findings (4 moderate, 5 high); no automated audit fix was run.

## Deviations and warnings

- No behavioral design deviation.
- Next.js 16 warns that `middleware.ts` is deprecated in favor of `proxy.ts`. This slice retained `middleware.ts` because the approved tasks and file map explicitly require that file; production build remains green.
- Full-repository lint is not green because of pre-existing errors outside the assigned PR boundary. PR 1 files pass focused lint.

## Remaining implementation tasks (exact unchecked rows)

- [ ] **RED:** Add tests for `lib/salons/provision-owner.ts` and `app/actions/registration.ts` covering normalized duplicate email, reserved/colliding slug candidates, missing active trial plan/config, successful atomic User/Salon/Subscription creation with matching `planId` and deterministic dates, transaction rollback, compensation, and narrowly allowed pending-identity recovery. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Add `lib/supabase/admin.ts` as the server-only service-role client and `lib/salons/provision-owner.ts` to validate trusted configuration before external writes, generate unique reserved-safe slugs, create/recover only verified pending identities, sign in cookie-aware sessions, transact relational provisioning, and compensate failures without logging secrets. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Add `app/actions/registration.ts`, `app/registro-salon/page.tsx`, `app/registro-salon/registration-form.tsx`, and `.env.example` trial configuration documentation; use Zod/action state, reject or ignore privileged client fields, expose only safe field/form errors, and redirect successful sessions to `/s/{createdSlug}/dashboard`. <!-- sdd-owner: implementation -->
- [ ] **TRIANGULATE:** Mock Prisma P2002 and Supabase create/sign-in/delete failure permutations to prove no partial relational tenant survives, retries cannot attach an existing identity, and only one repeated submission can succeed. <!-- sdd-owner: implementation -->
- [ ] **REFACTOR:** Centralize correlation-ID-only failure logging and provisioning cleanup ownership; confirm `prisma/schema.prisma` remains unchanged, then run `npm test`, `npm run lint`, and `npm run build`. <!-- sdd-owner: implementation -->
- [ ] **RED:** Add tests for `lib/auth/helpers.ts` and `app/actions/owner.ts` that permit only owned operational salons and prove cross-owner/cross-salon IDs, inactive status changes between render/write, and pending status cannot expose data or mutate records. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Update `lib/auth/helpers.ts` (and `lib/auth/session.ts` only if needed) so `requireSalonOwner(slug)` returns verified `{ user, dbUser, salon }`, reads ownership/status fresh, redirects recognized inactive salons, and fails closed on missing/pending states. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Refactor `app/actions/owner.ts`, `app/s/[slug]/(protected)/settings/settings-form.tsx`, `app/s/[slug]/(protected)/specialists/create-specialist-dialog.tsx`, and `app/s/[slug]/(protected)/specialists/page.tsx` to remove client `salonId` parameters, accept slug, and scope all writes/deletes to the verified `salon.id`. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Add `components/salons/trial-banner.tsx` and update `app/s/[slug]/(protected)/layout.tsx` to use the verified salon name, show a `/my-salons` switcher, and render non-negative trial days plus `https://wa.me/50767005805` only for a trial salon with a valid authoritative end date. <!-- sdd-owner: implementation -->
- [ ] **TRIANGULATE:** Test trial-at-zero, valid active, missing legacy trial subscription, and suspension-before-mutation behavior; verify trial expiry does not change status or access and active salons do not show a trial banner. <!-- sdd-owner: implementation -->
- [ ] **REFACTOR:** Ensure all owner writes obtain the guard before catches/writes and resource predicates include the verified salon ID; run `npm test`, `npm run lint`, and `npm run build`. <!-- sdd-owner: implementation -->
- [ ] **RED:** Add route/helper tests for `app/my-salons/page.tsx`, `app/s/[slug]/inactive/page.tsx`, `app/[slug]/page.tsx`, `app/book/[slug]/page.tsx`, and `app/book/[slug]/confirmacion/page.tsx` covering mixed ownership/statuses, empty state, public inactive output, unknown/pending not-found, operational inactive redirect, and no public mock content for inactive salons. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Add `app/my-salons/page.tsx` as a dynamic authenticated relation-derived hub: operational cards go to dashboards; suspended/cancelled cards show exact `Suspendido` and link inactive; pending is non-actionable `Pendiente`; and no-owned-salons renders an explicit empty state. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Add `app/s/[slug]/inactive/page.tsx` with a fresh lookup that renders only a public unavailable notice/name for suspended/cancelled salons, not-founds unknown/pending slugs, and redirects operational salons to `/{slug}`. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Call `requireOperationalPublicSalon(slug)` before rendering in `app/[slug]/page.tsx`, `app/book/[slug]/page.tsx`, and `app/book/[slug]/confirmacion/page.tsx`; document beside the current mock-only flow that any future booking write must re-read status inside its write transaction. <!-- sdd-owner: implementation -->
- [ ] **TRIANGULATE:** Validate fresh status enforcement by changing an operational fixture to suspended between requests and confirming owner/public/booking routes terminate at inactive without exposing services, availability, or private data. <!-- sdd-owner: implementation -->
- [ ] **REFACTOR:** Remove duplicated lifecycle branching in routes in favor of shared guards; run `npm test`, `npm run lint`, and `npm run build`. <!-- sdd-owner: implementation -->
- [ ] **RED:** Add server-action/UI tests for non-admin denial, malformed UUID/invalid/cancelled/pending target rejection, unknown salon, idempotence, successful status persistence with AuditLog, and reactivation without business-data rewrites. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Add `updateSalonStatus(salonId, nextStatus)` to `app/actions/admin.ts`; authenticate/load the DB role server-side, Zod-validate ID/enum, atomically update only status plus actor/old/new AuditLog, return the shared `ActionResult`, and revalidate admin, hub, tenant, public, and booking paths. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Add `app/admin/(protected)/salons/status-control.tsx` and update `app/admin/(protected)/salons/page.tsx` with server-action-backed trial/active/suspended controls, disabled current status, pending/safe error states, and server-refresh behavior while retaining cancelled rows. <!-- sdd-owner: implementation -->
- [ ] **TRIANGULATE:** Verify a persisted suspension affects the next owner/public/booking request and a subsequent active transition restores access while preserving subscriptions, appointments, and ownership. <!-- sdd-owner: implementation -->
- [ ] **REFACTOR:** Confirm no client role/status claim is relied on and no lifecycle action modifies plan, subscription, or tenant business data; run `npm test`, `npm run lint`, and `npm run build`. <!-- sdd-owner: implementation -->
- [ ] Run the manual acceptance smoke test in staging with two owners, mixed-status salons, and one SuperAdmin: registration/session/compensation, banner/WhatsApp, generic and tenant login return safety, hub isolation, suspension/reactivation, public inactive output, and unchanged operational flows; record non-sensitive results in the PR. <!-- sdd-owner: implementation -->
- [ ] Verify `TRIAL_PLAN_NAME` names an active production-equivalent plan and `TRIAL_DURATION_DAYS` is positive before exposing registration; retain a rollback plan that reverts feature PRs/hides controls without deleting records. <!-- sdd-owner: implementation -->

## Deferred parent-owned lifecycle actions (preserved unchanged)

- [ ] Start or reuse bounded review. <!-- sdd-owner: parent -->
- [ ] Confirm the PR-chain decision and choose `stacked-to-main`, `feature-branch-chain`, or documented `size-exception` before apply. <!-- sdd-owner: parent -->

---

## Current cumulative status after PR 3

PR 3 is complete with all eleven assigned rows persisted `- [x]` in OpenSpec and Engram. Current overall implementation progress is **31/34**; the only unchecked implementation rows are `.env.example` trial documentation, staging acceptance, and production-equivalent trial configuration verification. Current verification is 144 passing tests, passing TypeScript, passing focused PR 3 lint, passing production build, and repository-wide lint blocked only by three pre-existing out-of-slice errors. The authoritative current structured status and full PR 3 evidence are recorded in the PR 3 addendum above and at Engram topic `sdd/phase2-multi-tenant-auth/apply-progress`. Next recommended action is `parent-lifecycle`.

---

# PR 3 cumulative addendum — Owner Hub, Public Lifecycle Guards, and Admin Status Controls

## Apply slice and workload boundary

- Work unit: **PR 3 of 3 — Owner Hub /my-salons, Inactive Route, Public Booking Guards, and SuperAdmin Status Controls**.
- Delivery path consumed: the orchestrator explicitly assigned the bounded PR 3 slice and its six implementation outcomes. This resolved the High/Yes/Yes workload gate for this work unit; chain topology remains parent-owned.
- Strict TDD remained disabled by `openspec/config.yaml`. Task-authored route/action/UI RED tests were written first and observed failing because the assigned pages, component, and action did not exist.
- No staging acceptance, production configuration verification, review actor, receipt, commit, or parent lifecycle action was performed.

## Structured status consumed/produced

```yaml
schemaName: spec-driven
changeName: phase2-multi-tenant-auth
artifactStore: both
planningHome:
  root: C:/Users/vdominguez/citas-salon
  changesDir: openspec/changes
changeRoot: openspec/changes/phase2-multi-tenant-auth
artifactPaths:
  proposal: [openspec/changes/phase2-multi-tenant-auth/proposal.md]
  specs: [openspec/changes/phase2-multi-tenant-auth/spec.md, sdd/phase2-multi-tenant-auth/spec]
  design: [openspec/changes/phase2-multi-tenant-auth/design.md, sdd/phase2-multi-tenant-auth/design]
  tasks: [openspec/changes/phase2-multi-tenant-auth/tasks.md, sdd/phase2-multi-tenant-auth/tasks]
  applyProgress: [openspec/changes/phase2-multi-tenant-auth/apply-progress.md, sdd/phase2-multi-tenant-auth/apply-progress]
artifacts:
  proposal: done
  specs: done
  design: done
  tasks: partial
  applyProgress: partial
taskProgress:
  total: 34
  complete: 31
  remaining: 3
deferredParentActions:
  total: 2
  complete: 0
  remaining: 2
taskArtifactErrors: []
applyState: ready
dependencies:
  apply: ready
  verify: blocked
  sync: blocked
  archive: blocked
actionContext:
  mode: repo-local
  workspaceRoot: C:/Users/vdominguez/citas-salon
  allowedEditRoots: [C:/Users/vdominguez/citas-salon]
  warnings:
    - Parent supplied project and bounded work-unit context but omitted a full structured actionContext; executor produced conservative repo-local scope from the authoritative working directory.
    - The working tree already contained PR 1/PR 2 and user changes; they were preserved and no commit was created.
    - Repository-wide lint remains red only on three pre-existing out-of-slice errors; all PR 3 files pass focused lint.
nextRecommended: parent-lifecycle
isNonAuthoritative: false
```

OpenSpec is authoritative for this `both` store because `openspec/` exists. Required proposal, spec, design, tasks, configuration, existing code/tests, and previous apply progress were read from disk; tasks/spec/design/previous progress were also fetched from Engram. No malformed ownership markers were found. Skill paths were not injected and no fallback apply skill was available (`skill_resolution: none`).

## PR 3 completed tasks and persisted checkbox evidence

All eleven PR 3 implementation rows are visibly marked `- [x]` in both OpenSpec and Engram tasks:

- [x] Route/helper RED tests for the owner hub, inactive page, and all current public/booking pages.
- [x] Dynamic relation-derived `/my-salons` hub with operational dashboard links, exact `Suspendido`, non-actionable `Pendiente`, and empty state.
- [x] Fresh public inactive-page lookup with inactive notice, operational redirect, and missing/pending not-found behavior.
- [x] Shared public operational guard on landing, booking, and confirmation routes plus the required future-write transaction note.
- [x] Fresh-status triangulation proving a later suspended request terminates before mock public/booking output.
- [x] Shared-guard route refactor and required verification commands.
- [x] SuperAdmin action/UI RED tests for authorization, validation, target restrictions, not-found, idempotence, auditing, and reactivation.
- [x] `updateSalonStatus` with DB-role authorization, Zod UUID/enum validation, atomic status/audit persistence, safe results, and affected-route revalidation.
- [x] Admin server-action controls for trial/active/suspended with current-state disabling, pending/error state, refresh, and retained cancelled rows.
- [x] Suspension/reactivation triangulation with status-only writes and no plan/subscription/appointment/ownership rewrites.
- [x] Admin lifecycle refactor verification proving no client role claim or unrelated business-data mutation is used.

## PR 3 implementation summary

- Added `/my-salons` as a force-dynamic authenticated owner page sourced only from `dbUser.ownedSalons`; platform admins route to their own area.
- Added `/s/[slug]/inactive` with a safe-field-only fresh lookup, public unavailable/contact explanation, exact `https://wa.me/50767005805`, and no booking controls or private data.
- Guarded all current public landing/booking pages before mock content and displayed the authoritative salon name returned by the shared guard.
- Added a SuperAdmin-only lifecycle action that permits only `trial`, `active`, and `suspended`, performs current lookup/update/AuditLog in one Prisma transaction, returns success idempotently, and revalidates admin/hub/public/booking/tenant paths.
- Added admin status controls with approved Spanish labels, current-status disabling, pending state, safe errors, and server refresh.
- Added 29 focused PR 3 tests covering routes, guard termination, owner-hub statuses, inactive output, admin authorization/validation/audit/idempotence, non-destructive reactivation, and UI options.

## PR 3 files changed

- `app/my-salons/page.tsx`
- `app/s/[slug]/inactive/page.tsx`
- `app/[slug]/page.tsx`
- `app/book/[slug]/page.tsx`
- `app/book/[slug]/confirmacion/page.tsx`
- `app/routes-lifecycle.test.tsx`
- `app/actions/admin.ts`
- `app/actions/admin.test.ts`
- `app/admin/(protected)/salons/page.tsx`
- `app/admin/(protected)/salons/status-control.tsx`
- `app/admin/(protected)/salons/status-control.test.tsx`
- `openspec/changes/phase2-multi-tenant-auth/tasks.md`
- `openspec/changes/phase2-multi-tenant-auth/apply-progress.md`
- `openspec/changes/phase2-multi-tenant-auth/apply.md`

## PR 3 verification evidence

| Command | Result |
| --- | --- |
| Focused PR 3 RED run | Expected RED: two missing route/component modules and eleven failures because `updateSalonStatus` did not exist. |
| Focused PR 3 GREEN run | PASS — 3 files, 29 tests. |
| `npm test` | PASS — 14 files, 144 tests. |
| `npx tsc --noEmit` | PASS. |
| Focused ESLint over all PR 3 source/test files | PASS. |
| `npm run build` | PASS — production compilation/type/static generation completed; `/my-salons` and `/s/[slug]/inactive` are dynamic routes. |
| `npm run lint` | Repository-wide FAIL — 3 errors and 4 warnings only in pre-existing out-of-slice files: admin protected layout (`react-hooks/static-components`) and `prisma/seed.ts` (`no-explicit-any`), plus existing warnings. No PR 3 file was reported. |

## Deviations and risks

- No schema or completed-code behavioral deviation from the approved PR 3 design. The inactive page also includes the user-requested WhatsApp administration contact action at the approved `50767005805` target.
- No booking mutation exists; this slice guards all current GET pages and leaves the required same-transaction status-recheck note beside mock-only flows.
- Full lint remains blocked by pre-existing out-of-slice errors, while tests, typecheck, focused lint, and build are green.
- Staging lifecycle acceptance and production trial configuration cannot be completed from this local apply slice.

## Remaining implementation tasks (exact unchecked rows)

- [ ] **GREEN:** Add `app/actions/registration.ts`, `app/registro-salon/page.tsx`, `app/registro-salon/registration-form.tsx`, and `.env.example` trial configuration documentation; use Zod/action state, reject or ignore privileged client fields, expose only safe field/form errors, and redirect successful sessions to `/s/{createdSlug}/dashboard`. <!-- sdd-owner: implementation -->
- [ ] Run the manual acceptance smoke test in staging with two owners, mixed-status salons, and one SuperAdmin: registration/session/compensation, banner/WhatsApp, generic and tenant login return safety, hub isolation, suspension/reactivation, public inactive output, and unchanged operational flows; record non-sensitive results in the PR. <!-- sdd-owner: implementation -->
- [ ] Verify `TRIAL_PLAN_NAME` names an active production-equivalent plan and `TRIAL_DURATION_DAYS` is positive before exposing registration; retain a rollback plan that reverts feature PRs/hides controls without deleting records. <!-- sdd-owner: implementation -->

## Deferred parent-owned lifecycle actions (preserved byte-for-byte in tasks)

- [ ] Start or reuse bounded review. <!-- sdd-owner: parent -->
- [ ] Confirm the PR-chain decision and choose `stacked-to-main`, `feature-branch-chain`, or documented `size-exception` before apply. <!-- sdd-owner: parent -->

## Workload / PR boundary

The forecast gate remains High/Yes/Yes. Apply proceeded only because the parent supplied a bounded work unit (`PR 1 of 3`) and an explicit PR 1 task list. This apply stops at that boundary. Selection of `stacked-to-main` versus `feature-branch-chain` remains a parent-owned lifecycle decision; PR 2 and PR 3 are not started here.

---

# PR 2 cumulative addendum — Owner Provisioning, Registration, Owner Guards, and Trial Banner

## Apply slice and workload boundary

- Work unit: **PR 2 of 3 — Owner Provisioning, Registration, Helpers Refactor, and Trial Banner**.
- Delivery path consumed: the orchestrator explicitly assigned the bounded PR 2 slice of the forecast three-PR chain. PR 3, staging acceptance, production configuration verification, and parent-owned lifecycle actions were not performed.
- Strict TDD remains disabled by `openspec/config.yaml`; task-authored RED tests were added and observed failing before production changes.
- The PR 2 slice is partially blocked only on `.env.example`: the safety layer refused access to that sensitive-path pattern and requested an explicit safer edit plan. No tool protection was bypassed. The registration action and pages are implemented, but their combined task row remains unchecked until the documentation edit is completed.

## Structured status consumed/produced

```yaml
schemaName: spec-driven
changeName: phase2-multi-tenant-auth
artifactStore: both
planningHome:
  root: C:/Users/vdominguez/citas-salon
  changesDir: openspec/changes
changeRoot: openspec/changes/phase2-multi-tenant-auth
artifactPaths:
  proposal: [openspec/changes/phase2-multi-tenant-auth/proposal.md]
  specs: [openspec/changes/phase2-multi-tenant-auth/spec.md, sdd/phase2-multi-tenant-auth/spec]
  design: [openspec/changes/phase2-multi-tenant-auth/design.md, sdd/phase2-multi-tenant-auth/design]
  tasks: [openspec/changes/phase2-multi-tenant-auth/tasks.md, sdd/phase2-multi-tenant-auth/tasks]
  applyProgress: [openspec/changes/phase2-multi-tenant-auth/apply-progress.md, sdd/phase2-multi-tenant-auth/apply-progress]
artifacts:
  proposal: done
  specs: done
  design: done
  tasks: partial
  applyProgress: partial
taskProgress:
  total: 34
  complete: 20
  remaining: 14
deferredParentActions:
  total: 2
  complete: 0
  remaining: 2
taskArtifactErrors: []
applyState: ready
dependencies:
  apply: ready
  verify: blocked
  sync: blocked
  archive: blocked
actionContext:
  mode: repo-local
  workspaceRoot: C:/Users/vdominguez/citas-salon
  allowedEditRoots: [C:/Users/vdominguez/citas-salon]
  warnings:
    - Parent supplied project/work-unit context but not a full actionContext; executor produced conservative repo-local edit scope.
    - `.env.example` access was denied by the safety layer; the requested trial placeholders were not written.
    - Pre-existing PR 1 and user changes were preserved; this slice did not commit.
nextRecommended: resolve-safe-env-example-edit
isNonAuthoritative: false
```

The OpenSpec directory makes status authoritative for the `both` store. Required proposal, spec, design, tasks, and previous apply-progress were read from disk; tasks/spec/design/apply-progress were also fetched from Engram. No malformed ownership markers were found.

## PR 2 completed tasks and persisted checkbox evidence

The following ten PR 2 implementation rows are visibly marked `- [x]` in `tasks.md`:

- [x] Provisioning and registration RED tests.
- [x] Server-only Supabase admin client and recoverable/compensating provisioning saga.
- [x] P2002 and Supabase create/sign-in/delete failure triangulation.
- [x] Provisioning correlation-ID-only logging/cleanup refactor, unchanged schema, and verification commands.
- [x] Owner helper/action RED tests.
- [x] Lifecycle-aware `requireSalonOwner(slug)`.
- [x] Slug-only owner mutation callers and verified-salon resource scoping.
- [x] Trial banner, authoritative trial-date layout integration, verified salon name, and `/my-salons` switcher.
- [x] Zero-day/active/missing-trial/suspension-before-write triangulation.
- [x] Owner write guard/resource predicate refactor and verification commands.

The registration UI task remains unchecked solely because `.env.example` was not safely editable. Its action, page, form, validation, safe errors, privileged-field rejection, and successful dashboard redirect are implemented and tested.

## PR 2 implementation summary

- Added a centralized server-only Supabase service-role client and reused it from the existing admin action.
- Added normalized-email owner provisioning with trusted active-plan validation before identity creation, reserved/collision-safe slugs, cookie-aware sign-in, atomic Prisma User/Salon/Subscription creation, deterministic SQL DATE trial dates, P2002 slug retries, narrow password-proven pending-identity recovery, and compensating sign-out/delete cleanup.
- Added safe Zod registration action state and `/registro-salon` UI. Client role/status/slug/plan/trial fields are ignored because only the six public contract fields are extracted.
- Updated owner authorization to return only an owned operational salon, redirect recognized inactive states, and fail closed on missing/pending salons.
- Removed trusted client `salonId` arguments from owner mutations and callers. Settings writes use the verified salon; specialist deletes use an `{ id, salonId }` predicate.
- Added a management-wide trial banner with non-negative calendar days and exact `https://wa.me/50767005805`; active or malformed legacy trial records do not render invented trial data.
- Updated protected settings/specialist pages to guard before private reads and updated the layout to show the verified salon name and salon switcher.

## PR 2 files changed

- `lib/supabase/admin.ts`
- `lib/salons/provision-owner.ts`
- `lib/salons/provision-owner.test.ts`
- `lib/salons/trial.ts`
- `lib/salons/trial.test.ts`
- `app/actions/admin.ts`
- `app/actions/registration.ts`
- `app/actions/registration.test.ts`
- `app/actions/owner.ts`
- `app/actions/owner.test.ts`
- `app/registro-salon/page.tsx`
- `app/registro-salon/registration-form.tsx`
- `lib/auth/helpers.ts`
- `lib/auth/helpers.test.ts`
- `components/salons/trial-banner.tsx`
- `components/salons/trial-banner.test.tsx`
- `app/s/[slug]/(protected)/layout.tsx`
- `app/s/[slug]/(protected)/settings/page.tsx`
- `app/s/[slug]/(protected)/settings/settings-form.tsx`
- `app/s/[slug]/(protected)/specialists/page.tsx`
- `app/s/[slug]/(protected)/specialists/create-specialist-dialog.tsx`
- `openspec/changes/phase2-multi-tenant-auth/tasks.md`
- `openspec/changes/phase2-multi-tenant-auth/apply-progress.md`
- `openspec/changes/phase2-multi-tenant-auth/apply.md`

Not changed: `.env.example` (safety-layer block) and `prisma/schema.prisma` (HEAD/worktree object hash both `af695e3b5681dd4094fd4f8b90ccb9314ad85cab`).

## PR 2 verification evidence

| Command | Result |
| --- | --- |
| Focused PR 2 tests before implementation | RED as expected: missing registration/provision modules plus owner authorization/signature/scoping failures. |
| `npm test` | PASS — 11 files, 115 tests. |
| `npx tsc --noEmit` | PASS. |
| Focused ESLint over all PR 2 source/test files | PASS. |
| `npm run build` | PASS — `/registro-salon` generated and all production compilation/type/static generation completed. |
| `npm run lint` | Repository-wide FAIL — 3 errors and 4 warnings only in pre-existing out-of-slice files: admin protected layout (`react-hooks/static-components`) and `prisma/seed.ts` (`no-explicit-any`), plus existing warnings. PR 2 focused lint passes. |
| Schema hash comparison | PASS — `prisma/schema.prisma` unchanged from HEAD. |

## Deviations and risks

- Delivery deviation: `.env.example` trial documentation could not be written because the safety layer blocks that path and instructed the executor to request a safer plan. Suggested non-secret documentation is `TRIAL_PLAN_NAME=Free Trial` and `TRIAL_DURATION_DAYS=14`, with a note that the name must resolve to an active DB plan and both values are server-only.
- No schema or behavioral design deviation in completed code.
- Repository-wide lint is not green due only to pre-existing out-of-slice issues; focused PR 2 lint, typecheck, tests, and build are green.
- Next.js still emits the known middleware-to-proxy deprecation warning inherited from PR 1.
- The chain topology (`stacked-to-main` versus `feature-branch-chain`) remains parent-owned; the bounded PR 2 assignment was sufficient to execute only this slice.

## Remaining implementation tasks (exact unchecked rows)

- [ ] **GREEN:** Add `app/actions/registration.ts`, `app/registro-salon/page.tsx`, `app/registro-salon/registration-form.tsx`, and `.env.example` trial configuration documentation; use Zod/action state, reject or ignore privileged client fields, expose only safe field/form errors, and redirect successful sessions to `/s/{createdSlug}/dashboard`. <!-- sdd-owner: implementation -->
- [ ] **RED:** Add route/helper tests for `app/my-salons/page.tsx`, `app/s/[slug]/inactive/page.tsx`, `app/[slug]/page.tsx`, `app/book/[slug]/page.tsx`, and `app/book/[slug]/confirmacion/page.tsx` covering mixed ownership/statuses, empty state, public inactive output, unknown/pending not-found, operational inactive redirect, and no public mock content for inactive salons. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Add `app/my-salons/page.tsx` as a dynamic authenticated relation-derived hub: operational cards go to dashboards; suspended/cancelled cards show exact `Suspendido` and link inactive; pending is non-actionable `Pendiente`; and no-owned-salons renders an explicit empty state. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Add `app/s/[slug]/inactive/page.tsx` with a fresh lookup that renders only a public unavailable notice/name for suspended/cancelled salons, not-founds unknown/pending slugs, and redirects operational salons to `/{slug}`. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Call `requireOperationalPublicSalon(slug)` before rendering in `app/[slug]/page.tsx`, `app/book/[slug]/page.tsx`, and `app/book/[slug]/confirmacion/page.tsx`; document beside the current mock-only flow that any future booking write must re-read status inside its write transaction. <!-- sdd-owner: implementation -->
- [ ] **TRIANGULATE:** Validate fresh status enforcement by changing an operational fixture to suspended between requests and confirming owner/public/booking routes terminate at inactive without exposing services, availability, or private data. <!-- sdd-owner: implementation -->
- [ ] **REFACTOR:** Remove duplicated lifecycle branching in routes in favor of shared guards; run `npm test`, `npm run lint`, and `npm run build`. <!-- sdd-owner: implementation -->
- [ ] **RED:** Add server-action/UI tests for non-admin denial, malformed UUID/invalid/cancelled/pending target rejection, unknown salon, idempotence, successful status persistence with AuditLog, and reactivation without business-data rewrites. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Add `updateSalonStatus(salonId, nextStatus)` to `app/actions/admin.ts`; authenticate/load the DB role server-side, Zod-validate ID/enum, atomically update only status plus actor/old/new AuditLog, return the shared `ActionResult`, and revalidate admin, hub, tenant, public, and booking paths. <!-- sdd-owner: implementation -->
- [ ] **GREEN:** Add `app/admin/(protected)/salons/status-control.tsx` and update `app/admin/(protected)/salons/page.tsx` with server-action-backed trial/active/suspended controls, disabled current status, pending/safe error states, and server-refresh behavior while retaining cancelled rows. <!-- sdd-owner: implementation -->
- [ ] **TRIANGULATE:** Verify a persisted suspension affects the next owner/public/booking request and a subsequent active transition restores access while preserving subscriptions, appointments, and ownership. <!-- sdd-owner: implementation -->
- [ ] **REFACTOR:** Confirm no client role/status claim is relied on and no lifecycle action modifies plan, subscription, or tenant business data; run `npm test`, `npm run lint`, and `npm run build`. <!-- sdd-owner: implementation -->
- [ ] Run the manual acceptance smoke test in staging with two owners, mixed-status salons, and one SuperAdmin: registration/session/compensation, banner/WhatsApp, generic and tenant login return safety, hub isolation, suspension/reactivation, public inactive output, and unchanged operational flows; record non-sensitive results in the PR. <!-- sdd-owner: implementation -->
- [ ] Verify `TRIAL_PLAN_NAME` names an active production-equivalent plan and `TRIAL_DURATION_DAYS` is positive before exposing registration; retain a rollback plan that reverts feature PRs/hides controls without deleting records. <!-- sdd-owner: implementation -->

## Deferred parent-owned lifecycle actions (preserved unchanged)

- [ ] Start or reuse bounded review. <!-- sdd-owner: parent -->
- [ ] Confirm the PR-chain decision and choose `stacked-to-main`, `feature-branch-chain`, or documented `size-exception` before apply. <!-- sdd-owner: parent -->
