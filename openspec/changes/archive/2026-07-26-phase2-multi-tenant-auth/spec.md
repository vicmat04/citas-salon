# Multi-Tenant Authentication and Salon Lifecycle Specification

## Purpose

Define the externally observable behavior for owner self-registration, multi-salon access, trial visibility, tenant-aware authentication, salon lifecycle enforcement, and SuperAdmin lifecycle control.

This is a full specification for a new domain because no canonical OpenSpec domain specification exists for this capability.

## Scope and Definitions

- **Operational salon:** a salon whose `Salon.status` is exactly `trial` or `active`.
- **Inactive salon:** a salon whose `Salon.status` is exactly `suspended` or `cancelled`.
- **Owner:** an authenticated database user whose role is `salon_owner` and whose `User.ownedSalons` relation contains the requested salon.
- **SuperAdmin:** an authenticated database user whose role is `platform_admin`.
- **Trial subscription:** the authoritative current `Subscription` created during owner onboarding with `status = trial`, a non-null `startDate`, and a non-null `endDate`.
- **Safe tenant return path:** a normalized local path under `/s/{same-slug}/` that is not protocol-relative, external, malformed, or a login loop.

`pending` is a legacy schema value, not an operational or inactive state in this change. It MUST fail closed for management mutations and public booking and MUST NOT be produced by owner registration or the lifecycle action defined here.

## Public Contracts

### Route Contract

| Method | Route | Access | Required outcome |
| --- | --- | --- | --- |
| `GET` | `/registro-salon` | Public | Render owner and initial-salon registration. |
| `GET` | `/login` | Public | Render generic authentication; authenticated owners continue to `/my-salons`. |
| `GET` | `/my-salons` | Authenticated owner | List every salon in the signed-in user's `ownedSalons` relation. |
| `GET` | `/s/{slug}/login?next={path}` | Public | Authenticate an owner and return only to an approved same-tenant local path. |
| `GET` | `/s/{slug}/inactive` | Public | Render the terminal unavailable notice for suspended or cancelled salons. |
| `GET` | `/s/{slug}/*` protected management routes | Owning authenticated owner; operational salon | Render management behavior or redirect as specified below. |
| `GET` | `/{slug}` | Public; operational salon | Render the salon's public landing page. |
| `GET/POST` | `/book/{slug}/*` and booking mutations | Public; operational salon | Render or accept booking behavior only while the salon is operational. |
| `GET` | `/admin/salons` | SuperAdmin | List salons and offer allowed lifecycle controls. |

No new public JSON API is required by this change. State changes MUST use server-authorized actions or an equivalently protected server endpoint.

### Server Action Signatures

```ts
type ActionResult =
  | { ok: true }
  | {
      ok: false
      code: 'VALIDATION' | 'CONFLICT' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'INACTIVE' | 'INTERNAL'
      message: string
      fieldErrors?: Record<string, string[]>
    }

type AdminMutableSalonStatus = 'trial' | 'active' | 'suspended'

registerOwnerAndSalon(formData: FormData): Promise<ActionResult>
loginWithEmail(formData: FormData): Promise<ActionResult>
updateSalonStatus(
  salonId: string,
  nextStatus: AdminMutableSalonStatus
): Promise<ActionResult>
```

Successful registration MUST establish the session and redirect to `/s/{createdSlug}/dashboard`. Successful generic owner login MUST redirect to `/my-salons` unless an approved tenant-specific `next` path was submitted. Successful status update MUST persist before returning success. Framework redirect termination MAY replace the `{ ok: true }` return where required by Next.js.

`registerOwnerAndSalon` accepts these form fields:

| Field | Requirement |
| --- | --- |
| `ownerName` | Required non-empty owner display name. |
| `email` | Required syntactically valid email; compared using the application's normalized email form. |
| `phone` | Optional owner phone. |
| `password` | Required and subject to the configured authentication provider's server-enforced password policy. |
| `salonName` | Required non-empty salon name. |
| `salonPhone` | Optional salon phone. |

