# Project State

Last updated: 2026-09-04

## Current Phase

BUILD

## Status

IN_PROGRESS

## Current Objective

ARCHITECTURE_GATE approved by human 2026-09-02 (see agent/DECISIONS.md). TECH_ARCHITECTURE
VERIFIED. BUILD is proceeding per engineering/implementation-plan.md. Epic 0 Foundations,
Epic 1 (E1-01–E1-03), E2-01 through E2-03, E3-01/E3-02, E4-01 through E4-04, and E5-01
through E5-03 are all VERIFIED. E5-03 retired E5-01's documented temporary direct-to-Stripe
redirect with the real FAM-08/FAM-09 flow (see agent/DECISIONS.md 2026-09-04).

## Phase Status

INIT: VERIFIED
DISCOVERY: N/A (disabled)
BENCHMARK: N/A (disabled)
PRODUCT_STRATEGY: VERIFIED (provided — product/prd.md + product/prd-addendum.md; PRODUCT_GATE
  approved 2026-08-31, see agent/DECISIONS.md)
BRAND: VERIFIED (folded into UI, 2026-09-01)
UX: VERIFIED (2026-08-31, see agent/DECISIONS.md)
UI: VERIFIED (2026-09-01, see agent/DECISIONS.md)
TECH_ARCHITECTURE: VERIFIED (ARCHITECTURE_GATE approved 2026-09-02, see agent/DECISIONS.md)
BUILD: IN_PROGRESS
SECURITY_REVIEW: NOT_STARTED
SUPPLY_GROWTH: NOT_STARTED (optional — include/skip decision not yet made)
DEMAND_GROWTH: NOT_STARTED (optional — include/skip decision not yet made)
PRODUCT_ACCEPTANCE: NOT_STARTED
SOP: NOT_STARTED
DOCUMENTATION: NOT_STARTED
RELEASE: NOT_STARTED

## Current Work

