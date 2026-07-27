# Technical Design: Multi-Tenant Authentication and Salon Lifecycle

## 1. Summary

This change adds owner self-registration, generic owner login, a multi-salon owner hub, tenant-aware return paths, trial messaging, public/owner lifecycle enforcement, and SuperAdmin status controls to the existing Next.js App Router application.

The implementation keeps `Salon.status` as the immediate access-control source and uses the existing `Subscription.startDate`/`endDate` fields as the authoritative trial period. No Prisma schema migration is required. Supabase remains the authentication provider and Prisma/PostgreSQL remains the source of application roles, ownership, salon status, plans, and subscriptions.

The repository does not contain `packages/coding-agent`; this change explicitly targets the root Next.js application identified by the proposal and specification.

## 2. Current-State Constraints

- `middleware.ts` currently sends every protected tenant request to generic `/login`, losing the slug and intended destination.
- `/login` is a portal selector with a hard-coded `/s/demo/login` owner link.
- `loginWithEmail` trusts an arbitrary client `next` value and exposes the provider error through a URL query.
- `requireSalonOwner` verifies role and ownership but not lifecycle. Existing owner mutations separately trust a client-provided `salonId`.
- Public `/{slug}` and `/book/{slug}/*` pages use mock content and do not resolve the salon before rendering.
- `/admin/salons` displays status but cannot change it.
- The Prisma schema already has all required relations and fields: `User.ownedSalons`, `Salon.status`, `Salon.planId`, `Plan.isActive`, and `Subscription.startDate`/`endDate`.
- Supabase identity creation is external to a Prisma transaction, so registration must be implemented as a compensating saga around an atomic relational transaction.

## 3. Design Decisions

### 3.1 Authoritative lifecycle classification

Only `trial` and `active` are operational. `suspended` and `cancelled` are inactive. Legacy `pending` fails closed: it is never created by registration, cannot be selected by the new admin status action, does not permit owner mutations or public booking, and is rendered as a non-actionable pending entry in `/my-salons` rather than being falsely labeled suspended.

Lifecycle is read from PostgreSQL on each page request and immediately before each mutation. Middleware performs session routing only; it does not query the database or make lifecycle decisions.

### 3.2 Existing subscription fields are the trial source

No salon trial column is added. Registration creates a `Subscription` with `status = 'trial'`, non-null SQL-date `startDate` and `endDate`, and the configured active trial plan. `Salon.planId` is set to that same plan ID in the relational transaction.

Server-only configuration:

- `TRIAL_PLAN_NAME`: exact name of the active plan used for registration, for example `Free Trial` from the existing seed.
- `TRIAL_DURATION_DAYS`: positive integer number of calendar days.

Missing/invalid configuration or an unavailable active plan fails registration before identity creation. Neither value is accepted from the browser.

### 3.3 Registration is a recoverable saga

Supabase cannot participate in a Prisma transaction. Registration therefore uses this order:

1. Validate and normalize all input, load trusted trial configuration/plan, and reject an existing database email.
2. Create an email-confirmed Supabase identity through the service-role client with non-authoritative metadata `provisioning_state: 'pending'`.
3. Sign in through the cookie-aware server Supabase client before database provisioning. A session without a matching database user cannot pass `requireAuth` and cannot expose tenant data.
4. In one Prisma transaction, create the `salon_owner` user, unique trial salon, and initial trial subscription.
5. Redirect with the established session to `/s/{slug}/dashboard`.

If sign-in or relational provisioning fails, the action signs out and deletes the newly created Supabase identity. If identity deletion fails after a relational rollback, the identity remains unusable because it has no database user and is safe to retry: a later request may reuse it only after the submitted password successfully authenticates it, its metadata is `provisioning_state = pending`, and no `User` exists for its UID. Existing identities outside that narrowly verified recovery case return a generic conflict and are never attached to a salon.

This ordering avoids the harder case in which relational provisioning succeeds but automatic sign-in fails afterward. Database unique constraints remain the final protection against repeated email or slug submissions.

