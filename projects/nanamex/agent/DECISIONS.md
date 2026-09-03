# Decision Log

Important product, technical, operational, and workflow decisions are recorded here.

Do not record trivial implementation choices.

---

## 2026-08-31 — Project Initialization complete

Venture "Nanamex" (product name "Clin") initialized from a founder-supplied PRD (saved to
product/prd.md verbatim). config/PROJECT.md, config/CONSTRAINTS.md, and config/WORKFLOW.md
populated. Three decisions were confirmed with the human before populating config:

1. **DISCOVERY and BENCHMARK: disabled for V1.** The PRD is the founder's hypothesis, not
   market-validated evidence. Given the choice to run Discovery/Benchmark first vs. skip
   straight to PRODUCT_GATE, the human chose to skip. PRODUCT_STRATEGY is marked `provided`
   (not `enabled`) — the Product Manager will not author the PRD from scratch; instead
   Product Critic reviews it once in review-only mode (see backlog item PS-001) before
   PRODUCT_GATE.
2. **Tech stack: Next.js + TypeScript**, single web application (web only — no native mobile
   app per PRD non-goals, no separate backend service planned for V1).
3. **Identity verification for V1: manual admin review**, not an automated KYC vendor. The
   niñera uploads an ID photo; a human operator reviews it and manually sets the "Identidad
   verificada" badge. No third-party KYC integration (e.g. Truora, Metamap) in V1.

Follow-on open item (not a blocker for BUILD, but must be resolved before RELEASE_GATE):
retention/deletion policy for uploaded ID documents has not been defined. Flagged in
config/CONSTRAINTS.md "Legal / Data Constraints" and agent/STATE.md "Human Blocker" — needs
explicit human/legal confirmation before real user data is collected in production.

Also decided: SUPPLY_GROWTH and DEMAND_GROWTH are `optional` (not required for V1 COMPLETE);
GROWTH is `disabled` in favor of those two, since Clin is a two-sided marketplace. BRAND is
`enabled` but folded into UI Designer's work (no dedicated Brand agent, and the product name
"Clin" already exists from the PRD).

## 2026-08-31 — PS-001: Product Critic review of PRD, verdict REVISE, accepted with addendum

Product Critic reviewed product/prd.md in review-only mode (agent/qa/prd-review.md).
Verdict: REVISE, citing two critical issues and six "Important" issues. Orchestrator brought
both critical issues to the human directly (not resolved unilaterally, per Failure Rules —
"decision requiring business judgment"). Human decisions:

1. **North Star metric vs. paywall confound**: keep the MX$299 paywall as scoped, but
   instrument the funnel to separately track "found a compatible match" vs. "contacted a
   candidate," so payment friction doesn't get misread as a matching/trust failure. Recorded
   in product/prd-addendum.md.
2. **Manual verification SLA/visibility**: target 24–48h turnaround; unverified niñeras
   remain visible/matchable while pending (badge appears only once approved). Recorded in
   product/prd-addendum.md.
3. **Remaining six "Important" issues** (Match Score weights, paywall feature-gating
   mechanics, niñera self-serve browsing, referencias verified-vs-self-reported, reported-
   profile interim handling, "rango de edad" wording): accepted as explicit spikes, deferred
   to the owning downstream phase (UX, TECH_ARCHITECTURE, SOP) rather than resolved now.
   Each is listed individually in product/prd-addendum.md and must be explicitly answered by
   its owning phase — not silently invented — before that phase's artifact is done.

**PRODUCT_STRATEGY phase accepted as-is (PRD + addendum), not sent back for a rewrite.**
product/prd.md remains unmodified; product/prd-addendum.md is the authoritative supplement
downstream phases must also read.

## 2026-08-31 — PRODUCT_GATE approved