The salon slug MUST be generated server-side from `salonName`, MUST be unique, and MUST not use a reserved application slug. Trial duration and trial plan identity MUST come from trusted server configuration; neither may be supplied by the registration client.

### Authorization and Lifecycle Helper Signatures

```ts
type OperationalSalonStatus = 'trial' | 'active'
type InactiveSalonStatus = 'suspended' | 'cancelled'

type VerifiedSalonOwner = {
  user: AuthenticatedProviderUser
  dbUser: DatabaseUserWithOwnedSalons
  salon: Salon
}

isOperationalSalonStatus(status: string): status is OperationalSalonStatus
isInactiveSalonStatus(status: string): status is InactiveSalonStatus
sanitizeTenantNext(rawNext: string | null, slug: string): string
requireSalonOwner(slug: string): Promise<VerifiedSalonOwner>
requireOperationalPublicSalon(slug: string): Promise<Salon>
getTrialDaysRemaining(endDate: Date, timezone: string, now?: Date): number
```

These signatures are behavioral contracts; internal module placement is not prescribed. `requireSalonOwner` MUST perform authentication, role, ownership, salon existence, and lifecycle checks before returning.

## Persistence and Schema Contract

The existing Prisma models are sufficient; no new column is required for this change. The following persisted values and constraints are mandatory:

| Model | Required persisted behavior |
| --- | --- |
| `User` | New owner has `role = 'salon_owner'`, normalized unique email, and the authentication-provider UID used by the session. |
| `Salon` | New salon references the new owner, has a unique non-reserved slug, and has `status = 'trial'`. Existing lifecycle values remain `trial`, `active`, `suspended`, and `cancelled`. |
| `Plan` | A trusted, active trial plan MUST be resolvable during registration. Missing trial-plan configuration MUST make registration fail without partial tenant records. |
| `Subscription` | Registration creates an initial row with the new salon, configured trial plan, `status = 'trial'`, authoritative `startDate`, and non-null deterministic `endDate`. |
| `Salon.planId` | When populated for the new salon, it MUST equal the initial trial subscription's `planId`; provisioning MUST NOT create contradictory plan references. |

`Subscription.startDate` and `Subscription.endDate` are the authoritative trial-date source. A migration that introduces a separate salon trial field MUST NOT be added while these fields can represent the requirement. Trial records with a null `endDate` are invalid for the banner contract and MUST fail registration rather than silently showing an invented date.

Relational creation of the `User`, `Salon`, and initial `Subscription` MUST be atomic. Because authentication-provider identity creation is external to the relational transaction, a failed registration MUST NOT leave an authenticated usable owner with a partially provisioned tenant; any external identity created by the failed attempt MUST be removed or placed in a state that is safe to retry.

## Requirements

### Requirement: Owner Self-Registration

The system MUST provide `/registro-salon` and MUST validate registration data on the server. A successful registration MUST create exactly one owner, one owned trial salon, and one initial trial subscription, then authenticate the owner and redirect to that salon's dashboard. Duplicate email, invalid input, unavailable trial configuration, or provisioning failure MUST return a non-secret-bearing error and MUST NOT create a partial salon or subscription.

#### Scenario: New owner completes registration

- GIVEN a visitor supplies valid owner and salon data with an unused email
- AND a valid trial plan and positive trial duration are configured
- WHEN `registerOwnerAndSalon(formData)` succeeds
- THEN one `salon_owner` user MUST exist for the normalized email
- AND one salon owned by that user MUST exist with `status = 'trial'`
- AND one trial subscription with deterministic start and end dates MUST exist for that salon
- AND an authenticated session MUST be established
- AND the response MUST redirect to `/s/{createdSlug}/dashboard`

#### Scenario: Registration cannot be fully provisioned

- GIVEN any relational provisioning step fails after the request has passed validation
- WHEN the registration action completes with failure
- THEN no salon or trial subscription from that attempt MUST remain
- AND no usable authenticated session MUST be established
- AND retrying with the same valid inputs MUST not be blocked by an orphan created by that failed attempt