### 3.4 Slug generation

The server creates a lowercase strict slug from `salonName` using the installed `slugify` package. Empty results use `salon`; reserved roots (`admin`, `api`, `auth`, `book`, `login`, `my-salons`, `registro-salon`, `_next`, and static application roots) receive a `-salon` suffix. Uniqueness candidates are `base`, `base-2`, `base-3`, etc. A Prisma `P2002` slug collision rolls back the transaction and retries with the next candidate. The client cannot submit a slug.

### 3.5 Safe redirects

Tenant login accepts only a path under `/s/{same-slug}/`. The sanitizer rejects absolute and protocol-relative URLs, backslashes, control characters, malformed/encoded path separators and dot segments, duplicate leading slashes, cross-tenant paths, and the tenant login route itself. Fragments are dropped; query strings are preserved. Rejection falls back to `/s/{slug}/dashboard`.

Generic login does not honor arbitrary destinations. The server routes a database `salon_owner` to `/my-salons` and a `platform_admin` to `/admin/dashboard`. A tenant login additionally verifies that the authenticated owner owns the tenant before using the sanitized destination; inactive tenants terminate at `/s/{slug}/inactive`.

### 3.6 Page guards versus mutation guards

`requireSalonOwner(slug)` remains the page/action guard and returns the verified salon. Owner actions call it before entering broad error handling and use `salon.id` from the result; client-provided salon IDs are removed from action signatures.

For suspended/cancelled salons the guard redirects to the public inactive page. For `pending` it fails closed with not-found. Redirect exceptions must never be swallowed by owner action `catch` blocks.

`requireOperationalPublicSalon(slug)` is used by every current public salon and booking page. Unknown and legacy-pending slugs return not-found; suspended/cancelled slugs redirect to the inactive page. There is currently no booking-write action—the booking UI is static/mock—but any future availability or creation action must invoke the same current-status check inside the authoritative write operation/transaction.

## 4. Component and Module Design

### 4.1 Shared result contract

Create `lib/actions/result.ts`:

```ts
export type ActionErrorCode =
  | 'VALIDATION'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'INTERNAL'

export type ActionResult =
  | { ok: true }
  | {
      ok: false
      code: ActionErrorCode
      message: string
      fieldErrors?: Record<string, string[]>
    }
```

Actions return this shape for expected failures. Successful registration/login use Next.js `redirect`, which terminates rather than returning `{ ok: true }`.

### 4.2 Lifecycle module

Create `lib/salons/lifecycle.ts`:

```ts
export type OperationalSalonStatus = 'trial' | 'active'
export type InactiveSalonStatus = 'suspended' | 'cancelled'

export function isOperationalSalonStatus(
  status: string
): status is OperationalSalonStatus

export function isInactiveSalonStatus(
  status: string
): status is InactiveSalonStatus

export async function requireOperationalPublicSalon(
  slug: string
): Promise<Salon>
```

The public guard performs a fresh `prisma.salon.findUnique({ where: { slug } })`, returns operational salons, redirects recognized inactive salons, and calls `notFound()` for missing or unrecognized states.

### 4.3 Authentication helpers

Update `lib/auth/helpers.ts` and keep `lib/auth/session.ts` as the session/database adapter.

```ts
type DbUserWithOwnedSalons = Prisma.UserGetPayload<{
  include: { ownedSalons: true; salonMemberships: true }
}>

type VerifiedSalonOwner = {
  user: AuthUser
  dbUser: DbUserWithOwnedSalons
  salon: Salon
}

export async function requireSalonOwner(
  slug: string
): Promise<VerifiedSalonOwner>
```

Order of checks:

1. Fetch the current Supabase user and database user.
2. Require `dbUser.role === 'salon_owner'`.
3. Find the requested salon only inside `dbUser.ownedSalons`.
4. Return only for `trial`/`active`.
5. Redirect suspended/cancelled to `/s/{slug}/inactive`; fail closed for all other states.

`requireAdmin` remains the page guard. Mutation actions that need an `ActionResult` use the same session primitives but return `UNAUTHORIZED` instead of trusting a client role.

