# Implementation Tasks: Service Catalog, Specialist Assignment, and Schedules (Phase 3)

## Review Workload Forecast

| Field | Value |
| --- | --- |
| Estimated changed lines | 900–1,300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Server actions & tests for Services/Categories. PR 2: Schedules/Blockings logic & actions. PR 3: Admin UI pages & dialogs. |

---

## Tasks

### PR 1: Service & Category Actions & Logic

- [ ] Implement `app/actions/services.ts` with `createCategory`, `updateCategory`, `deleteCategory` (guarded against deletion when services exist), `createService` (default 10-min buffer), `updateService`, `deleteService`, and `toggleServiceActive`.
- [ ] Add `app/actions/services.test.ts` to test category protection, service CRUD, price/duration validations, and tenant isolation.

### PR 2: Schedules, Blocked Slots & Specialist Service Mapping

- [ ] Implement `lib/salons/schedules.ts` with `resolveEffectiveSpecialistSchedule` and `isSlotBlocked`.
- [ ] Implement `app/actions/schedules.ts` with `updateBusinessHours`, `updateSpecialistHours`, `addBlockedDate`, `deleteBlockedDate`, `addBlockedSlot`, and `deleteBlockedSlot`.
- [ ] Implement `updateSpecialistServices` in `app/actions/owner.ts`.
- [ ] Add `lib/salons/schedules.test.ts` and `app/actions/schedules.test.ts`.

### PR 3: Salon Admin UI Pages & Dialogs

- [ ] Rebuild `app/s/[slug]/(protected)/services/page.tsx` with dynamic category tabs, category CRUD dialog, service CRUD dialog, and active toggles.
- [ ] Update `app/s/[slug]/(protected)/specialists/page.tsx` with specialist-service assignment modal.
- [ ] Implement `app/s/[slug]/(protected)/schedules/page.tsx` (or settings tab) with Salon Business Hours form, Specialist Hours form, and Blocked Dates/Slots form.
- [ ] Run full test suite (`npx vitest run`) and TypeScript check (`npx tsc --noEmit`) to verify 100% pass rate.