#### Scenario: Existing email attempts public signup

- GIVEN the normalized email already belongs to an authentication or database user
- WHEN the visitor submits `/registro-salon`
- THEN the action MUST return a conflict result
- AND it MUST NOT attach a new salon to the existing account
- AND it MUST NOT disclose authentication secrets or password state

### Requirement: Trial Period and Upgrade Banner

A `trial` salon MUST retain the same management and public access as an `active` salon. Every management page for a trial salon MUST display a visible trial banner containing remaining calendar days and a WhatsApp upgrade/payment action for `+507 67005805`. The WhatsApp target MUST normalize to `https://wa.me/50767005805`; a prefilled message MAY be added. This change MUST NOT collect payment.

Remaining days MUST be calculated server-side as the non-negative difference between the subscription `endDate` and the current calendar date in the salon timezone. A past or same-day end date MUST display `0` days. Trial expiry alone MUST NOT silently change `Salon.status` or remove access; lifecycle remains controlled by `Salon.status`.

#### Scenario: Trial salon has time remaining

- GIVEN a trial salon's authoritative subscription end date is five calendar days after today in the salon timezone
- WHEN its owner opens any management page
- THEN the salon MUST remain usable
- AND the banner MUST display `5` days remaining
- AND the banner MUST provide a WhatsApp action targeting `50767005805`

#### Scenario: Trial end date has passed but status is still trial

- GIVEN the authoritative trial end date is before today
- AND `Salon.status = 'trial'`
- WHEN an owner or visitor accesses an otherwise permitted salon route
- THEN the salon MUST still be treated as operational
- AND the owner banner MUST display `0` days remaining
- AND no payment or automatic status transition MUST occur

#### Scenario: Active salon management page

- GIVEN `Salon.status = 'active'`
- WHEN the owner opens a management page
- THEN normal management access MUST be allowed
- AND the trial-days banner MUST NOT be presented as an active trial

### Requirement: Tenant-Aware Authentication and Safe Return Paths

An unauthenticated request to a protected `/s/{slug}/*` route MUST redirect to `/s/{slug}/login` and MUST preserve the original path and query only as an encoded, validated `next` value. `/s/{slug}/login` and `/s/{slug}/inactive` MUST remain public and MUST never redirect to themselves because of missing authentication.

`sanitizeTenantNext` MUST accept only a normalized path beginning with one `/`, under `/s/{same-slug}/`, and not targeting the tenant login page. It MUST reject absolute URLs, protocol-relative values, backslash variants, control characters, malformed encodings, cross-tenant paths, and paths that normalize outside the same tenant. Rejected or absent values MUST fall back to `/s/{slug}/dashboard`.

#### Scenario: Unauthenticated owner preserves tenant destination

- GIVEN no authenticated session
- WHEN `/s/acme/settings?tab=hours` is requested
- THEN the response MUST redirect to `/s/acme/login?next={encoded-same-tenant-path}`
- AND successful owner login MUST return to `/s/acme/settings?tab=hours`

#### Scenario: External next value is forged

- GIVEN the tenant login request includes `next=https://evil.example`, `next=//evil.example`, or a cross-tenant path
- WHEN authentication succeeds for `/s/acme/login`
- THEN the destination MUST be `/s/acme/dashboard`
- AND no redirect to the attacker-controlled destination MUST occur

#### Scenario: Public inactive page has no session

- GIVEN a suspended salon and no authenticated session
- WHEN `/s/acme/inactive` is requested
- THEN the inactive page MUST render without a login redirect or redirect loop

### Requirement: Generic Owner Login

The generic login experience MUST NOT contain a hard-coded demo salon destination. A successfully authenticated `salon_owner` using the generic login MUST continue to `/my-salons`. Existing SuperAdmin authentication MUST continue to its authorized admin destination and MUST NOT be routed through an owner tenant guessed by the client.