**Epic 0 (Foundations) is fully complete** — E0-01 through E0-06 all VERIFIED and merged
(PRs #1-#5). Notable open items: no dedicated `nanamex-prod` Supabase project yet
(Production Vercel env reuses `nanamex-dev`); no real Twilio credentials yet (manual smoke
test deferred). Both flagged as pre-RELEASE_GATE items. Full history in agent/DECISIONS.md.

**Standing authorization for an unattended overnight run recorded 2026-09-03** (see
agent/DECISIONS.md) — orchestrator may auto-merge BUILD-story PRs once CI + Code
Review/QA pass, without pausing for per-PR human approval, and continue straight to the
next eligible action. Scope: BUILD-story PRs only; human gates and any production-
deployment/destructive-data/force-push action still require explicit approval as before.
Stop conditions: a genuinely BLOCKED item, 3 failed review cycles on the same task, or a
human gate.

**Continuity note:** partway through this run, work continued in a different tool session
(E1-03 through E3-02 were completed and merged there, PRs #8-#11). On resuming, E2-02's
implementation and its first Code Review were found as uncommitted changes directly on
`main`'s working tree — moved onto a proper feature branch without discarding anything,
then the review loop continued normally. See agent/DECISIONS.md "E2-02 continuity" entry.

**Epic 1 (Familia Onboarding) — fully VERIFIED**: E1-01 (AUTH-01 landing, first UI-SYSTEM
design-token wiring, PR #6), E1-02 (AUTH-02/03 registration+verification, scope narrowed
to what's buildable given forward dependencies, PR #7), E1-03 (FAM-01 onboarding, PR #8).
Full details in agent/DECISIONS.md and agent/BACKLOG.md.

**Epic 2 (Necesidad Creation) — fully VERIFIED**: E2-01 (FAM-03 seven-step wizard, PR #9),
E2-02 (FAM-03 publish + initial match computation — two real bugs found and fixed via
Code Review/Functional QA cycles: a ranking tie-break field mismatch + RPC trust-boundary
hardening, then a live `disponibilidad` casing bug zeroing the availability match factor
for every real candidate, PR #12), E2-03 (FAM-02 dashboard, real card grid replacing the
 interim drafts-only placeholder, 2 minor findings fixed directly, PR #13).

**Epic 3 (Matching Engine) — fully VERIFIED**: E3-01 (hard filter + weighted scoring, PR
#10), E3-02 (`computeMatches` ranking service, PR #11).

Known limitations carried forward: `app/familia/loading.tsx`'s skeleton scope-bleeds to
the whole `/familia/*` subtree (tracked, non-blocking, see E2-03's BACKLOG.md entry);
active-necesidad editing remains unbuilt (E2-04's scope); FAM-06 profile details remain
unbuilt (E4-03).

**Epic 5 (Paywall, Payments, Entitlements) — complete**: E5-01 (Stripe Checkout Session
creation), E5-02 (Stripe webhook handler / entitlement activation, `POST
/api/webhooks/stripe`, idempotent + correctly stacks `expires_at` on repurchase), E5-03
(real FAM-08/FAM-09 paywall + checkout screens, retiring E5-01's interim direct-redirect),
E5-04 (FAM-10 solicitar entrevista, paid contact confirmation), and E5-05 (FAM-13
entitlement/payment history) are all VERIFIED.

**Pre-RELEASE_GATE backlog item (E5-03):** FAM-09's success confirmation has no icon
animation per spec; deferred as cosmetic, no motion convention exists yet in this codebase
(agent/qa/e5-03-visual.md V03).

**Merged to `main` 2026-09-04**: PR #15
(https://github.com/andresgi/venture-automata/pull/15, squash-merged
`f267404`) — E4-03 through E5-05 (FAM-06 candidate detail, FAM-07 favoritas, and all of
Epic 5). All CI checks passed (lint/typecheck/test/build, migrations-apply-cleanly,
Vercel preview build) before merge, per the standing overnight authorization below. Local
`main` fast-forwarded to match; the feature branch
`nanamex/e4-03-fam06-candidate-detail` was left undeleted (remote and local) as a safety
default, not explicitly requested.

**Epic 6 (Pipeline Management) — in progress**: E6-01 (FAM-11 estado de candidatas,
`advance_pipeline_state` RPC structurally preventing any manual `nueva -> contactada`
transition, kanban/segmented views) VERIFIED.

**Merged to `main` 2026-09-05**: PR #18
(https://github.com/andresgi/venture-automata/pull/18, squash-merged `61910c3`) — E6-01
through E7-05 (pipeline management, niñera onboarding/profile-edit/identity-upload/
dashboard/opportunities). All CI checks passed before merge. Note: a separate tool session
had pushed E6-01/E7-01/E7-02/E7-03's individual commits directly to `main` outside the PR
flow before this merge — PR #18 by that point only carried E7-04/E7-05's genuinely new
work forward; verified via `git log origin/main..origin/<branch>` that no unique work was
lost before deleting branches. Cleaned up 4 now-fully-superseded branches (local + remote):
`nanamex/e4-03-fam06-candidate-detail` (content already in `main` via PR #15's squash),
`nanamex/e6-01-fam11-pipeline` and `nanamex/e7-01-nin-onboarding` (never pushed, local
only), `nanamex/e7-03-nin08-identity-upload` (content already in `main` via the direct
pushes). `nanamex/e7-02-nin07-profile-edit` (PR #18's branch) left undeleted per the
established convention.

**Epic 7 (Niñera Profile & Discovery) — in progress**: E7-01 (NIN-01/02 onboarding wizard)
VERIFIED. `save_perfil_ninera` RPC sets `publicado := perfil_completo` unconditionally,
independent of `verification_status` — the direct, tested resolution of the PRD addendum's
Critical Issue #2 (a `no_verificada` niñera with a complete profile appears in matching).
Reuses E2-01's wizard shell (mobile sticky nav / desktop anchored side-rail) after a Visual
QA round 1 REVISION_REQUIRED caught the desktop shell being entirely missing; round 2 PASS
after the fix. Branch `nanamex/e7-01-nin-onboarding`, not yet pushed/merged.

E7-03 (NIN-08 identity upload) is also VERIFIED, including private Storage, byte-level file
validation, durable cleanup reconciliation, and optional non-blocking verification.
E7-02 (NIN-07 mi perfil edit) is VERIFIED, including section-level saves, identity-integrity
re-review triggering, structured references editing, responsive navigation, and fail-closed
profile/reference reads.

E7-04 (NIN-03 dashboard) and E7-05 (NIN-04/NIN-05 opportunities) are now VERIFIED. Both had
a Code Review REVISE (5 Required Changes) and a Visual QA REVISION_REQUIRED (3 findings) in
round 1; the orchestrator fixed all of them directly rather than looping back to the
Developer, including converting NIN-05's filtering from server-side GET-params to
client-side live-apply filtering (matching FAM-05's established `CandidateFiltersView`
pattern). Both rounds 2 came back PASS/PASS_WITH_MINOR_ISSUES. Pushed opportunities use
`/ninera/oportunidades/recibidas`; active browse uses `/ninera/oportunidades`.

**Epic 7 progress: E7-01 through E7-05 are all VERIFIED.** E7-06 (NIN-06 detalle de vacante
+ Mostrar interés) is next — it owns the vacancy detail route and `interes_ninera` mutation
that E7-05's cards currently leave visibly disabled. E6-02 (NIN-09, deferred 2026-09-04)
still needs E7-06 too.

## Next Eligible Action

E7-06: NIN-06 detalle de vacante + Mostrar interés (dependency E7-05, now VERIFIED). Sets
`interes_ninera` on the pipeline row (auto-created if absent) without changing `estado`;
family sees the "interesada" flag. Once E7-06 lands, E6-02 (NIN-09 read-only mirror,
deferred 2026-09-04) becomes a real, connected screen instead of an orphaned one.

## Human Blocker

None yet. Note for later: retention/deletion policy for uploaded identity documents (see
config/CONSTRAINTS.md "Legal / Data Constraints") must be resolved with the human before
real user data is collected in production — not a blocker for BUILD/UX/UI using test data,
but must be resolved before RELEASE_GATE. Also: admin MFA explicitly deferred to a
pre-RELEASE_GATE checklist item (see agent/DECISIONS.md, TECH_ARCHITECTURE entry).
