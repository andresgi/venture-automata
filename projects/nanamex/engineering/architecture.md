# Architecture — Clin (Nanamex)

Status: DRAFT for ARCHITECTURE_GATE (human approval required before BUILD).
Prepared for backlog item TA-001. Source of truth: `product/prd.md` +
`product/prd-addendum.md` (both authoritative together), `design/*` (VERIFIED),
`config/CONSTRAINTS.md`.

Vendor/pricing evaluation date: **2026-09-01**. This environment has no live web-access
tool, so vendor claims below are based on the architect's best knowledge of each vendor's
publicly documented pricing/capabilities as of that date, not a live fetch. **Before BUILD
commits to a paid tier, re-verify current pricing/limits directly against each vendor's
pricing page** — flagged again in the Technology and Service Decisions table.

---

## 1. Guiding Principles

- Boring technology. One deployable application. No microservices, no message queue, no
  bespoke matching "engine" beyond a documented SQL/TypeScript rule set.
- Every vendor choice is justified against V1's actual load (a two-sided marketplace in
  its validation phase, not at scale) — not against hypothetical future scale.
- Every open item explicitly deferred to this phase by `product/prd-addendum.md` and
  `design/UX-spec.md` Part E is resolved below with reasoning, or explicitly flagged as a
  human/legal decision this phase must not make unilaterally.

## 2. Platform Target & Repository Structure

`config/CONSTRAINTS.md` fixes **web only** for V1 — no native mobile client, no standalone
backend service required. This is a **single-platform venture**. Per the Technical
Architect's repository-structure mandate: a single platform does not need workspace
tooling (npm/pnpm workspaces, Nx, Turborepo) — that overhead exists to coordinate multiple
independently-built platforms (e.g. a mobile client + backend) that would otherwise drift
from a shared contract. Clin has exactly one deployable: a Next.js application that is its
own frontend and backend (API routes / server actions). There is no second platform for a
shared-types package to protect against drift with.

**Decision: normal single-project Next.js layout, no monorepo tooling.**

```
/ (repo root)
  app/                    Next.js App Router
    (public)/             landing, auth
    familia/               familia-only routes (route group with layout guard)
    ninera/                niñera-only routes
    admin/                 admin-only routes
    api/                   webhooks (Stripe), cron endpoints, Twilio callbacks
  actions/                 server actions, grouped by domain (necesidades, matching,
                           entitlements, verification, reports)
  lib/                     domain logic: matching engine, entitlement rules, auth helpers,
                           supabase clients (server-only vs. browser-safe)
  db/                      schema (SQL migrations), seed data (zonas reference table)
  emails/                  React Email templates (Resend)
  components/              UI components per design/UI-SYSTEM.md
  tests/                   unit + integration tests
```

If Clin later adds a native mobile app (explicitly out of scope for V1, `config/
CONSTRAINTS.md`), that is the trigger to revisit this decision and introduce a
`packages/shared` workspace for the API contract — not before.

## 3. Frontend Architecture

- Next.js (App Router), TypeScript, React Server Components by default; client components
  only where interactivity requires it (wizard steps, filters, paywall dialog, admin
  queue actions).
- UI built on shadcn/ui (Radix + Tailwind) fully retthemed per `design/UI-SYSTEM.md` §7 —
  already specified by UI phase, not re-litigated here.
- Data fetching: server components read directly via server-side Supabase client (service
  role, never exposed to the browser) inside route handlers/server actions. No client-side
  direct-to-Supabase queries — this keeps 100% of authorization logic in one place (Next.js
  server code) rather than split between app code and Postgres RLS policies the app has to
  keep in sync with. See §11 (Security) for why this is the primary authorization boundary.
- Forms: server actions (`"use server"`) with `zod` schema validation shared between client
  (react-hook-form resolver) and server (re-validated server-side — never trust client
  validation alone, e.g. the age-range enum, salary bounds, modalidad enum).

## 4. Backend Architecture