#### Scenario: Owner uses generic login

- GIVEN a valid `salon_owner` account
- WHEN the owner authenticates from `/login` without an approved tenant `next`
- THEN the response MUST redirect to `/my-salons`
- AND no demo slug MUST be used

#### Scenario: Authentication fails

- GIVEN invalid credentials
- WHEN login is submitted
- THEN no session MUST be established
- AND the user MUST remain on the originating login experience with a safe error message
- AND the submitted password MUST NOT appear in the URL, logs, or error text

### Requirement: Multi-Salon Owner Hub

`/my-salons` MUST require authentication and MUST derive its data from the signed-in database user's `ownedSalons` relation. It MUST show every owned salon, including `active`, `trial`, `suspended`, and `cancelled` salons, without exposing salons owned by another user.

Operational entries MUST link to `/s/{slug}/dashboard`. Suspended and cancelled entries MUST display the exact visible badge text **“Suspendido”** and MUST link to `/s/{slug}/inactive` rather than to a usable dashboard.

#### Scenario: Owner has mixed salon statuses

- GIVEN an owner has one active, one trial, one suspended, and one cancelled salon
- WHEN the owner opens `/my-salons`
- THEN all four salons MUST be listed
- AND active and trial entries MUST lead to their dashboards
- AND suspended and cancelled entries MUST show **“Suspendido”**
- AND those inactive entries MUST lead to their inactive pages

#### Scenario: Owner has no salons

- GIVEN an authenticated owner has no `ownedSalons`
- WHEN `/my-salons` is opened
- THEN the page MUST render an explicit empty state
- AND it MUST NOT guess, synthesize, or expose another tenant

#### Scenario: Unauthenticated user requests the hub

- GIVEN no authenticated session
- WHEN `/my-salons` is requested
- THEN the response MUST redirect to generic login with a safe local return path
- AND salon data MUST NOT be rendered

### Requirement: Lifecycle Classification and Immediate Enforcement

Every route, loader, helper, and mutation that resolves a salon MUST treat only `trial` and `active` as operational and MUST treat `suspended` and `cancelled` as inactive. Lifecycle decisions MUST use current server-side `Salon.status` on each request or mutation authorization check; stale client state MUST NOT authorize access.

#### Scenario: Salon status changes to suspended

- GIVEN a salon was operational on a prior request
- WHEN its persisted status becomes `suspended`
- THEN the next owner management request MUST be redirected to `/s/{slug}/inactive`
- AND the next public salon or booking request MUST resolve to that inactive destination
- AND the next salon mutation MUST be rejected before writing

#### Scenario: Salon is reactivated

- GIVEN a salon is suspended
- WHEN a SuperAdmin persists `status = 'active'`
- THEN the next authorized owner and public request MUST be allowed normally
- AND existing salon, owner, appointment, and subscription data MUST remain intact

### Requirement: Public Inactive Experience

`/s/{slug}/inactive` MUST be publicly reachable for suspended and cancelled salons and MUST provide a clear unavailable notice without exposing private owner, subscription, admin-note, or billing data. The page MUST not offer a booking action. Unknown slugs MUST return not found. Direct access to the inactive route for an operational salon MUST redirect to its public landing route `/{slug}`.

#### Scenario: Visitor opens a suspended salon

- GIVEN `Salon.status = 'suspended'`
- WHEN an unauthenticated visitor reaches any guarded public or owner entry point for that salon
- THEN the visitor MUST ultimately receive `/s/{slug}/inactive`
- AND the page MUST explain that the salon is unavailable
- AND no booking controls or private status reason MUST be exposed

#### Scenario: Unknown inactive URL

- GIVEN no salon exists for the requested slug
- WHEN `/s/{slug}/inactive` is requested
- THEN the system MUST return not found
- AND it MUST NOT reveal whether any user or subscription exists

#### Scenario: Operational salon inactive URL

