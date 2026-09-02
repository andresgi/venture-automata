# Review

**Artifact reviewed:** product/prd.md ("Clin — Plataforma de niñeras")
**Reviewer role:** Product Critic (independent, review-only per AGENTS.md Fast-start)
**Task:** PS-001 — Review-only critique of supplied PRD, ahead of PRODUCT_GATE

This is a review of a founder-supplied PRD. DISCOVERY/BENCHMARK were explicitly skipped by
human decision (agent/DECISIONS.md, 2026-08-31) — that decision is not relitigated here.
This review does not modify product/prd.md.

## Verdict

**REVISE**

Not BLOCK: nothing here is irreversible or catastrophic, and the founder has already
correctly flagged pricing and identity-verification approach as adjustable hypotheses.
Not PASS / PASS_WITH_MINOR_ISSUES: two issues (below) threaten whether V1, as currently
scoped, will actually produce a clean read on the single hypothesis the PRD says it exists
to test (section 9), and several requirements are underspecified enough that UX/
TECH_ARCHITECTURE would have to invent product behavior rather than implement it. These are
resolvable with a short addendum/founder Q&A, not a PRD rewrite — but they should be
resolved (or explicitly accepted as known risk by the human) before or very early in
PRODUCT_GATE, not discovered downstream during architecture or build.

## Critical Issues

### 1. The paywall confounds the one hypothesis the MVP claims to test

Section 9 states the MVP exists to validate exactly one hypothesis: *"¿Podemos generar
suficiente confianza y liquidez para que una familia encuentre y contacte una niñera
adecuada a través de la plataforma?"* The North Star metric (section 8) is *"% de familias
que logran contactar al menos una candidata compatible."*

But section 7 gates the "contactar" action itself behind a MX$299 paywall in the very same
MVP. If a family fails to contact a candidate, the PRD as scoped cannot distinguish between:

- the matching/trust mechanics failed (the actual hypothesis under test), vs.
- the family was willing and able to find a compatible candidate but declined to pay MX$299
  to reach out (a pricing/willingness-to-pay failure, not a trust/liquidity failure).

These are two different hypotheses bundled into one metric. As written, a low North Star
number is ambiguous evidence — it could sink confidence in the core value proposition when
the real problem is price point or packaging, or vice versa. This matters more here than in
a typical PRD because section 9 explicitly stakes the entire MVP's purpose on cleanly
reading this one number.

This does not necessarily mean removing the paywall — that is a founder/business call — but
the PRD (or its addendum) should at minimum specify how the funnel will be instrumented to
separate "no compatible match found" from "match found, contact blocked by price," so the
North Star metric isn't silently contaminated by monetization friction.

### 2. Manual identity verification's turnaround/interim state is undefined and can quietly throttle the thing being measured

"Confianza y seguridad" (section 5) lists identity verification and the "Identidad
verificada" badge as core trust infrastructure, and config/CONSTRAINTS.md fixes this as
manual-admin-only for V1 (a human reviews an uploaded ID and manually toggles the badge).
The PRD does not say:

- What turnaround time is expected/acceptable for manual review (same-day? 24–48h? no SLA
  at all?).
- Whether an unverified niñera (verification pending or not yet submitted) is still visible
  and matchable to families, or is hidden/deprioritized until verified.

Given CONSTRAINTS assumes "at minimum, one human operator" for this workload, any backlog
in manual review directly throttles supply-side visibility. If unverified niñeras are hidden
by default, a review backlog silently reduces the number of candidates families can find —
which will show up as a bad North Star reading that looks like a demand/trust problem but is
actually an operational bottleneck the founder doesn't yet know exists. This should be
decided explicitly, not left implicit, since it affects both the honesty of the V1 read and
the SOP workload sizing.

## Important Issues