Human explicitly approved PRODUCT_GATE: "Sí, apruebo PRODUCT_GATE, continúa." Basis:
product/prd.md + product/prd-addendum.md (see PS-001/PS-002 in agent/BACKLOG.md). PRODUCT_
STRATEGY phase marked VERIFIED. BRAND/UX/UI/TECH_ARCHITECTURE work may now begin. Per
config/WORKFLOW.md ordering, proceeding with UX first (journeys/IA/screen inventory), then UI
(with BRAND folded in per earlier decision), then TECH_ARCHITECTURE.

## 2026-08-31 — UX phase VERIFIED

UX Designer produced design/journeys.md, design/information-architecture.md,
design/screen-inventory.md, design/UX-spec.md (UX-001), explicitly resolving all five UX
decisions delegated by product/prd-addendum.md (niñera hybrid discovery model, referencias
visual distinction, three-state pending-verification treatment, paywall gate scoped to
contact/interview-request only, admin-internal reported-profile handling).

UX Critic reviewed (UX-002, agent/qa/ux-review.md): PASS_WITH_MINOR_ISSUES. Two "Important"
internal-consistency issues found (email/phone verification hard-gate-vs-soft-gate
contradiction between journeys.md and screen-inventory.md; ambiguity in information-
architecture.md/UX-spec.md over when a Pipeline record is created relative to the
addendum's "found a match" vs. "contacted" event split) plus minor issues (FAM-10 message
field vs. no-chat non-goal, missing confirm step on admin "Eliminar cuenta").

Orchestrator judgment: issues were narrow and mechanical (contradictions between documents,
not design gaps), so sent back to UX Designer for a direct fix pass rather than a full
revision cycle. Fixes applied: verification gate resolved as a soft gate (necesidad creation
allowed pre-verification; required before contacting); Pipeline record now explicitly created
on first favorite/full-profile-view (state=Nueva), not only at contact, matching the
addendum's event-tracking need; minor issues fixed; three new open items flagged for
TECH_ARCHITECTURE in UX-spec.md Part E (mid-flow necesidad editing after contacts exist,
badge integrity on profile edits after verification, niñera decline-signal scope).

Given the narrow, mechanical nature of the fixes (document-consistency corrections, not new
design decisions), orchestrator accepted the result without a second full UX Critic cycle.
**UX phase marked VERIFIED.** Proceeding to UI (with BRAND folded in).

## 2026-09-01 — UI phase (with BRAND folded in) VERIFIED

UI Designer produced design/UI-SYSTEM.md and design/UI-SPEC.md (UI-001): warm/editorial
visual direction (Inter + Fraunces, terracotta accent, flat elevation), covering all 37
screens in design/screen-inventory.md, with the four UX-decision-critical treatments
(three-state TrustBadge, un-badged referencias, non-alarming paywall gate, weight-agnostic
Match Score) explicitly designed.

UI Critic reviewed (agent/qa/ui-review.md): PASS_WITH_MINOR_ISSUES. Confirmed the 37-screen
coverage was legitimate (screen-inventory.md actually lists 37, not 40 as originally
assumed in the review brief — corrected here for the record). Found two "Medium" issues
touching trust-signal integrity (TrustBadge geometry claim vs. NIN-03/NIN-08 specs
contradicting each other; AUTH-03 reusing the reserved trust hue, diluting the badge
system's scarcity principle) plus three minor items (breakpoint mismatch, child-imagery
rule ambiguity, missing "permission denied" state spec).

Orchestrator judgment: same pattern as UX — issues were narrow document-consistency
corrections and one color-token substitution, not new design decisions, so sent back to UI
Designer for a direct fix pass rather than a full revision cycle. All five issues resolved:
TrustBadge documented as color/icon/label-invariant with intentional scale variants (compact/
banner/large-standalone) rather than claiming pixel-identical geometry; AUTH-03's
verification-success state now uses a neutral treatment instead of the reserved trust hue;
breakpoint reconciled to ≥1280px for 3-column desktop layouts; no-child-imagery rule
clarified to cover landing/marketing photography explicitly (privacy/safety reasoning); a
"permission denied" cross-cutting state spec added.