- GIVEN `Salon.status` is `trial` or `active`
- WHEN `/s/{slug}/inactive` is requested directly
- THEN the response MUST redirect to `/{slug}`
- AND it MUST NOT falsely label the salon suspended

### Requirement: Owner Management Authorization

`requireSalonOwner(slug)` MUST authenticate the request, require `role = 'salon_owner'`, locate the requested salon in the authenticated user's ownership relation, and enforce lifecycle status before returning. For suspended or cancelled salons it MUST redirect to `/s/{slug}/inactive` for page loads and MUST prevent mutations. Every owner mutation MUST bind resource identifiers to the salon returned by the helper and MUST NOT trust a client-supplied `salonId` independently of the verified slug.

#### Scenario: Owner accesses an owned operational salon

- GIVEN an authenticated owner owns the requested salon
- AND its status is `trial` or `active`
- WHEN a protected management page or action calls `requireSalonOwner(slug)`
- THEN the helper MUST return the authenticated user, database user, and matching salon
- AND the requested behavior MAY proceed

#### Scenario: Owner attempts cross-tenant mutation

- GIVEN an authenticated owner owns salon A but not salon B
- WHEN a mutation submits salon A's slug with salon B's resource or identifier
- THEN the mutation MUST reject the request
- AND no data in either salon MUST be changed

#### Scenario: Inactive owner mutation

- GIVEN an authenticated owner owns a cancelled salon
- WHEN the owner submits a management mutation
- THEN lifecycle status MUST be rechecked server-side
- AND the mutation MUST return or terminate as inactive
- AND no write MUST occur

### Requirement: Public Salon and Booking Enforcement

The public salon route `/{slug}`, every `/book/{slug}/*` step, and every booking availability or creation operation MUST resolve the salon server-side and require operational status. A suspended or cancelled salon MUST not expose services, availability, or booking submission behavior and MUST redirect to `/s/{slug}/inactive`.

Booking creation MUST recheck status in the same authoritative server-side operation that accepts the booking so a salon suspended after page render cannot receive a new booking.

#### Scenario: Visitor books an operational salon

- GIVEN a salon is `active` or `trial`
- WHEN a visitor opens its public page and proceeds through booking
- THEN public salon and booking behavior MUST remain available
- AND existing active-salon behavior MUST not regress

#### Scenario: Inactive salon public page

- GIVEN a salon is suspended or cancelled
- WHEN `/{slug}` or `/book/{slug}` is requested
- THEN the response MUST redirect to `/s/{slug}/inactive`
- AND services and availability MUST NOT be rendered

#### Scenario: Salon is suspended before booking submission

- GIVEN a visitor loaded booking availability while the salon was operational
- AND a SuperAdmin suspends the salon before submission
- WHEN the visitor submits the booking
- THEN the booking operation MUST reject the submission as inactive
- AND no appointment or dependent booking record MUST be created

### Requirement: SuperAdmin Salon Status Control

`/admin/salons` MUST allow only a SuperAdmin to submit `updateSalonStatus(salonId, nextStatus)`. The action MUST validate `salonId` server-side and MUST accept target values only from `trial`, `active`, or `suspended`. `cancelled` remains a recognized inactive value for existing records but is not a target exposed by this change. Client-provided role claims or disabled UI state MUST NOT substitute for server authorization.

The action MUST persist `Salon.status`, MUST be idempotent when the target equals the current value, MUST make the new lifecycle effective on the next request, and MUST NOT delete or rewrite tenant business data or subscription history.

#### Scenario: SuperAdmin suspends a salon

- GIVEN an authenticated `platform_admin` and an existing active salon
- WHEN `updateSalonStatus(salonId, 'suspended')` is submitted
- THEN the action MUST persist `status = 'suspended'`
- AND it MUST return success
- AND subsequent owner and public requests MUST enforce inactivity

#### Scenario: SuperAdmin changes salon to trial