Create `lib/auth/tenant-next.ts`:

```ts
export function sanitizeTenantNext(
  rawNext: string | null,
  slug: string
): string
```

### 4.4 Trial utilities and banner

Create `lib/salons/trial.ts`:

```ts
export function getTrialConfig(): {
  planName: string
  durationDays: number
}

export function getCalendarDateInTimezone(now: Date, timezone: string): Date

export function addCalendarDays(date: Date, days: number): Date

export function getTrialDaysRemaining(
  endDate: Date,
  timezone: string,
  now?: Date
): number

export async function getCurrentTrialEndDate(
  salonId: string
): Promise<Date | null>
```

SQL `DATE` values are treated by UTC year/month/day so a Panama offset does not turn midnight UTC into the prior calendar date. The current day is derived with `Intl.DateTimeFormat` in the salon timezone. Remaining days are `max(0, endDayOrdinal - currentDayOrdinal)`.

`getCurrentTrialEndDate` selects the newest `Subscription` for the salon with `status = 'trial'` and non-null `endDate`. Registration guarantees this record. Existing/admin-created trial salons without a valid record do not receive an invented date; the layout omits the days banner and emits a server-side configuration warning without private data.

Create `components/salons/trial-banner.tsx`, a server-compatible presentational component receiving `salonName` and `remainingDays`. It displays the remaining calendar days and links to `https://wa.me/50767005805` (optionally with an encoded, non-sensitive prefilled salon-name message). It is rendered by the protected salon layout, so it appears on every management page for a provisioned trial salon and never for an active salon.

### 4.5 Supabase admin and provisioning service

Create `lib/supabase/admin.ts` to hold the server-only service-role client currently constructed inside `app/actions/admin.ts`. It must never be imported by a client component.

Create `lib/salons/provision-owner.ts` for normalization, reserved-slug handling, pending-identity recovery, compensation, and the Prisma transaction. Its public entry point is server-only:

```ts
type RegistrationInput = {
  ownerName: string
  email: string
  phone?: string
  password: string
  salonName: string
  salonPhone?: string
}

type ProvisionedOwnerSalon = {
  authUserId: string
  dbUserId: string
  salonId: string
  slug: string
}

export async function provisionOwnerAndSalon(
  input: RegistrationInput
): Promise<ProvisionedOwnerSalon>
```

The action layer maps known validation/unique/provider outcomes to `ActionResult`; logs use a generated correlation ID and never include password, session tokens, provider keys, or full form payloads.

## 5. Middleware Logic

Update `middleware.ts` matcher to cover `/admin/:path*`, `/s/:path*`, and `/my-salons`.

Exact route classification is used rather than `pathname.endsWith('/login')`:

```text
refresh/read Supabase session
if /admin/login: allow
if /s/{one-slug}/login or /s/{one-slug}/inactive: allow
if /admin/* and unauthenticated: redirect /admin/login
if /my-salons and unauthenticated: redirect /login?next=%2Fmy-salons
if /s/{slug}/{protected-path} and unauthenticated:
  next = pathname + search
  redirect /s/{slug}/login?next=encodeURIComponent(next)
otherwise: return response with refreshed cookies
```

The middleware-generated `next` is same-origin by construction, but the login page/action still runs `sanitizeTenantNext`; middleware is not a security boundary. `/s/{slug}/inactive` is always public to prevent loops. Public `/{slug}` and `/book/{slug}/*` remain outside auth middleware and are guarded by database lifecycle helpers in their server pages.

## 6. Server Action Implementations

### 6.1 `registerOwnerAndSalon(formData)`

Location: `app/actions/registration.ts`.

- Parse with Zod; trim names, lowercase/trim email, normalize empty optional phones to `undefined`, and rely on Supabase's server-enforced password policy in addition to non-empty validation.
- Ignore/reject any client `role`, `status`, `planId`, `trialDuration`, or `slug` field.
- Resolve trusted config and active plan before creating an identity.
- Run the provisioning saga described in section 3.3.
- On success redirect to `/s/{createdSlug}/dashboard`.
- Return localized, non-provider-specific `VALIDATION`, `CONFLICT`, or `INTERNAL` failures with field errors where applicable.