Accepted without a second full UI Critic cycle given the narrow, mechanical nature of the
fixes. **UI phase (BRAND folded in) marked VERIFIED.** Proceeding to TECH_ARCHITECTURE —
ARCHITECTURE_GATE (human approval) required before BUILD begins.

## 2026-09-01 — TECH_ARCHITECTURE phase complete, awaiting ARCHITECTURE_GATE

Technical Architect produced engineering/architecture.md, database.md, security.md,
analytics.md, implementation-plan.md (TA-001). Stack: Next.js/TypeScript, web-only, no
separate backend (per config/CONSTRAINTS.md); Supabase (Postgres/Auth/Storage), Vercel,
Stripe, Twilio, Resend, PostHog, Sentry as vendor choices, each justified against V1 load.

All 8 items explicitly deferred to this phase were concretely resolved: Match Score rule
table (1 hard filter + 5 weighted factors, 60% compatibility threshold, verification status
excluded from tie-break to avoid implicit deprioritization); paywall/entitlement mechanics
(account-wide 30-day uncapped `contacto_30d`, MX$299, stacking); funnel analytics split
(`compatible_match_found` vs `candidate_contacted` as distinct events, implementing the
addendum's North Star fix); verification workflow data model (3-state enum, niñeras stay
`publicado` while `en_proceso`); mid-flow necesidad editing (live re-match, frozen snapshots
on already-contacted pipeline rows); badge integrity (identity-field edits reset to
`en_proceso` for re-review, non-identity edits don't); children's data (age-range enum only,
no exact-age/birthdate column anywhere in the schema — structurally enforced); ID-document
retention explicitly left unresolved (env-gated no-op purge job, flagged again as a
RELEASE_GATE blocker, not invented).

No dedicated Technical Architecture Critic role exists in this project's catalog.
Orchestrator performed the independent verification pass directly: PASS_WITH_MINOR_ISSUES.
Found one Important gap (security.md and implementation-plan.md referenced an
`identity_document_access_log` audit table that database.md's schema never actually
defined) and one Minor gap (admin MFA recommended in security.md but no corresponding
implementation-plan story or explicit deferral note). Both fixed directly by Technical
Architect: table added to database.md §10a; admin MFA explicitly noted as deferred to a
pre-RELEASE_GATE checklist item, not BUILD-blocking.

**Additional item surfaced by the Architect for human judgment, not resolved
unilaterally**: PRD section 7 lists a MX$499-699 "búsqueda premium" tier as part of V1
monetization (marked "Ejemplo"), but no PRD/UX/UI requirement defines what it actually
contains. The Architect did not build it and recommends either dropping it from V1 or
defining its scope before selling it.

**Human decision: dropped from V1.** Only the base `contacto_30d` tier (MX$299/30 days,
uncapped) is built. Recorded in product/prd-addendum.md. Architecture/implementation-plan
already reflect this (premium tier was never built), so no engineering docs need revision.

**ARCHITECTURE_GATE: not yet approved.** Human requested to review
engineering/architecture.md, database.md, security.md, analytics.md, and
implementation-plan.md before deciding. Awaiting that review — do not begin BUILD.

## 2026-09-02 — ARCHITECTURE_GATE approved

Human explicitly approved: "I approve technical architecture." Basis: engineering/
architecture.md, database.md, security.md, analytics.md, implementation-plan.md (TA-001),
independently verified by the orchestrator 2026-09-01 (PASS_WITH_MINOR_ISSUES, both gaps
fixed). TECH_ARCHITECTURE phase marked VERIFIED. BUILD may now begin.

## 2026-09-02 — E0-02: Supabase preview/prod project creation deferred (dev only for now)

During E0-02 (Supabase project setup), the Developer created `nanamex-dev` (ref
`rgqncanghlvlzrzlgkzi`, São Paulo/`sa-east-1`) but stopped before creating
`nanamex-preview`/`nanamex-prod`. Reason: the Supabase org already holds two unrelated
pre-existing projects (`clin-be`, `diamora` — confirmed unrelated to this venture, not to be
touched); creating `nanamex-dev` as a 3rd project succeeded with no free-tier warning,
suggesting the org may be on a paid plan where each additional project carries incremental
cost (~$10/mo order of magnitude), which the Developer could not confirm via the CLI. Per
AGENTS.md Failure Rules ("decision requiring business judgment"), this was escalated to the
human rather than guessed.

**Human decision: skip preview/prod project creation for now — dev only.** E0-02's
migrations pipeline should be built/validated against `nanamex-dev` only.
`nanamex-preview`/`nanamex-prod` creation is deferred to a later point (human will decide
when, likely tied to actually needing a preview/production deploy). E0-06 (Vercel
deployment pipeline) and any story assuming a preview/prod Supabase instance should treat
this as an open dependency, not build against instances that don't exist yet.

## 2026-09-02 — E0-03: V1 launch city confirmed as Monterrey

During E0-03 (core schema migration), the Developer flagged that no launch city is
specified anywhere in product/prd.md, config/PROJECT.md, or config/CONSTRAINTS.md, and
made a judgment call to seed `zonas` with Ciudad de México data. Per AGENTS.md Failure
Rules ("decision requiring business judgment"), this was escalated to the human rather
than silently accepted.

**Human decision: V1 launches in Monterrey, not CDMX.** The Developer's CDMX seed data
must be reworked to cover Monterrey's municipios/colonias instead before E0-03 is marked
VERIFIED. `config/PROJECT.md` should also be updated to record Monterrey as the launch
city so this doesn't need re-deriving later.

## 2026-09-02 — E0-03 VERIFIED

Developer implemented `engineering/database.md` §1–4 as SQL migrations (`profiles`,
`perfil_familiar`, `perfil_ninera` + `ninera_experiencia_edades`/`ninera_zonas`/
`referencias`, `zonas`, and all 5 enums including `rango_edad`), plus a `zonas` seed script
for the launch city. Code Reviewer round 1: REVISE — found 5 Important issues (RLS gaps
letting a niñera self-set `verification_status`/`publicado`, a profile self-set
`email_verified`/`phone_verified`, admin self-provisioning at insert, an `on delete cascade`
against `auth.users` conflicting with the "never hard-delete" retention design, and a
missing automated CI check for the seed row-count acceptance criterion) plus minor issues.
Developer fixed all required items in a new follow-up migration
(`20260902000007_security_hardening.sql`, not editing the already-hosted-pushed
000004/000006 files) plus the CI check and a stale CDMX comment. Code Reviewer round 2:
**PASS_WITH_MINOR_ISSUES** — independently verified each fix at the code level, no new
issues, only one trivial doc lag (README migration count) which the orchestrator fixed
directly. Full history in agent/reviews/code-E0-03-review.md.

Migrations (`20260902000002`–`20260902000007`) pushed to hosted `nanamex-dev`
(ref `rgqncanghlvlzrzlgkzi`), confirmed applied via `supabase migration list --linked`.
Hosted `nanamex-dev`'s `zonas` table has the correct schema but the seed has not yet been
run against it (no remote DB credentials in the Developer's session) — not a blocker for
E0-03's stated acceptance criteria, open item for whenever hosted dev data is actually
needed (e.g. E0-04+ manual testing).

**Launch city confirmed as Monterrey** (see the dedicated entry above) — the `zonas` seed
covers 9 Monterrey-metro municipios (36 rows total), not CDMX.

**E0-03 marked VERIFIED.** E0-04 (Auth wiring) is now unblocked.

## 2026-09-02 — E0-04: correo verification redefined as a hard login gate

While implementing E0-04 (auth wiring), the Developer found a real conflict between two
already-VERIFIED artifacts: `engineering/architecture.md` §6 instructs using Supabase
Auth's built-in email-confirmation flow, but that flow empirically blocks all sign-in (no
session at all) until the link is clicked — while `design/journeys.md` (J-FAM-1) and
`design/UX-spec.md` (AUTH-03) design verification as a **soft gate**, letting a family
browse/create a necesidad before confirming either channel. These are incompatible as
originally written: a user cannot obtain a session pre-confirmation under Supabase's native
gate, so "browse before confirming" is not actually reachable. Per AGENTS.md Failure Rules
("architectural decision with significant downstream consequences"), this was escalated to
the human rather than resolved unilaterally by the Developer, who correctly implemented the
literal architecture.md instruction and flagged the conflict instead of inventing a fix.

**Human decision: keep Supabase's native email-confirmation gate (no code change needed —
matches E0-04 as already built). Redefine "soft gate" to apply to teléfono only.** Correo
becomes a hard gate at login (cannot log in at all pre-confirmation, no in-app degraded
state is reachable); teléfono verification remains the original soft gate (can log in,
browse, and create a necesidad with teléfono unverified; blocked only at the paywall/
contact step). `design/journeys.md` (J-FAM-1) and `design/UX-spec.md` (AUTH-03) updated to
reflect this redefinition, plus a new documented AUTH-04 error state ("confirma tu correo"
inline message + resend action on a pre-confirmation login attempt, since that's now the
only place a user discovers the block). This is a narrow correction to already-VERIFIED UX
artifacts, not a full UX revision cycle — same pattern as prior post-review consistency
fixes.