- GIVEN an authenticated `platform_admin` and an existing salon
- WHEN `updateSalonStatus(salonId, 'trial')` is submitted
- THEN the action MUST persist `status = 'trial'`
- AND the salon MUST be operational on the next request
- AND a trial banner MUST only render if a valid authoritative trial subscription end date is available

#### Scenario: Non-admin or invalid target submits status change

- GIVEN the caller is not a `platform_admin` OR the target is not `trial`, `active`, or `suspended`
- WHEN the status action is submitted
- THEN the action MUST reject the request
- AND `Salon.status` MUST remain unchanged
- AND no client-supplied permission value MUST override the rejection

#### Scenario: Target salon does not exist

- GIVEN an authenticated SuperAdmin submits an unknown salon ID
- WHEN the status action runs
- THEN it MUST return a not-found result
- AND no other salon MUST be modified

### Requirement: Security, Privacy, and Failure Safety

Authentication credentials, provider service keys, session tokens, and passwords MUST remain server-only and MUST NOT be included in URLs, client payloads beyond the intended credential submission, rendered errors, or application logs. All actions MUST validate input server-side. Lifecycle and ownership checks MUST occur before data access that would expose private tenant information and immediately before protected writes.

Errors SHOULD distinguish validation, conflict, unauthorized, not found, inactive, and internal outcomes without exposing stack traces, database details, authentication-provider internals, or whether unrelated accounts exist. Repeated submissions MUST NOT create duplicate salons or subscriptions for one successful registration attempt.

#### Scenario: Client tampers with role and status fields

- GIVEN a request submits `role = 'platform_admin'`, `status = 'active'`, a trial duration, or a plan ID through an untrusted form
- WHEN owner registration or an owner action processes the request
- THEN all such client-controlled privileged values MUST be ignored or rejected
- AND trusted server rules MUST determine role, lifecycle status, plan, and trial dates

#### Scenario: Registration is submitted repeatedly

- GIVEN the same registration request is submitted more than once because of retry or double activation
- WHEN processing completes
- THEN at most one request MAY succeed for the unique email and slug
- AND duplicate owner, salon, or initial subscription records MUST NOT be created by the rejected request

## Formal Acceptance Criteria

- **AC-01:** `/registro-salon` provisions a `salon_owner`, unique trial salon, deterministic initial trial subscription, authenticated session, and dashboard redirect with no partial relational state.
- **AC-02:** Trial management pages show non-negative calendar days from `Subscription.endDate` and a WhatsApp action to `https://wa.me/50767005805`; trial status remains operational even at zero days.
- **AC-03:** Generic owner login ends at `/my-salons`; tenant login preserves only an approved same-tenant local `next`; external and cross-tenant redirects are rejected.
- **AC-04:** `/my-salons` lists all and only owned salons; suspended and cancelled entries remain visible with **“Suspendido”** and lead to the inactive page.
- **AC-05:** Owner pages and mutations allow owned `trial`/`active` salons and block `suspended`/`cancelled` salons before rendering private data or writing.
- **AC-06:** `/{slug}`, `/book/{slug}/*`, and booking writes redirect inactive salons to `/s/{slug}/inactive`; a status change between render and submit cannot create a booking.
- **AC-07:** `/s/{slug}/inactive` is public, loop-free, non-sensitive, and terminal for inactive salons; unknown slugs are not found and operational salons are not falsely marked inactive.
- **AC-08:** Only `platform_admin` can set a salon to `trial`, `active`, or `suspended`; invalid targets and non-admin requests leave status unchanged.
- **AC-09:** A persisted status change is honored on the next owner and public request without deleting tenant or subscription data.
- **AC-10:** Existing active and trial salon management and public booking flows continue without tenant-context loss or demo-slug routing.

## Non-Goals

- Payment collection, invoicing, reconciliation, pricing, or an automated upgrade workflow.
- Automatic status transitions when a trial end date is reached.
- Delegated staff authorization or changes to ownership semantics.
- Customer-authentication redesign or unrelated appointment behavior.
- A new public JSON API.