- **Match Score has no implementable definition.** Section 6 lists six inputs (ubicación,
  disponibilidad, modalidad, expectativa salarial, experiencia requerida, edad de los niños)
  and shows a "92% compatible" example, but defines no weights, no scoring formula, no
  minimum threshold for what counts as "compatible" (vs. simply ranked), and no tie-break or
  partial-match rule (e.g., is salary a hard filter or a soft weighted factor; is "edad de
  los niños" matched against the niñera's stated age-range experience, or something else?).
  As written, whoever builds this (UX for how scores/badges are displayed, TECH_ARCHITECTURE
  for the rules engine) has to invent the actual business logic rather than implement a
  specified one — this is exactly the "engineer shouldn't have to invent product behavior"
  failure mode AGENTS.md warns about for PRDs. This should be resolved (even provisionally,
  e.g. as a simple documented rule table) before TECH_ARCHITECTURE begins.

- **Pricing/paywall feature gating is marketing copy, not a requirement.** Section 7's
  "Ejemplo" bullets (MX$299 to contact for 30 days; MX$499–699 for "búsqueda premium con
  verificaciones adicionales") are explicitly flagged as illustrative, and
  config/CONSTRAINTS.md correctly treats the price levels as adjustable. But beyond the
  price numbers, the *feature-gating mechanics* are also unspecified: what exactly does
  "contactar" include (unlimited contacts within 30 days, or a fixed number)? What happens
  to an in-progress conversation when the 30 days expire? What does "verificaciones
  adicionales" concretely add beyond the base verified badge? None of this is buildable as a
  payment/entitlement system without answers — this is separate from (and in addition to)
  Critical Issue #1 above, and should be resolved before BUILD scopes payment integration,
  even if it isn't a blocker for PRODUCT_GATE itself.

- **Niñera-side discovery is asymmetric and underspecified.** Section 5 gives families an
  explicit self-serve capability ("Listado de niñeras compatibles," "Filtros básicos").
  Niñeras get no equivalent bullet — section 4's flow diagram only says "Recibir
  oportunidades," implying a purely passive, system-pushed model. If the matching algorithm
  under-delivers (plausible, since section 6's algorithm is itself unspecified per above),
  niñeras have no self-serve fallback to find opportunities, which directly threatens
  supply-side liquidity — half of the two-sided hypothesis this MVP is meant to test. Worth
  an explicit decision: passive-only, or can niñeras also browse/search open vacantes?

- **"Referencias" trust signal is not defined as verified or self-reported.** Section 5 lists
  "Referencias" under both the niñera's profile and "Confianza y seguridad." Given
  CONSTRAINTS fixes identity verification as the only manual-review-backed trust signal,
  it's unclear whether references are contacted/checked by an operator or are simply
  free-text fields the niñera fills in herself. If the latter, grouping "Referencias" under
  a section titled "Confianza y seguridad" alongside actually-verified signals (phone/email
  OTP, ID review) risks implicitly overstating the rigor of that signal to families — worth
  clarifying so UX doesn't visually present unverified references with the same weight as
  the verified-identity badge.

- **Report handling has no defined interim action.** Section 5 includes "Reportar usuario o
  comportamiento inapropiado" but does not say what happens immediately after a report is
  filed (e.g., does the reported profile stay fully visible/matchable pending manual review,
  or is it auto-hidden/throttled?). This is both a safety-framing question and an SOP
  workload question, and should be resolved before SOP writes the moderation runbook.

- **Children's data granularity: PRD wording is looser than the constraint that governs it.**
  config/CONSTRAINTS.md restricts family-side data collection to "age ranges" of children,
  not exact ages or birthdates. Section 5 of the PRD simply says "Número y edad de niños,"
  without stating this should be an age range. An implementer reading only the PRD (without
  cross-referencing CONSTRAINTS) could reasonably build an exact-age or birthdate field. This
  is a minor wording gap but has real data-minimization consequences for a product handling
  indirect data about minors — worth restating explicitly as "rangos de edad" wherever this
  requirement appears, not just in CONSTRAINTS.

## Minor Issues

- "Filtros básicos" (section 5) doesn't name which filters (location? price range?
  availability? modality?) — likely fine to leave to UX, but flag so it isn't lost as an
  open decision.
- No stated threshold for which niñeras appear in "Listado de niñeras compatibles" — all
  candidates ranked by score, or only those above some cutoff? Related to the Match Score
  gap above.
- The candidate-state pipeline ("Nueva → Contactada → Entrevista → Contratada/Descartada")
  doesn't say who can transition states (family only?) or whether the niñera sees/is
  notified of state changes.
- Section 8's metric list mixes hypothesis-validation metrics (North Star, matches per
  vacante) with pure business/growth metrics (CAC, Free→Paid conversion) without
  prioritization — not a defect for a PRD, but downstream analytics spec work should treat
  these as different tiers of urgency for V1 instrumentation.

## Missing Evidence

(Expected and already accepted per the founder's decision to skip DISCOVERY/BENCHMARK — not
relitigating that decision, but naming the specific unvalidated claims BUILD will be resting
on, since these are the assumptions most likely to be wrong):

- **Willingness to pay** at any of the MX$299 / MX$499–699 price points — pure founder
  hypothesis, already correctly flagged as adjustable in CONSTRAINTS.
- **Match Score weighting** — no evidence on which of the six listed factors actually drives
  a family's or niñera's real decision (e.g., is salary fit more decisive than location? is
  "experiencia con edades específicas" a hard requirement or a nice-to-have?). The weights
  will be invented by whoever builds section 6, absent further input.
- **Acceptable verification turnaround** — no evidence on how fast families expect a
  "verified" supply pool to materialize, despite childcare searches often being
  time-sensitive. This is a real assumption embedded in "Confianza y seguridad" that manual
  review can deliver trust fast enough to matter.
- **Minimum viable supply density** — the PRD defines success as families reaching one
  compatible candidate, but says nothing about how many active, verified niñeras per zone
  are needed to make that plausible. Early success could be entirely a founder-seeded/
  survivorship artifact (hand-recruited niñeras in a single neighborhood) that doesn't
  generalize — worth the founder being aware this is not addressed by the current metrics.

## Recommended Revisions

These are advisory only (per Fast-start, this review does not author changes to the PRD).
Suggested next steps, roughly in priority order:

1. Decide and document how the funnel/analytics will separate "no compatible match" from
   "match found but payment declined," so the North Star metric isn't confounded by the
   paywall (Critical #1). Alternatively, consider whether a free initial contact allowance
   would give a cleaner read on the trust/liquidity hypothesis before layering monetization
   friction on top — founder's call, but the current design doesn't let you tell the
   difference.
2. Define an expected manual-verification turnaround and decide explicitly whether
   unverified niñeras are visible/matchable in the interim (Critical #2). Feed this into SOP
   operator-workload planning.
3. Specify the Match Score algorithm concretely — at minimum a rule table (hard filters vs.
   weighted factors, and a minimum score/threshold for "compatible") — before
   TECH_ARCHITECTURE starts on the matching engine.
4. Specify paywall feature-gating mechanics (what "contact" includes, expiration behavior,
   tier relationships) before BUILD scopes payment/entitlement logic.
5. Decide whether niñeras can self-serve browse/search open vacantes, or remain
   purely passive recipients of pushed matches.
6. Clarify whether "Referencias" are operator-verified or self-reported, and reflect that
   distinction in how it's surfaced to families.
7. Define interim handling for reported profiles (visible vs. auto-hidden pending review).
8. Restate "edad de niños" as "rango de edad" in the PRD itself (not only in CONSTRAINTS) to
   keep data collection aligned with the minimization intent already agreed.

None of the above require reopening DISCOVERY/BENCHMARK or a PRD rewrite — they can be
captured as a short addendum, explicit open-questions list, or resolved verbally with the
founder and logged in agent/DECISIONS.md before PRODUCT_GATE, or handed to
UX/TECH_ARCHITECTURE as explicit spikes if the human prefers to gate on scope/direction now
and resolve mechanics later.

## Exit Criteria Assessment

Assessed against PS-001's acceptance criteria (agent/BACKLOG.md), since that is the task
this review was produced for:

- **"Product Critic has reviewed product/prd.md for evidence quality, reasoning quality,
  unresolved risk, and MVP discipline"** — PASS (this document).
- **"Findings, plus the PRD, presented to the human for PRODUCT_GATE"** — UNCERTAIN /
  pending: this is the orchestrator's next action after this review, not something this
  review itself performs.
- **"Orchestrator records in agent/DECISIONS.md whether the PRD is accepted as-is or a
  revision is requested before PRODUCT_GATE"** — UNCERTAIN / pending orchestrator action.
- **"Human's PRODUCT_GATE approval (or requested changes) recorded in agent/DECISIONS.md"**
  — UNCERTAIN / pending human action.