**Downstream implication for E1-02** (which explicitly owns finalizing this soft-gate
behavior per implementation-plan.md): E1-02 should build against teléfono-only soft-gating;
correo-gating is already fully handled by E0-04's login flow and needs no further E1-02
work.

## 2026-09-02 — E0-04 VERIFIED

Developer implemented registration (email/password via Supabase Auth), Supabase's native
email-confirmation flow, role assignment at registration, and Next.js proxy/middleware
enforcing `/familia/*`, `/ninera/*`, `/admin/*` route-group access by `profiles.role`.
Surfaced a real conflict between architecture.md §6 (Supabase's native email-confirm flow,
which blocks all sign-in pre-confirmation) and the original UX-spec.md/journeys.md
soft-gate design (browse before confirming) — escalated rather than silently resolved (see
the dedicated "E0-04: correo verification redefined as a hard login gate" entry above).

Code Reviewer round 1: REVISE — one required fix (AUTH-04 needed a distinct "confirma tu
correo" + resend-email error state for a login attempt on an unconfirmed account, a
requirement that only existed because of the gating redefinition above, so the Developer's
original implementation predated it through no fault of its own). Developer implemented
`resendConfirmationEmailAction`, the login-form UI, and tests; also addressed 2 of 3
optional minor items. Code Reviewer round 2: **PASS_WITH_MINOR_ISSUES**, no required
changes remain, all 4 acceptance criteria pass. One low-probability edge case (orphaned
`auth.users` row if `deleteUser` cleanup itself also fails) tracked as a non-blocking note,
not fixed. Full history in agent/reviews/code-E0-04-review.md.

