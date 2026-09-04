# Analytics — Clin (Nanamex)

Maps PRD section 8's metrics — as refined by `product/prd-addendum.md`'s funnel-
instrumentation fix — to concrete events, storage, and computation. Implementation:
**PostHog** (event capture + funnel/cohort analysis) for product analytics, plus a thin
durable event log in Postgres (`analytics_events`, `database.md` §12) for the specific
metrics that must survive independent of a third-party vendor (operational SLA reporting,
North Star computation for SOP/founder review).

## 1. The Addendum's Core Requirement

> Track, per vacante, whether the family reached "encontró al menos una candidata
> compatible" as a distinct event from "contactó a una candidata."

This is the single most important instrumentation requirement in this document — it
directly determines whether V1's North Star reading is trustworthy. Both events are
defined precisely below (not just named) because a vague definition of "compatible" would
silently reintroduce the exact ambiguity the addendum exists to remove.

## 2. Event Catalog

| Event | Fires when | Key properties | Maps to |
|---|---|---|---|
| `account_registered` | AUTH-02 submit success | `role` (familia/ninera) | Familias registradas / Niñeras activas (denominator) |
| `email_verified` / `phone_verified` | AUTH-03 success per channel | `role` | Trust/onboarding funnel |
| `necesidad_published` | FAM-03 wizard final submit | `necesidad_id`, field summary (modalidad, zona_id, pago_min/max) | Denominator for match-rate metrics |
| `matches_computed` | Server-side, on publish or matching-relevant edit | `necesidad_id`, `candidate_count`, `max_score` | "Matches por vacante" |
| `candidate_profile_viewed` | FAM-06 opened (any score) | `necesidad_id`, `ninera_id`, `match_score` | General engagement (not the addendum's specific metric) |
| **`compatible_match_found`** | FAM-06 opened **and** `match_score ≥ MATCH_COMPATIBLE_THRESHOLD (60)`, **first time only** for this (necesidad, niñera) pair | `necesidad_id`, `ninera_id`, `match_score`, `familia_id` | **The addendum's "encontró candidata compatible" event.** Free action — fires regardless of payment/entitlement status (architecture §15.3, §16). |
| `contact_paywall_shown` | FAM-08 rendered | `necesidad_id`, `ninera_id`, `familia_id`, `had_active_entitlement: false` | Paywall friction diagnostic |
| `payment_initiated` / `payment_succeeded` / `payment_failed` | FAM-09 states | `entitlement_id`/`payment_id`, `amount` | Conversion funnel, Free→Paid |
| **`candidate_contacted`** | FAM-10 "Confirmar solicitud" success (i.e. `contacto` row created) | `necesidad_id`, `ninera_id`, `familia_id`, `entitlement_id` | **The addendum's "contactó candidata" event** and the PRD's literal North Star numerator. |
| `pipeline_state_advanced` | FAM-11 manual transition | `pipeline_id`, `from_estado`, `to_estado` | "% vacantes que terminan en contratación" |
| `opportunity_pushed` | Matching run identifies a new niñera for an active necesidad | `necesidad_id`, `ninera_id`, `match_score` | Niñera-side funnel |
| `interest_shown` | NIN-04/NIN-05 "Mostrar interés" | `necesidad_id`, `ninera_id`, `channel: pushed \| explorar` | Supply-side engagement; Decision 1 channel comparison |
| `identity_verification_submitted` | NIN-08 upload | `ninera_id`, `motivo` (primera_vez / re-revision) | Verification funnel |
| `identity_verification_decided` | ADM-03 approve/reject | `ninera_id`, `decision`, `turnaround_hours` (`decided_at - submitted_at`), `rejection_reason_code?` | **SLA/operational health metric** |
| `report_filed` / `report_resolved` | FAM-12/NIN-10 submit; ADM-05 resolve | `reportado_id`, `categoria`, `resolucion?` | Moderation load (SOP) |
| `necesidad_edited_matching_fields` | Architecture §17 trigger | `necesidad_id`, changed fields | Re-match frequency, mid-flow-edit prevalence |

All events will fire from server actions (server-side PostHog capture), not client-side, so
event integrity doesn't depend on a user's browser executing JS successfully — this also
keeps `familia_id`/`ninera_id` attribution reliable (server always knows the authenticated
user; a client-side event could be spoofed or dropped). E4-03 owns creation and durable
recording of `analytics_events`; PostHog capture is deferred to E11-01, which must add
vendor delivery around these existing durable writes without recreating the table or
emitting duplicate domain events.

## 3. North Star and Its Diagnostic Pair (the addendum's specific fix)

**North Star (PRD section 8, unchanged):**

```
% familias que contactan = (distinct familia_id with ≥1 candidate_contacted)
                            / (distinct familia_id with ≥1 necesidad_published)
```

**Diagnostic metric (addendum-mandated, computed alongside, never presented without it):**

```
% con match pero sin contactar = (distinct familia_id with ≥1 compatible_match_found
                                    AND zero candidate_contacted)
                                  / (distinct familia_id with ≥1 compatible_match_found)
```

**Reading rule (per addendum, restated here for whoever builds the dashboard):** if the
diagnostic metric is high, the problem is price/packaging (families find candidates but
won't pay) — this must be analyzed and reported as a **pricing signal**, distinct from a
low North Star driven by zero `compatible_match_found` events at all (a **matching/trust
liquidity failure**). A single combined dashboard number without this split is exactly the
confound the addendum was written to eliminate — SOP/founder reporting must always show
both numbers together, never the North Star alone.

## 4. Secondary Metrics (PRD section 8) → Implementation

| PRD metric | Computation |
|---|---|
| Familias registradas | `count(account_registered where role=familia)` |
| Niñeras activas | `count(perfil_ninera where publicado=true)` (a stronger signal than "registered," since a draft/incomplete profile isn't meaningfully "active") |
| % perfiles completos | `count(perfil_ninera where perfil_completo=true) / count(perfil_ninera)` |
| Matches por vacante | avg `candidate_count` from `matches_computed` |
| Contactos por familia | avg `count(candidate_contacted)` per familia with ≥1 |
| Entrevistas agendadas | `count(pipeline_state_advanced where to_estado='entrevista')` |
| % vacantes que terminan en contratación | `count(necesidades where estado='cerrada_contratada') / count(necesidades where estado != 'borrador')` |
| Tiempo promedio hasta primera candidata compatible | avg time between `necesidad_published` and first `compatible_match_found` for that `necesidad_id` |
| CAC familia / niñera | Computed outside this system (marketing spend ÷ `account_registered` by role) — no in-product instrumentation needed beyond the registration event and a spend figure tracked in whatever ad platform is used (not specified by PRD; out of scope for this document). |
| Conversión Free → Paid | `count(distinct familia_id with payment_succeeded) / count(distinct familia_id with account_registered)` |

## 5. Verification Turnaround (Operational Health Metric)

Per `product/prd-addendum.md`'s explicit instruction: "Analytics should track verification
turnaround time itself as an operational health metric, since a growing backlog would
otherwise masquerade as a demand-side problem in the North Star reading."

- Every `identity_verification_decided` event carries `turnaround_hours`.
- Dashboard/report: median and p90 turnaround, rolling 7-day window, plus **current queue
  age distribution** (count of `identity_verifications` where `status in (pendiente,
  en_revision)` bucketed by `now() - submitted_at`: <24h / 24–48h / >48h "SLA excedida") —
  this is the same bucketing `ADM-02`'s UI already computes for the color-coded queue, so
  it's a read of the same underlying data, not a separate pipeline.
- **This metric must be reviewed alongside the North Star**, per the addendum: a dropping
  North Star concurrent with a growing >48h bucket is an operational bottleneck, not
  evidence the product concept failed.

## 6. Niñera-Side Funnel (Decision 1 — hybrid discovery)

To evaluate whether the passive (pushed) or active (Explorar) channel is actually
delivering supply-side liquidity (the addendum's named risk for an unvalidated matching
algorithm):

```
interest_shown WHERE channel='pushed'    vs.   interest_shown WHERE channel='explorar'
```

tracked as separate funnel legs from `opportunity_pushed` (denominator for the pushed
channel) and from `NIN-05` page views (denominator for the explorar channel, captured as a
plain page-view event, not listed separately above since it's a standard PostHog
autocapture, not a domain event). If `explorar` materially outperforms `pushed` on
interest-shown rate, that's a signal the Match Score weights (architecture §15) are
under-surfacing good matches via the passive channel — direct, actionable feedback into
tuning `MATCH_COMPATIBLE_THRESHOLD` and the factor weights post-launch.

## 7. What Is Explicitly Not Instrumented in V1

- No session replay / heatmaps (not required by PRD, adds vendor/cost without a named
  requirement).
- No per-factor Match Score A/B testing infrastructure — V1 has one fixed rule set
  (architecture §15); revisit only if post-launch data (per §3/§6 above) motivates a
  documented weight change, applied globally, not experimented on a subset of users.
- No CAC/attribution tooling beyond the `account_registered` event — ad-platform-side
  attribution is out of this document's scope.

## 8. Privacy Note

Analytics events never carry raw PII beyond internal IDs already covered by
`engineering/security.md` (no email/phone/ID-document content in event properties). PostHog
project configuration should disable IP-based geolocation persistence beyond what's needed
for basic country-level reporting, consistent with `config/CONSTRAINTS.md`'s general data-
minimization posture.