```ts
export async function registerOwnerAndSalon(
  formData: FormData
): Promise<ActionResult>
```

### 6.2 `loginWithEmail(formData)`

Location: update `app/actions/auth.ts`.

Accepted fields are `email`, `password`, optional `tenantSlug`, and optional `next`. No raw client destination is used.

- Validate credentials and authenticate with the cookie-aware Supabase client.
- On provider failure return a fixed safe message; do not place provider errors in the URL.
- Load the database user by the authenticated UID. Missing database identity signs out and returns `UNAUTHORIZED`.
- For `platform_admin`, redirect to `/admin/dashboard`.
- For `salon_owner` with `tenantSlug`, find the salon in `ownedSalons`, then redirect inactive salons to inactive, operational salons to `sanitizeTenantNext(next, tenantSlug)`, and unsupported states to `/my-salons`.
- For generic owner login, redirect to `/my-salons`.
- Any other role signs out or returns unauthorized according to existing role policy.

```ts
export async function loginWithEmail(
  formData: FormData
): Promise<ActionResult>
```

### 6.3 `updateSalonStatus(salonId, nextStatus)`

Location: update `app/actions/admin.ts`.

```ts
export type AdminMutableSalonStatus = 'trial' | 'active' | 'suspended'

export async function updateSalonStatus(
  salonId: string,
  nextStatus: AdminMutableSalonStatus
): Promise<ActionResult>
```

- Authenticate and load the database caller server-side; return `UNAUTHORIZED` unless role is exactly `platform_admin`.
- Validate UUID and target with Zod; `cancelled`, `pending`, and arbitrary strings are rejected.
- Load the current salon; return `NOT_FOUND` if absent.
- If status already matches, return success without destructive work.
- Otherwise, atomically update status and create an `AuditLog` containing only old/new status and actor identifiers.
- Do not modify plans, subscriptions, appointments, or tenant data.
- Revalidate `/admin/salons`, `/my-salons`, `/{slug}`, `/book/{slug}`, and `/s/{slug}` after persistence.

### 6.4 Existing owner actions

Update `app/actions/owner.ts` signatures to remove untrusted salon IDs:

```ts
updateSalonSettings(formData: FormData, slug: string)
createSpecialist(formData: FormData, slug: string)
deleteSpecialist(specialistId: string, slug: string)
```

Each action calls `const { salon } = await requireSalonOwner(slug)` before writes and uses `salon.id`. Resource mutation predicates include that ID (`where: { id, salonId: salon.id }` via `updateMany`/`deleteMany` where necessary). This prevents submitting salon A's slug with salon B's identifier. Navigation redirects are not caught and converted to generic errors.

### 6.5 Booking writes

No appointment creation action exists in the current repository; the booking flow is display-only mock UI. This change does not invent unrelated booking behavior. All existing booking GET routes are guarded now. When a real availability or creation action is added, its required write pattern is:

```text
start transaction
load salon by slug and require current status in ['trial', 'active']
bind all service/specialist/customer records to that salon ID
create appointment and dependent rows
commit
```

A status mismatch returns `INACTIVE` and creates no records. The check must be in the same authoritative operation as the write, not only at page render.

## 7. Route and UI Design

### 7.1 Registration

New files:

- `app/registro-salon/page.tsx`: public page shell, benefits/trial explanation, link to login.
- `app/registro-salon/registration-form.tsx`: client form using `useActionState`/pending state with owner name, email, optional phone, password, salon name, and optional salon phone. It renders field errors and a generic form error without echoing the password.

The existing landing-page registration links already target this route and require no destination change.

### 7.2 Generic and tenant login