54/54 tests pass; lint/typecheck/build/check:secrets/lockfile-consistency all clean.
Empirical local-Supabase testing confirmed the hard email-confirmation gate, duplicate-email
(422 `user_already_exists`), and role-based route redirects all behave as designed.

**E0-04 marked VERIFIED.** E0-05 (Twilio Verify phone OTP) is now unblocked.

## 2026-09-02 — E0-05 VERIFIED

Developer implemented Twilio Verify phone OTP send/confirm (`lib/twilio/verify.ts`,
`actions/phone-verification.ts`, `components/auth/phone-verification-form.tsx`), wired to
AUTH-03's teléfono checklist row on `/verificar`. Added `profiles.phone_otp_last_sent_at`
(migration `20260902000009`) to back an app-layer ~60s resend cooldown enforced strictly
before any Twilio call, on top of Twilio's own native rate limiting, per security.md's
defense-in-depth guidance. `phone_verified`/`phone_otp_last_sent_at` are written only via
the service-role client, protected from non-privileged writes by an extension of E0-03's
`profiles_protect_system_fields` trigger. All testing mocks the Twilio SDK per this story's
own validation note — no real Twilio credentials exist yet (human will supply later); a
manual smoke test against Twilio's test credentials is deferred to a pre-RELEASE_GATE
checklist item, not a gap in this story.