**No standalone backend service.** Next.js API routes/server actions are the entire
backend, per `config/CONSTRAINTS.md`'s explicit instruction to use them "unless
TECH_ARCHITECTURE finds a specific reason not to." No such reason was found: V1's write
volume (necesidad creation, contact requests, verification review, payments) is low,
there's no need for a long-running process outside the request/response or scheduled-cron
lifecycle, and Vercel's serverless functions comfortably cover the compute Clin needs
(matching is a bounded SQL query + in-memory scoring over, at most, a few hundred niñera
rows per zona in V1's target markets — not a batch/ML workload).

Backend surfaces:
- **Server actions** — the default for all authenticated, form-driven mutations (create
  necesidad, favorite, contact, advance pipeline, upload ID, submit report, admin
  approve/reject).
- **API routes** — only where a server action doesn't fit: Stripe webhook receiver
  (`/api/webhooks/stripe`), Twilio Verify callback if needed, and cron-triggered endpoints
  (`/api/cron/*`, invoked by Vercel Cron, protected by a shared secret header).
- **Background processing** — no queue. The only scheduled job in V1 is the identity
  -document retention purge (see §12/§13, and `engineering/security.md` item 8), run via
  Vercel Cron. Everything else (SLA color-coding, entitlement expiry) is computed at
  **read time** from timestamps already on the row (`now() - submitted_at`,
  `expires_at > now()`) — no cron needed for those, avoiding the "premature
  infrastructure" failure mode.

## 5. Database & Platform

**Decision: Supabase (managed Postgres + Auth + Storage) as the single data platform.**

| Option | Notes |
|---|---|
| Supabase (chosen) | Postgres + Auth (GoTrue, open-source, self-hostable) + Storage (S3-compatible, policy-based) in one managed product. Free tier covers V1 development; Pro tier (~$25/mo as of last published pricing — **reverify before commit**) covers a small production launch. |
| Neon (Postgres only) + Auth.js + Cloudflare R2 (storage) | More "best of breed" per component, but three vendors to wire together and three consoles to operate, for a V1 team that (per `config/CONSTRAINTS.md`) is very small. More building, no clear benefit at this scale. |
| Vercel Postgres + Clerk (auth) + Vercel Blob (storage) | Same multi-vendor coordination cost as above; Clerk adds a second identity system to reconcile with our own `profiles`/role table. |

Rationale: one vendor for DB+Auth+Storage removes an entire class of "which system is the
source of truth for this user" bugs, and Supabase's components are individually
replaceable later (Postgres is portable by definition; GoTrue is open-source and
self-hostable; Storage is S3-compatible) — this preserves a real migration path without
paying the multi-vendor integration cost now.

## 6. Authentication

**Decision: Supabase Auth (email + password) for account identity/session. Twilio Verify
for phone-number OTP as a secondary, non-login verification signal.**

- Email is the login identity (matches `AUTH-02`'s form: nombre, correo, teléfono,
  contraseña). Supabase Auth's built-in "confirm your email" flow satisfies the email leg
  of `AUTH-03`.
- Phone verification is modeled as **a verified attribute of the profile, not a second
  login method** — Supabase's native phone-auth feature is designed for phone-as-identity
  login, which is not this product's model (a user still logs in with email+password; the
  phone number is a trust/contact signal). Reusing it would fight the tool. Twilio Verify
  is a purpose-built OTP-as-a-service (generates, rate-limits, and expires codes for us) —
  cheaper to integrate correctly than hand-rolling OTP storage/expiry/resend-cooldown
  logic ourselves.
- Roles (`familia` / `niñera` / `admin`) are **not** a Supabase Auth concept — they live in
  our own `profiles` table (1:1 with `auth.users.id`), set at registration (familia/niñera,
  self-selected on `AUTH-01`) or by manual provisioning (admin — no self-registration route
  exists, matching `information-architecture.md`).
- Session: Supabase Auth issues a JWT; Next.js middleware reads it server-side to gate
  `/familia/*`, `/ninera/*`, `/admin/*` route groups by role, redirecting role-mismatches
  home with the neutral banner UX/UI already specified (`UX-spec.md` Part C, `UI-SPEC.md`
  "Acceso no autorizado").

## 7. Application Hosting

**Decision: Vercel.** Native first-party fit for Next.js (zero-config builds, edge/
serverless function support, built-in Cron, preview deployments per PR — useful for
Functional/Visual QA review). Alternative considered: Render/Railway (also viable, slightly
cheaper at small scale, but lose Vercel's zero-config Next.js optimizations and built-in
Cron, and preview-deployment workflow is weaker) — not worth the marginal cost saving at V1
volume. Migration difficulty if ever needed: low — Next.js is not Vercel-proprietary;
moving to Render/Fly/self-hosted Node is a standard, well-documented path.