- Replace `app/login/page.tsx` portal selector with a real owner email/password form, registration link, and a separate admin-login link. If already authenticated, route by database role server-side.
- Add a reusable client `app/login/login-form.tsx` or equivalent action-state component.
- Update `app/s/[slug]/login/page.tsx` to accept `searchParams.next`, sanitize it server-side for the hidden value, and submit `tenantSlug`. The action repeats sanitization and ownership/lifecycle checks.
- Update `app/admin/login/page.tsx` to stop submitting a trusted-looking free-form `next`; role-based action routing decides the admin destination.

### 7.3 Multi-salon hub

New `app/my-salons/page.tsx` is a dynamic authenticated server page. It uses the current database user's `ownedSalons` relation, ordered by name or creation date, and renders no data for any other owner.

Each salon card shows name and status:

- `active`/`trial`: link to `/s/{slug}/dashboard`.
- `suspended`/`cancelled`: exact badge text **“Suspendido”** and link to `/s/{slug}/inactive`.
- legacy `pending`: non-actionable **“Pendiente”** badge; no dashboard or booking link.

An explicit empty state links to `/registro-salon`. A platform admin is redirected to its admin area rather than treated as an owner.

### 7.4 Public inactive page

New `app/s/[slug]/inactive/page.tsx` performs a fresh salon lookup:

- unknown or unsupported legacy status: `notFound()`;
- `trial`/`active`: redirect to `/{slug}`;
- `suspended`/`cancelled`: render a public unavailable notice.

The page may show the public salon name but not owner details, subscription dates, plan, admin notes, billing information, services, availability, or booking controls. It links back to the platform home and does not require a session.

### 7.5 Protected layout and trial banner

Update `app/s/[slug]/(protected)/layout.tsx` to use the verified salon name rather than a slug-derived label, render `TrialBanner` immediately below the header for valid trial subscriptions, add a `/my-salons` switcher link, and keep normal access for trial salons even when remaining days are zero.

### 7.6 Public routes

Update these pages to call `requireOperationalPublicSalon(slug)` before rendering:

- `app/[slug]/page.tsx`
- `app/book/[slug]/page.tsx`
- `app/book/[slug]/confirmacion/page.tsx`

The returned salon can supply the displayed name. Existing mock services/content remain out of scope, but no mock content is rendered for an inactive, pending, or unknown salon.

### 7.7 Admin lifecycle controls

Update `app/admin/(protected)/salons/page.tsx` and add `status-control.tsx`. Each row exposes server-action-backed choices for `trial`, `active`, and `suspended`, disables the current value, shows pending state and safe errors, and refreshes from server state after success. Existing `cancelled` rows remain visible but can only transition to one of the allowed targets.

## 8. File Change Map