Code Reviewer: **PASS_WITH_MINOR_ISSUES** on the first pass, no required changes. Verified
Twilio SDK usage against the actual installed package's type definitions (not just the
Developer's own mocks) — correct method names/argument shapes/error-field access. All 4
acceptance criteria pass (resend cooldown; invalid/expired code shows inline error without
touching `email_verified`; success sets `phone_verified=true`; Twilio fully mocked in
tests). Three non-blocking optional follow-ups noted (cooldown check-and-stamp atomicity,
whether a rate-limited send should still stamp the cooldown timestamp, and whether the
first OTP send should auto-trigger vs. require an explicit click) — deferred, not required
before merge. Full report in agent/reviews/code-E0-05-review.md.

83/83 tests pass; lint/typecheck/build/check:secrets all clean.

**E0-05 marked VERIFIED.** E0-06 (Vercel deployment pipeline) is now unblocked — this
completes all of Epic 0 (Foundations) except E0-06.

## 2026-09-03 — E0-06 prerequisites: nanamex-preview created, Vercel CLI authorized

Before starting E0-06 (Vercel deployment pipeline), two prerequisites needed human
involvement rather than agent guessing:

1. **`nanamex-preview` Supabase project created.** E0-06's stated acceptance criterion
   ("every PR gets a working preview URL against the preview Supabase project") assumes a
   preview project exists, but E0-02 deliberately deferred creating it (see the 2026-09-02
   "E0-02: Supabase preview/prod project creation deferred" entry above). Asked the human
   whether to create it now or scope E0-06 to production-only; **human chose to create it
   now.** Orchestrator provisioned `nanamex-preview` (ref `okbwvbwxfywwvqaqpgcx`,
   `sa-east-1`, same org/region as `nanamex-dev`) via the Supabase CLI and pushed all 9
   existing migrations to it (`supabase db push --linked`), confirmed applied. Its `zonas`
   table has the correct schema but has not been seeded (same known limitation as
   `nanamex-dev` — no remote DB credentials in this session to run `seed.sql` against a
   hosted project directly). `nanamex-prod` (a distinct production project, separate from
   `nanamex-dev`) has NOT been created — see the open item below.

2. **Vercel CLI access.** Connecting the GitHub repo to Vercel and configuring
   per-environment env vars requires a Vercel account login — an external-system action an
   agent should not take unilaterally without human authorization (per AGENTS.md's
   production-system caution and the same reasoning applied to Supabase project creation).
   Asked the human how to proceed; **human chose to authenticate the Vercel CLI directly**
   (ran `vercel login` themselves via the device-code flow in this session, confirmed via
   `vercel whoami` → `andresgi`). The CLI's auth token persists at
   `~/Library/Application Support/com.vercel.cli`, accessible to any agent in this
   environment — the Developer building E0-06 does not need to re-authenticate.

**Open item for RELEASE_GATE / when actually needed:** this venture currently has
`nanamex-dev` (development) and `nanamex-preview` (Vercel per-PR previews) but no
dedicated `nanamex-prod` project — `architecture.md` §13's three-environment design
(development/preview/production, never sharing a DB) is not yet fully realized. E0-06
should build against `nanamex-dev` as production for now (flag this explicitly, don't
silently treat `nanamex-dev` as permanent production) and this gap should be revisited
before RELEASE_GATE.

## 2026-09-03 — E0-06: production-skip mechanism verified correct; documentation corrected after Code Review caught an undisclosed deployment