## 8. Storage Provider

**Decision: Supabase Storage**, private buckets only:
- `identity-documents` (ID photos) — **private**, never publicly readable, accessed only
  via short-lived signed URLs generated server-side after an authorization check (the
  niñera herself, or an admin, per §11's authorization matrix). See
  `engineering/security.md` for retention handling.
- `profile-photos` — niñera profile photos. Public-read (these are meant to be seen by
  families browsing), but uploads are authenticated and size/type-validated server-side.

## 9. External SaaS/PaaS Services (summary — full evaluation in §14 table)

Payments: Stripe. Transactional email: Resend. SMS/OTP: Twilio Verify (+ Twilio SMS for
pipeline-state notifications). Product/funnel analytics: PostHog. Error monitoring:
Sentry. Maps/zona data: **no paid geocoding vendor** — see §10.

## 10. Maps / Geolocation — a deliberate simplification

`design/UX-spec.md`'s "Zona" step calls for address/colonia autocomplete plus a small map
pin preview. A full geocoding vendor (Google Places/Geocoding, Mapbox) is **not** used for
V1:

- The matching engine's "Ubicación" factor (§15) needs a **discrete, comparable** value
  (does the niñera work in this alcaldía/municipio?), not a lat/long distance calculation.
  A free-text or precise-geocoded address is actually worse for this than a controlled
  vocabulary.
- **Decision:** seed a static `zonas` reference table (alcaldía/municipio + colonia,
  scoped to Clin's initial launch city, sourced from public INEGI/postal catalog data) at
  deploy time. Zona selection on both sides (necesidad + niñera's "zonas de trabajo") is an
  autocomplete **against this table**, not a live geocoding API call — zero per-request
  cost, zero external dependency for a core matching input, and a value the rules engine
  can directly equality/overlap-compare.
  - The map "pin preview" UX-spec calls for is a display-only affordance: render the
    selected zona's seeded centroid coordinates on a free OpenStreetMap-tile Leaflet map.
    No geocoding request is made; the pin is illustrative, not authoritative.
- **Migration path:** if Clin expands beyond its seeded cities/colonias, or needs true
  street-level geocoding (e.g. for a future delivery-radius feature), swap in Google
  Places/Mapbox at that point — the `zonas` table's `id` stays the FK; only the input
  method changes.

## 11. Admin Tooling

**Build in-app**, not a third-party internal-tool platform (Retool, Appsmith). V1 has
exactly two queues (`ADM-02` identity verification, `ADM-04` reports), both already fully
specified by UX/UI as ordinary Next.js pages behind the `admin` role guard. Standing up a
separate admin platform for two list+detail screens would be net-negative for V1 speed and
adds a vendor with no corresponding reduction in build effort. Revisit only if admin
tooling grows materially past what a small internal team needs from two queues.

## 12. Monitoring / Observability

- **Sentry** — error monitoring for both server and client code paths (one Next.js app, one
  Sentry project). Free tier is sufficient for V1 error volume.
- **Vercel** built-in request/function logs — sufficient for infrastructure-level
  observability (no separate log aggregator needed at V1 scale; revisit if/when log volume
  or retention needs exceed Vercel's included window).
- **PostHog** — product/funnel analytics (see `engineering/analytics.md`), not
  infrastructure monitoring — kept as a separate concern from Sentry/Vercel logs
  deliberately (product events vs. operational health are different audiences: founder/PM
  vs. engineer-on-call).
- **Operational health metric:** verification turnaround (`decided_at - submitted_at`) is
  tracked as data (see `engineering/analytics.md`) specifically so a growing admin backlog
  is visible as its own signal, per the addendum's Critical Issue #2 concern that it could
  otherwise masquerade as a demand-side problem.

## 13. Deployment Strategy

> **Build status (E0-06, 2026-09-03):** `nanamex-dev` and `nanamex-preview` Supabase
> projects are provisioned (see `agent/DECISIONS.md` "2026-09-03 — E0-06 prerequisites").
> There is still no dedicated `nanamex-prod` project — the Vercel **Production**
> environment is deliberately pointed at `nanamex-dev`'s credentials for now (explicit
> human-directed decision, flagged as a pre-`RELEASE_GATE` open item, not a permanent
> choice). The Vercel project (`nanamex`, org `andres-projects-5977be21`) is linked to
> `github.com/andresgi/venture-automata` with **Root Directory** `projects/nanamex`, so
> builds correctly scope to this subdirectory of the monorepo. Every PR against `main`
> gets an automatic preview deployment (Vercel comments the URL on the PR); production
> deploys are prevented from happening automatically on merge via the project's **Ignored
> Build Step** (`if [ "$VERCEL_ENV" == "production" ]; then echo "Skipping automatic
> production deploy — production is a manual promotion (E0-06)."; exit 0; else exit 1;
> fi` — skips the build whenever the deployment target is `production`, regardless of
> trigger). The only way to put a build live in production is `vercel promote
> <deployment>`, re-aliasing an already-built (and already-reviewed) deployment onto the
> production domain without triggering a new build — a genuine manual promotion. See
> `README.md` "Deployment (Vercel)" for the full current state, including a disclosed
> incident where one of this story's own CLI commands was itself classified as a
> production-target deployment (Vercel's documented "a new project's first deployment is
> always Production" behavior) and failed for an unrelated Root-Directory reason before
> ever serving anything — and why that specific failure mode does not carry over to a
> real GitHub-triggered build.

- Single environment split: `production` and `preview` (Vercel's per-PR preview
  deployments, pointed at a separate Supabase project used as a staging DB — never share a
  DB between preview and production, especially given ID-document sensitivity).
  `development` is local (Supabase local CLI or a personal dev Supabase project).
- Migrations: SQL migration files under `db/migrations`, applied via Supabase CLI in CI
  before each deploy. No ORM-managed "auto-migrate on boot" — migrations are explicit,
  reviewed, and reversible.
- CI: lint, typecheck, unit/integration tests, `next build` on every PR (per AGENTS.md
  Implementation Rules) before merge; deploy to `production` only from `main`, manually
  promoted (no auto-deploy-on-merge for V1, given AGENTS.md's "never deploy to production
  without explicit human approval").
- Secrets: Vercel environment variables (per-environment), never committed; Stripe/Twilio/
  Resend/Supabase service-role keys are server-only env vars, never exposed to
  `NEXT_PUBLIC_*`.

## 14. Technology and Service Decisions

| Capability | Options Considered | Recommended | Why | MVP Cost | Main Tradeoff | Migration Difficulty |
|---|---|---|---|---|---|---|
| Application hosting | Vercel; Render/Railway | **Vercel** | Zero-config Next.js fit, built-in Cron, preview deploys for QA | Free/Hobby tier for dev; ~$20/mo Pro for prod (reverify) | Some platform-specific conveniences (Cron, image optimization) | Low — standard Next.js, portable |
| Database | Supabase Postgres; Neon + separate auth/storage | **Supabase** | One vendor for DB+Auth+Storage, less integration surface for a small team | Free tier for dev; ~$25/mo Pro for prod (reverify) | Some Supabase-specific conventions (RLS, Storage policies) to learn | Medium — Postgres itself is portable; GoTrue/Storage are open-source, self-hostable if needed |
| Authentication | Supabase Auth; Clerk; Auth.js (self-managed) | **Supabase Auth** | Bundled with chosen DB, avoids a second user-identity system to reconcile; GoTrue is open-source (real exit path) | Included in Supabase plan | Less polished pre-built UI than Clerk (we're building our own UI anyway per UI-SYSTEM) | Low-medium — GoTrue self-hostable |
| Phone OTP | Twilio Verify; hand-rolled OTP + generic SMS API | **Twilio Verify** | Purpose-built OTP lifecycle (generation, expiry, resend cooldown, rate-limit) — much less custom code than hand-rolling | Pay-per-verification, low volume in V1 (reverify current per-verification price) | Another vendor beyond Supabase | Low — swappable for another OTP provider behind our own thin interface |
| Transactional SMS (notifications) | Twilio; Vonage | **Twilio** | Same vendor as OTP, one integration, also offers WhatsApp API as a documented future path (users' existing mental model) | Pay-per-message, low V1 volume | Cost scales with notification volume | Low |
| Transactional email | Resend; Postmark; SES | **Resend** | Best Next.js/React Email DX, generous free tier, fast to integrate for an agent-built codebase | Free tier likely covers V1 volume (reverify current free-tier cap) | Newer vendor than Postmark/SES (less operating history) | Low |
| Payments | Stripe; Mercado Pago | **Stripe** | Best-documented API/webhooks, most reliable for agent-driven implementation, supports MXN and OXXO for Mexican consumers | Standard per-transaction fee, no fixed cost | Mercado Pago may convert better with MX consumers used to it, especially for cash/OXXO payers | Medium — payment integration rework if switched |
| Object storage (ID docs, photos) | Supabase Storage; Cloudflare R2 / S3 | **Supabase Storage** | Same vendor as DB/Auth, policy-based private buckets, signed URLs | Included in Supabase plan (usage-based beyond free tier) | Less mature than raw S3 tooling ecosystem | Low — S3-compatible API |
| Maps / zona data | Google Places/Geocoding; Mapbox; static seeded reference table | **Static seeded `zonas` table** (§10) | Matching needs a discrete comparable value, not lat/long; zero per-request cost/dependency | $0 | Manual reseed effort when expanding to a new city | Low — swap to a geocoding vendor later without changing the FK model |
| Identity verification | Automated KYC vendor (Truora/Metamap); manual admin review | **Manual admin review** (fixed by `config/CONSTRAINTS.md`) | Explicit founder decision, not reopened here | Operator time only | Slower, bounded by human throughput (24–48h SLA target) | N/A — explicit V1 constraint |
| Product/funnel analytics | PostHog; Mixpanel; Amplitude | **PostHog** | Funnel/cohort features fit the addendum's "found match vs. contacted" split directly; open-source exit path | Free tier likely covers V1 event volume (reverify current cap) | Less polished than Amplitude for advanced analysis | Low — open-source, self-hostable |
| Error monitoring | Sentry; Bugsnag | **Sentry** | Industry standard, best Next.js SDK integration | Free tier sufficient for V1 error volume | — | Low |
| Admin tooling | Retool/Appsmith; build in-app | **Build in-app** | Only 2 small queues; a third-party internal-tool platform is unjustified overhead at this scope | $0 (dev time only) | More admin UI code to write ourselves | N/A |
| Background jobs | Vercel Cron; BullMQ+Redis | **Vercel Cron** | Only one true scheduled job in V1 (doc retention purge); everything else computed at read time | Included with Vercel | No job-retry/observability tooling beyond Vercel's logs | Low — swap for a queue if job complexity grows |

## 15. Match Score Algorithm (resolves addendum item — hard filters, weights, threshold)

This is the concrete rule table `product/prd-addendum.md` requires before the matching
engine is built. Fully rules-based per PRD section 6 ("en V1 el matching puede ser
completamente basado en reglas, sin necesidad de IA") — implemented as plain TypeScript/SQL,
no ML model, no external scoring service.

### 15.1 Hard filter (excludes a niñera from a necesidad's results entirely)

| Filter | Rule |
|---|---|
| **Modalidad** | Niñera's `modalidades_aceptadas` must include the necesidad's `modalidad`. A niñera who doesn't do "planta" work is never shown for a "planta" necesidad — this is a category mismatch, not a degree-of-fit question. |

Only one hard filter. Everything else is a weighted factor, so a thin-supply zona/salary
mismatch still surfaces a ranked (if lower-scored) candidate rather than an empty list —
this directly protects against the addendum's named risk of an unvalidated algorithm
silently starving supply-side liquidity. This also matches the PRD's own worked example:
of the six section-6 factors, "modalidad" is the only one **not** shown as a checklist
line in the "María — 92% compatible" example — i.e. it's already guaranteed true for
everyone shown, consistent with being the hard filter.

### 15.2 Weighted factors (sum to 100; each also renders as a ✓ checklist line when it passes — never a ✗, matching `UI-SYSTEM.md`'s "no failure iconography on MatchScore" rule)

| Factor | Weight | Pass condition |
|---|---|---|
| Ubicación | 25 | Niñera's `zonas_de_trabajo` includes the necesidad's `zona` (alcaldía/municipio-level match — see §10). |
| Disponibilidad | 25 | Niñera's declared availability covers **every** day requested by the necesidad, with an overlapping time window on each. |
| Expectativa salarial | 20 | Niñera's `[salario_min, salario_max]` overlaps the necesidad's `[pago_min, pago_max]` (any intersection counts — no partial-credit scaling in V1). |
| Edad de los niños | 15 | Niñera's `experiencia_edades` (set of age ranges) intersects the necesidad's set of children's age ranges (at least one shared range). |
| Experiencia requerida | 15 | Niñera's `años_experiencia` ≥ 2 (a fixed, documented V1 constant — a general competency floor, not a family-set field, since PRD section 5 gives the family no explicit "years required" input). |

`Match Score % = Σ(weight_i × pass_i)`. Score is computed at **query time** for the live
ranked list (`FAM-04`, `NIN-04`/`NIN-05`) — cheap (bounded candidate set per zona, plain
arithmetic), no precomputation/caching needed for V1 volume.

### 15.3 Minimum "compatible" threshold

**Decision: 60%.** Used for two things only — never as a visibility cutoff (UX explicitly
decided low-score matches are still shown, ranked, with no artificial threshold hiding
them — `UX-spec.md` FAM-04 "Partial (few, low-score matches)"):

1. **Analytics.** `product/prd-addendum.md` requires a distinct "encontró candidata
   compatible" event. This event fires only when a family opens a matched profile (`FAM-06`)
   whose score is **≥ 60**, giving the North Star's diagnostic split a precise, non-arbitrary
   definition instead of "any profile view at all." See `engineering/analytics.md`.
2. **Copy**, if product ever wants to visually distinguish "compatible" language from
   merely-ranked language on a card — not required by the current UI-SPEC, which
   deliberately shows the numeral with no extra label; noted here so the constant is
   defined once, in one place, for whichever surface needs it.

Rationale for 60 specifically: three of five weighted factors are more fundamental to a
workable arrangement (ubicación 25 + disponibilidad 25 + salario 20 = 70 max from just
those three); 60 requires passing most of the "does this arrangement work logistically"
weight without requiring both experience-related factors, which are legitimately
softer/nice-to-have signals per the PRD's own example (a family might reasonably still want
to interview someone missing one experience checkmark). This is a documented, adjustable
constant (`MATCH_COMPATIBLE_THRESHOLD`), not a hardcoded magic number — tune post-launch
against real conversion data per `product/prd-addendum.md`'s "Not addressed" section
(Match Score weighting evidence is explicitly named as an unvalidated assumption to revisit).

### 15.4 Ranking and tie-break

Sort: Match Score desc → niñera profile-completeness % desc → niñera `created_at` asc
(stable, fair ordering for equally-good matches) → niñera `id` asc (deterministic
final tie-break). **Verification status is never used as a ranking or tie-break input,**
by design — using it even as a tie-break would be a small but real form of the
deprioritization the addendum explicitly forbids for unverified-but-pending profiles.

## 16. Paywall / Entitlement Mechanics (resolves addendum item)

`product/prd-addendum.md` explicitly assigns this to TECH_ARCHITECTURE. These are product
decisions with real business consequences (pricing/packaging), made here because the
addendum assigned them here — flagged clearly so the human can override at ARCHITECTURE_
GATE if a different mechanic is preferred.

### 16.4 Checkout persistence and retry boundary (E5-01)

Checkout initiation first inserts one durable `payments` row in `pendiente`. That row owns a
unique `idempotency_key`; a partial unique index permits only one pending purchase per family.
A short `checkout_claimed_at` lease lets only one concurrent request call Stripe. The same key
is passed to Stripe, and the row id plus family id are sent as Stripe metadata. Stripe's
Checkout `expires_at` is normalized and persisted in `provider_session_expires_at`; a stored
URL is reused only after Stripe reports the session `open` and unexpired; known-expired sessions
are never returned.

If Stripe creates a session but linking its id/URL back to the row fails, the server re-reads the
row before deciding whether to compensate (it never expires a row already finalized), retries
the link, and otherwise expires the session. It persists `expired` and rotates the idempotency
key before allowing a new attempt. If expiration fails, it preserves the provider ID/URL as
`unknown` and does not rotate the key, so retry re-checks the same session rather than creating
a second chargeable session. If that final write is unavailable, the request fails closed;
the original idempotency key is not rotated. Stripe's idempotency record and the session's
`payment_boundary_id` metadata are the durable provider-side fallback: a later retry recreates
idempotently, retrieves the returned session, and links/returns it only when Stripe reports
`open` with a present future expiry. E5-02 must reconcile by `provider_payment_id` or that
metadata, and must never activate from a URL alone.

**Stale success-return policy (E5-04):** a `pendiente` boundary is considered stale only when
its local `created_at` is more than 30 minutes old. Recent boundaries remain in the
server-backed `pending`/finalizing state so a normal delayed webhook is not interrupted. For
an old boundary, the return handler re-reads Stripe when a provider session ID exists: an
`open` unexpired session is expired at Stripe before cleanup, `complete` remains finalizing,
and provider errors fail closed without mutation. Only a Stripe-confirmed `expired` session
(or a boundary that never reached Stripe) may be marked `fallido`, with its stored URL
cleared. This grants no entitlement; the client routes the revisited success URL back to the
candidate paywall/new-contact path so a fresh checkout can be started. The webhook remains
the sole authority for successful entitlement activation.

### 16.1 What "Contactar" unlocks

**Decision: one entitlement type in V1 — `contacto_30d` (MX$299), account-wide, uncapped
contact count, 30 days from activation.**

- **Account-wide, not per-necesidad.** The offer copy ("contacta candidatas durante 30
  días," plural) and `FAM-02`'s multi-necesidad dashboard both imply a family managing
  several necesidades shouldn't have to buy the unlock again per necesidad within the same
  window. One active entitlement row per family; `Contactar`/`Solicitar entrevista` checks
  `entitlements.expires_at > now()` for that family, regardless of which necesidad the
  candidate is attached to.
- **Uncapped within the 30-day window**, not a fixed number of contacts. A per-contact cap
  would need an additional counter mechanic the PRD/addendum never asked for, and the
  "durante 30 días" framing reads as a time-boxed window, not a quota. This is the simpler
  V1 build and the more generous reading for the family — cheap to add a cap later (one
  counter column + a check) if abuse/margin data post-launch says otherwise.
- **Stacking on repurchase:** if a family buys again while already entitled, the new 30
  days is added to the current `expires_at` (not overlapping/duplicate rows), so a renewal
  never shortens what they already had.

### 16.2 What happens to in-progress conversations at expiration

**Decision: entitlement gates the *act* of starting a new contact (`FAM-10`'s "Solicitar
entrevista" / creating a new `Contacto` record), not retroactive access to a contact
already made.** Once a family has successfully contacted a candidate (pipeline state
advances Nueva → Contactada), the revealed contact info and pipeline history for **that**
candidate remain visible to the family permanently, even after the entitlement expires —
revoking already-shared contact information is neither enforceable (the family already has
the phone number) nor a reasonable UX (it would look like data loss, not an expired
subscription). Expiration only blocks contacting **new, not-yet-contacted** candidates
until the family re-purchases.

### 16.3 What "verificaciones adicionales" (premium tier, MX$499–699) concretely adds

**Architecture decision: do not build the premium tier in V1.** `config/CONSTRAINTS.md`
forbids an automated KYC vendor, and PRD section 5's "Confianza y seguridad" defines only
three trust mechanisms for V1 (phone/email OTP, manual identity verification, self-reported
references) — none of which describes a second, *additional* verification tier beyond the
one badge already being built. There is no approved V1 capability for "verificaciones
adicionales" to concretely consist of; inventing one now (e.g. a second manual-review pass,
a background-check integration) would silently expand SOP operational scope and/or
reintroduce an automated-KYC vendor the founder explicitly rejected.

**This is flagged, not silently decided as a feature choice:** the premium price tier
should not be offered for real payment in V1 until product defines what it concretely
includes. Recommendation to the human at ARCHITECTURE_GATE: either drop the MX$499–699 tier
from V1 entirely (simplest, matches "niñeras gratis / familias pagan para contactar" as the
one paid mechanic), or send it back through a short PRODUCT_STRATEGY-style decision before
BUILD scopes it. The data model (`entitlements.tier`) is designed as an enum so adding a
second tier later is a small, additive change — not a rebuild.

## 17. Necesidad Editing After Contacts Exist (resolves UX-spec.md Part E item 6)

**Decision:** A necesidad remains editable at any time, including after it has contacted
candidates in its pipeline. Fields split into two behaviors:

- **Always freely editable, no side effects:** `fecha_de_inicio` (if still in the future),
  `responsabilidades_esperadas`, free-text notes.
- **Matching-relevant fields** (`zona`, `modalidad`, `rango_de_pago`, `días_y_horarios`,
  children's age ranges): editable, and triggers **live re-matching going forward** — the
  ranked list (`FAM-04`) and any *not-yet-contacted* pipeline record (state = `Nueva`)
  reflect the new criteria immediately. **Already-contacted pipeline records (Contactada,
  Entrevista, Contratada, Descartada) are never retroactively altered or removed** — each
  `pipeline` row stores a **frozen snapshot** (`match_score_snapshot`,
  `match_checklist_snapshot`, jsonb) captured at the moment the record was created (first
  favorite/profile-view, per the existing IA decision). A family editing a necesidad never
  sees a contacted candidate's score change or disappear from their pipeline — that
  candidate's relevance was locked in at the moment of engagement, which is also what the
  addendum's own analytics events are keyed off (§`engineering/analytics.md`).
- If an edit makes a previously-contacted niñera now fail the hard filter (e.g. modalidad
  changed), her existing pipeline record is unaffected; she simply won't reappear in future
  `FAM-04` ranking runs for that necesidad.

## 18. Badge Integrity on Profile Edits After Verification (resolves UX-spec.md Part E item 7)

**Decision:** Split profile fields into **identity-relevant** (display name, profile
photo) and everything else.

- Editing **non-identity fields** (disponibilidad, expectativa salarial, descripción,
  referencias, zonas de trabajo, años de experiencia) never affects `verification_status`.
- Editing an **identity-relevant field** (name or photo) after `verification_status =
  verificada` sets it to `en_proceso` and re-queues the niñera into `ADM-02` flagged as a
  **re-review** (`identity_verifications.reason = 're-revisión por edición de perfil'`),
  reusing her existing on-file document — she is not required to re-upload a new ID.
  Rationale: the concern is that the publicly displayed identity may no longer match the
  approved document, not that verification never happened; resetting all the way to
  `no_verificada` (or demanding a fresh document) would be punitive and inconsistent with
  the product's "honest, not alarmist" register (`UI-SYSTEM.md` §0.2). The niñera stays
  visible/matchable throughout the re-review, exactly as any other `en_proceso` profile
  does per the addendum's Critical Issue #2 resolution.
- Admin's `ADM-03` review of a re-review case shows the same stored ID image side-by-side
  with the *new* stated name/photo, so the operator is explicitly comparing against what
  changed.

## 19. Explicitly Unresolved Items (not decided here — flagged for human/legal input)

- **Identity document retention/deletion period.** `config/CONSTRAINTS.md` marks this an
  open human/legal decision. The system is built to support whatever period is eventually
  set (env-configurable retention job, see `engineering/security.md` §"Retention") but **no
  default period is invented here**. This must be resolved before real user ID documents
  are collected in production (before RELEASE_GATE), not before BUILD/UX/UI use test data.
- **Premium tier scope** (§16.3) — recommend the human decide whether to drop it from V1 or
  define it properly before it's sold for real money.

## 20. Interfaces

### Server actions (primary interface; grouped by domain)

- `auth`: register, verify-email (handled by Supabase), request-phone-otp, confirm-phone-otp
- `necesidades`: create, update (draft + published, with re-match trigger per §17), publish,
  close (contratada/cancelada)
- `matching`: computeMatches(necesidadId) — internal, called on publish/edit/list-view, not
  exposed as a public API
- `candidatas`: favorite/unfavorite, viewProfile (fires analytics event, creates pipeline
  record if absent)
- `pipeline`: advanceState, discard, (contact creation is via the `entitlements` action, not
  a free-standing pipeline transition — see §16.2)
- `entitlements`: checkEntitlement, createCheckoutSession (Stripe), confirmContact (post
  -payment, creates the `Contacto`/pipeline advance)
- `interes`: showInterest (niñera), dismiss
- `verificacion`: submitIdentityDocument, adminApprove, adminReject
- `reportes`: fileReport, adminResolve (descartar/advertir/suspender/eliminar)

### API routes

- `POST /api/webhooks/stripe` — payment success/failure → activates/records entitlement
- `POST /api/cron/purge-identity-documents` — retention job (§19; no-ops until a policy is
  configured), invoked by Vercel Cron, protected by a shared-secret header
- `POST /api/twilio/status` — optional delivery-status callback for SMS notifications (best
  -effort logging only, not on any critical path)

### Background processing

Only the retention purge cron (§19). SLA color-coding and entitlement-expiry checks are
computed at read time (§4) — no background job required for either.

### Integrations / webhooks

Stripe (checkout + webhook), Twilio (Verify API + SMS send), Resend (transactional email,
called directly from server actions — no webhook needed inbound), PostHog (event capture,
client + server SDK), Sentry (SDK, no inbound webhook needed for V1).