| File | Change |
| --- | --- |
| `.env.example` | Document `TRIAL_PLAN_NAME` and `TRIAL_DURATION_DAYS` as server-only registration configuration. |
| `package.json` | Add a test script and Vitest dev dependency if the repository adopts the test plan below. |
| `middleware.ts` | Add tenant-specific unauthenticated redirects, `/my-salons`, and exact public login/inactive exemptions. |
| `lib/actions/result.ts` | New shared action result types. |
| `lib/auth/tenant-next.ts` | New same-tenant redirect sanitizer. |
| `lib/auth/helpers.ts` | Add lifecycle enforcement and precise verified-owner return type. |
| `lib/auth/session.ts` | Retain current relation loading; optionally expose a role-routing lookup helper without client claims. |
| `lib/supabase/admin.ts` | New centralized server-only service-role client. |
| `lib/salons/lifecycle.ts` | New status predicates and public salon guard. |
| `lib/salons/trial.ts` | New trusted trial config, date calculation, and subscription lookup. |
| `lib/salons/provision-owner.ts` | New registration saga, slug generation, transaction, recovery, and compensation. |
| `components/salons/trial-banner.tsx` | New management-wide trial/WhatsApp banner. |
| `app/actions/registration.ts` | New validated public registration action. |
| `app/actions/auth.ts` | Safe errors and role/tenant-aware post-login routing; no arbitrary redirect. |
| `app/actions/admin.ts` | Add SuperAdmin-only `updateSalonStatus`; reuse centralized admin client. |
| `app/actions/owner.ts` | Bind writes to verified salon and remove trusted client `salonId`. |
| `app/registro-salon/page.tsx` | New public registration page. |
| `app/registro-salon/registration-form.tsx` | New action-state registration form. |
| `app/login/page.tsx` | Replace demo portal selector with generic owner login and role-aware authenticated redirect. |
| `app/login/login-form.tsx` | New reusable action-state login form. |
| `app/admin/login/page.tsx` | Remove free-form destination trust; use role-based login action. |
| `app/s/[slug]/login/page.tsx` | Preserve sanitized tenant `next` and tenant slug. |
| `app/my-salons/page.tsx` | New authenticated all-owned-salons hub and empty state. |
| `app/s/[slug]/inactive/page.tsx` | New public lifecycle terminal page. |
| `app/s/[slug]/(protected)/layout.tsx` | Lifecycle-aware verified salon, trial banner, salon switcher. |
| `app/[slug]/page.tsx` | Require current operational status before public rendering. |
| `app/book/[slug]/page.tsx` | Require current operational status before booking rendering. |
| `app/book/[slug]/confirmacion/page.tsx` | Require current operational status before confirmation rendering. |
| `app/admin/(protected)/salons/page.tsx` | Render status controls using current database state. |
| `app/admin/(protected)/salons/status-control.tsx` | New pending/error UI for status action. |
| Owner settings/specialist client components | Update calls after removal of `salonId` from owner action signatures. |
| `prisma/schema.prisma` | No change. Existing schema satisfies persistence contract. |

## 9. Data Flows

### Registration

```text
RegistrationForm
  -> registerOwnerAndSalon(FormData)
  -> Zod normalization + trusted trial config/plan lookup
  -> Supabase Admin create/recover pending identity
  -> cookie Supabase signInWithPassword
  -> Prisma $transaction(User + Salon + Subscription)
  -> redirect /s/{slug}/dashboard with session cookie

failure before commit
  -> Prisma rollback (automatic)
  -> cookie signOut
  -> Supabase Admin delete identity (or leave verified pending/retryable orphan)
  -> safe ActionResult
```

### Protected tenant navigation

```text
/s/acme/settings?tab=hours without session
  -> middleware /s/acme/login?next=encoded same-origin path
  -> tenant login + database owner lookup
  -> sanitizeTenantNext(next, 'acme')
  -> require ownership/current status
  -> /s/acme/settings?tab=hours
  -> protected layout requireSalonOwner('acme') rechecks status
```

### Inactive public/owner navigation

```text
public or owner route resolves salon
  -> fresh Salon.status
  -> suspended/cancelled
  -> redirect /s/{slug}/inactive
  -> public page fresh lookup
  -> render non-sensitive unavailable notice
```

### Admin status update

```text
StatusControl
  -> updateSalonStatus(id, target)
  -> current Supabase session + DB role == platform_admin
  -> enum/id validation + salon lookup
  -> transaction(status update + audit log)
  -> revalidate affected routes
  -> next owner/public request reads new status
```

## 10. Security and Failure Handling

- PostgreSQL role and ownership relations are authoritative; Supabase metadata and hidden form values are not.
- Service-role credentials remain in server-only modules.
- Passwords and tokens are never logged, included in redirect URLs, or returned in errors.
- Tenant `next` is validated twice and cannot cross tenant boundaries.
- Owner action resource IDs are scoped to the verified salon ID.
- Inactive checks happen before private page data loading and before protected writes.
- Public inactive output contains no private status reason or subscription/admin information.
- Registration relational writes are atomic; external identity failure is compensated and orphan recovery is restricted to authenticated app-created pending identities.
- Status updates are enum-restricted, idempotent, audited, and non-destructive.
- Next.js redirect/not-found control-flow errors are not swallowed by broad catches.

## 11. Test Strategy

The repository has no test runner. Add Vitest in Node mode (`vitest.config.ts`, `npm test`) for pure modules and server modules with mocked Supabase/Prisma boundaries.