Developer configured Vercel's "Ignored Build Step" (`commandForIgnoringBuildStep`) as the
mechanism enforcing "production deploy is a manual promotion, never automatic on merge to
`main`," and reported deliberately not testing the production-skip branch live (to avoid
risking an unauthorized production deployment), which the human accepted on Vercel's
documented behavior, deferring live verification to the first real merge to `main`.

**Code Reviewer caught a discrepancy**: live Vercel deployment history showed an actual
production-target deployment attempt (status `Error`) that contradicted the "never
tested" framing. Investigation (Developer, on request) confirmed via Vercel API metadata
(`source: cli`, `creator: andresgi`) that this was the Developer's own `npx vercel deploy`
run from `projects/nanamex/` during initial setup — not a deliberate test, not a git-
integration race, and not an inverted Ignored Build Step. Root cause: (1) Vercel
auto-classifies a brand-new project's very first deployment as Production regardless of
branch (documented platform behavior), and (2) running `vercel deploy` from a
subdirectory uploads only that subdirectory as the source tree, so the configured Root
Directory (`projects/nanamex`) couldn't be found inside it — the deployment failed at
file-setup time, before the Ignored Build Step logic ever ran. Confirmed no content was
ever served (production alias returned `404 DEPLOYMENT_NOT_FOUND`) — no security exposure.
Confirmed this failure mode is specific to CLI-local partial-tree uploads and **cannot
recur** on a genuine GitHub-triggered production build, since Vercel's Git integration
always starts from a full repository clone at its root.

**Separately, independently verified by Code Reviewer**: the Ignored Build Step's actual
exit-code logic (`exit 0` when `VERCEL_ENV == production`, `exit 1` otherwise) is
objectively correct against Vercel's own documented convention ("if the command returns 0,
the build is skipped; 1+ proceeds") — not inverted. Env var scoping (Production/
Development → `nanamex-dev`, Preview → `nanamex-preview`) was independently confirmed via
hash comparison.

`README.md` and `engineering/architecture.md` §13 updated with a full incident disclosure
(both deployment IDs, root cause, confirmation nothing was served, why it can't recur, and
a preventive note to always deploy from the monorepo root for this project).

**Standing plan unchanged: verify empirically at the first real merge to `main` that the
resulting deployment shows status "Ignored."** Not a blocker for marking E0-06 VERIFIED
now — the documentation-accuracy issue that blocked the first review pass is resolved.

## 2026-09-03 — E0-06: production-skip mechanism confirmed on a real Git-triggered merge

PR #5 (E0-06) merged into `main` (human-approved). Checked the resulting Vercel deployment
via the API: `dpl_58weyJT3VtnYsfQbfXBzVByTzsjx` — `source: git` (genuine GitHub-triggered,
not a CLI deploy), `target: production`, `meta.githubCommitRef: main`, `readyState:
CANCELED`, build duration effectively 0ms (no build executed). Vercel's API/CLI label this
outcome "Canceled" rather than literally "Ignored," but it is the same mechanism and the
same result: the Ignored Build Step correctly prevented the merge to `main` from producing
a live production deployment. This closes out the standing verification item from the
E0-06 review — the manual-promotion safeguard is now confirmed working on a real
Git-triggered production build, not just documented behavior.

## 2026-09-03 — E1-01: hero photo must depict an actual caregiving/family moment, not a generic lifestyle placeholder

Developer sourced a CC BY 2.0 Wikimedia Commons photo (adult woman alone in a kitchen) for
AUTH-01's hero, manually verified no child/implied child in frame (satisfying UI-SYSTEM
§0.10's hard safety rule), and explicitly flagged it as a placeholder since it doesn't
literally depict a "caregiver/family moment" as UI-SPEC AUTH-01 requires — it's a generic
warm lifestyle photo. Both Code Reviewer and Visual QA independently caught and flagged
this same gap. Escalated to the human rather than accepting or rejecting unilaterally.

