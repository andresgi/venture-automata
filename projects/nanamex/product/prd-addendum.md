# PRD Addendum — resolutions from Product Critic review (PS-001)

This addendum captures founder decisions made in response to the Product Critic's
review-only critique of product/prd.md (see agent/qa/prd-review.md). It does not replace or
edit product/prd.md — it supplements it. Downstream phases (UX, TECH_ARCHITECTURE, BUILD,
SOP) must treat both documents as authoritative together.

## Resolved

### 1. North Star metric vs. paywall confound (Critical #1)

Decision: **keep the MX$299 paywall on "contactar" as scoped in PRD section 7, but
instrument the funnel to separate the two outcomes that currently collapse into one North
Star number.**

Required instrumentation (feed into TECH_ARCHITECTURE's analytics spec):

- Track, per vacante, whether the family reached **"encontró al menos una candidata
  compatible"** (a match existed and was viewed) as a distinct event from **"contactó a una
  candidata"** (paid and sent contact).
- Report both the original North Star ("% familias que contactan") and a secondary
  diagnostic metric: "% familias con al menos un match compatible que NO contactó" — this
  isolates price/paywall friction from matching/trust failure.
- If the secondary metric is high (matches exist, no contact), that's a pricing/packaging
  signal, not a trust/liquidity failure — treat differently in retro analysis.

### 2. Manual identity verification SLA and interim visibility (Critical #2)

Decision: **target 24–48h turnaround for manual ID review. Niñeras remain visible and
matchable while verification is pending** — the "Identidad verificada" badge appears once
approved, but an unverified profile is not hidden or deprioritized in listings/matching
before that.

Implications to carry forward:

- SOP must size operator workload assuming a 24–48h SLA and define what happens if the
  queue backs up beyond that (escalation, not silent delay).
- UX must design a clear "pending verification" state distinct from "verified" so families
  aren't misled about trust signals, while still allowing pending profiles to be discovered
  and contacted.
- Analytics should track verification turnaround time itself as an operational health
  metric, since a growing backlog would otherwise masquerade as a demand-side problem in the
  North Star reading.

## Deferred as explicit spikes (not blocking PRODUCT_GATE)

Per founder decision, the following "Important" issues from the Product Critic review are
accepted as open questions to be resolved by the owning phase when it reaches them, not
resolved now. Each must be explicitly answered (and recorded, e.g. in the relevant phase's
own artifact or agent/DECISIONS.md) before the artifact that depends on it is considered
done — they are not to be silently invented:

- **Match Score algorithm** (PRD section 6): no weights/thresholds/tie-break rules defined.
  TECH_ARCHITECTURE must produce an explicit rule table (hard filters vs. weighted factors,
  minimum compatibility threshold) before implementing the matching engine — not invent it
  ad hoc during coding.
- **Paywall feature-gating mechanics** (PRD section 7): what "contactar" includes, whether
  it's unlimited within 30 days or capped, what happens to in-progress conversations at
  expiration, and what "verificaciones adicionales" concretely adds for the premium tier.
  Must be specified before BUILD scopes payment/entitlement logic.
- **Niñera-side discovery model**: PRD section 4/5 describes niñeras as passive recipients
  of pushed opportunities only. UX must explicitly decide (and design for) whether niñeras
  can also browse/search open vacantes, given this affects supply-side liquidity if matching
  under-delivers.
- **"Referencias" verification status**: UX/Technical Architect must decide and clearly
  surface whether references are operator-checked or self-reported by the niñera, so the UI
  doesn't visually imply the same rigor as the verified-identity badge.
- **Reported-profile interim handling**: SOP must define whether a reported profile stays
  fully visible pending review or is auto-hidden/throttled, as part of the moderation
  runbook.
- **Children's age data wording**: PRD section 5 says "edad de niños"; config/CONSTRAINTS.md
  already restricts this to **age ranges**, not exact ages/birthdates. UX/data model must
  implement this as a range field per CONSTRAINTS, regardless of the PRD's looser wording —
  CONSTRAINTS governs here.

### 3. Premium tier scope (surfaced during TECH_ARCHITECTURE)

PRD section 7 lists a MX$499–699 "búsqueda premium con verificaciones adicionales" tier as
part of V1 monetization, marked "Ejemplo." No PRD/UX/UI requirement ever defined what it
concretely contains. Decision: **dropped from V1.** Only the base `contacto_30d` tier
(MX$299, 30-day uncapped contact window) is built for V1. Premium may be revisited post-V1
if the core liquidity/trust hypothesis validates and there's demand signal for additional
verification services.

## Not addressed (accepted as known unvalidated risk, per skipping DISCOVERY/BENCHMARK)

No action needed now — named for downstream awareness per the Product Critic review:
willingness to pay at stated price points, Match Score factor weighting evidence, expected
verification-turnaround tolerance from real users, and minimum viable supply density per
zone. If V1 underperforms post-launch, revisit these before assuming the product concept
itself failed.