### Unit tests

- `sanitizeTenantNext`: valid query preservation; absent fallback; external, protocol-relative, cross-tenant, login-loop, backslash, control-character, encoded separator/dot-segment, malformed encoding, and duplicate-slash rejection.
- lifecycle predicates: only trial/active operational; only suspended/cancelled inactive; pending fails both classifications.
- trial days: Panama timezone boundaries, same-day zero, expired zero, positive calendar differences, DST-capable timezone behavior, and UTC SQL-date handling.
- slug generation: accents, punctuation, empty names, reserved roots, and suffix candidates.
- registration validation: normalized email, ignored privileged fields, field errors, missing trial configuration.

### Server/action tests with mocked boundaries

- Successful registration creates exactly one user/salon/subscription in one transaction with matching plan IDs and deterministic dates, signs in, and redirects to the generated dashboard.
- Relational failure rolls back, signs out, and deletes the new auth identity; retryable pending identity recovery requires the same valid credentials and no DB user.
- Duplicate database/auth email returns conflict and never attaches a salon.
- Generic owner login routes to `/my-salons`; tenant login preserves a valid same-tenant path and rejects forged paths; admin routes by DB role.
- `requireSalonOwner` permits only owned operational salons and blocks cross-owner, inactive, and pending cases.
- Owner actions use verified `salon.id`, not submitted IDs.
- Public guard returns operational salons, redirects inactive salons, and not-founds missing/pending slugs.
- Admin status action rejects non-admin/invalid/cancelled targets, handles not-found and idempotence, persists valid changes, and writes no tenant business data.

### Middleware/route tests

- Tenant protected request retains path/query in tenant login redirect.
- Tenant login and inactive routes are public and loop-free.
- `/my-salons` and `/admin` use their correct login routes.
- Direct inactive page behavior: inactive renders, operational redirects public, unknown not-found.
- Public landing and every current booking step invoke the operational guard.

### Manual acceptance smoke test

Use two owners, mixed-status salons, and one SuperAdmin. Verify registration/session/banner/WhatsApp, all four hub statuses, safe destination return, cross-tenant denial, status changes taking effect on the next request, inactive public pages without a session, and unchanged active/trial public flows.

## 12. Rollout and Rollback

1. Configure `TRIAL_PLAN_NAME` and `TRIAL_DURATION_DAYS`; verify the named plan exists and is active in production before exposing registration.
2. Deploy server helpers/actions and pages together so new registration cannot create tenants before lifecycle guards and the hub exist.
3. Smoke-test Supabase identity compensation in staging and verify no password/provider error is logged.
4. Enable public registration links (already present on the landing page) after configuration validation.
5. Monitor registration failures by non-sensitive correlation ID, pending auth-only identities, tenant-login redirect rates, and inactive-route traffic.

No database migration is required. Rollback can hide/remove registration and status controls and revert middleware/helper behavior without deleting tenant records. Persisted status changes are non-destructive; setting a salon back to `active` restores access. Existing subscription history remains intact.

## 13. Traceability to Acceptance Criteria

| Acceptance criterion | Design coverage |
| --- | --- |
| AC-01 | Registration saga, atomic Prisma transaction, automatic cookie session, compensation/recovery. |
| AC-02 | Existing subscription dates, timezone calendar utility, protected-layout banner, exact WhatsApp target. |
| AC-03 | Role-based generic login and double-validated same-tenant return path. |
| AC-04 | Authenticated `/my-salons` relation-derived cards and exact inactive badge/link behavior. |
| AC-05 | Lifecycle-aware `requireSalonOwner` and verified-salon-bound owner actions. |
| AC-06 | Public guard on all current public/booking pages and required same-operation status check for future booking writes. |
| AC-07 | Public exact middleware exemption and status-aware inactive page with no sensitive data. |
| AC-08 | Server-side DB role check and restricted admin status enum. |
| AC-09 | Fresh status reads, immediate route revalidation, non-destructive update. |
| AC-10 | Existing active/trial paths remain operational; demo destination is removed. |