**Human decision: have the Developer search for a better-matching, freely-licensed photo
now** (showing a plausible niñera/parent caregiving moment, adults only, home setting) —
not deferred to a pre-RELEASE_GATE item. The same no-child-imagery verification rigor
applies to whatever replacement is found.

**Follow-up, same day:** Developer ran an exhaustive second search (Wikimedia Commons
full-text search across ~15 query variations, category browsing of
Nannies/Babysitting/Babysitters/Au_pairs/Childminders, a full catalog scan of the current
photo's uploader's 3,375 files, Openverse API — timed out/unusable from this sandbox — and
attempted Unsplash/Pexels, both blocked without an API key in this sandbox) and found no
suitable adults-only caregiving-moment photo in any reachable free/CC catalog. Root cause
identified, not just bad luck: genuine "caregiver moment" stock photography overwhelmingly
depicts the child being cared for, which is exactly what UI-SYSTEM §0.10 disallows — an
adults-only version of that scene is a narrow, uncommon staged shot that doesn't appear to
exist in the catalogs this sandbox can reach. Full search log in
`public/images/README-auth-01-hero.md`. Escalated back to the human rather than settling
for a worse substitute.

**Final human decision: accept the current placeholder (adult woman alone in a kitchen,
CC BY 2.0, verified no-child-imagery) for now.** Tracked as a pre-RELEASE_GATE item to
revisit with either a paid stock license, an Unsplash/Pexels API key, or a human-supplied
image, whichever is most practical when the venture is closer to real launch.

## 2026-09-03 — E1-02 scoped down and VERIFIED

E1-02's stated acceptance criteria (engineering/implementation-plan.md) reference FAM-01
(story E1-03, which depends on E1-02) and a server-side `Contactar`/entitlement check
(story E5-01, several epics away) — neither exists yet in the codebase, so those criteria
cannot be built or tested against right now. Orchestrator narrowed the delegated scope
before starting: confirm/fix the correo-hard-gate + teléfono-soft-gate flow end-to-end for
what's actually buildable today, and explicitly defer the rest rather than stub it out.

Developer confirmed most of the flow was already correct from E0-04/E0-05, but found a
real gap: design/UI-SPEC.md's AUTH-03 spec requires a "Continuar" action on `/verificar`
that proceeds regardless of teléfono-verification status — no such action existed; the
OTP-submit button was itself mislabeled "Continuar," conflating "submit the code" with
"skip ahead." Fixed: added the actual soft-gate "Continuar" link (unconditional, targets
the user's role home) and renamed the OTP-submit button to "Verificar" to disambiguate.

Code Reviewer: PASS, no required changes. Independently verified route gating
(`proxy.ts`/`route-access.ts`) is genuinely role-only, never conditioned on
`phone_verified`; the new "Continuar" link has no leftover conditional that would defeat
the soft gate; the button rename doesn't break any existing test; and the scope reduction
was legitimate (FAM-01/Contactar genuinely don't exist yet).

**E1-02 marked VERIFIED.** Deferred: FAM-01 (E1-03), Contactar/entitlement enforcement
(E5-01), and a "cuenta no verificada" banner UI treatment (unbuilt anywhere — flagged for
whichever of FAM-13/FAM-01 builds it first).

## 2026-09-02 — Standing authorization: git push + PR per BUILD story

For the remainder of BUILD, the orchestrator may commit, push a branch, and open a PR for
each VERIFIED story without asking each time (so CI proves green — same pattern used for
E0-01/PR #1), batching related stories into one PR when it makes sense (e.g. all of
Epic 0 in one PR). **Merging any PR still always requires separate explicit human
approval** — this authorization covers push/PR-open only, not merge. Human confirmed this
standing policy explicitly (chose "Auto push+PR per story" over asking each time or
manual handling) rather than being asked before every individual push, to avoid
interrupting for ~50 more implementation-plan.md stories.
