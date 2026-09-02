# UX Review

**Artifact reviewed:** design/journeys.md, design/information-architecture.md,
design/screen-inventory.md, design/UX-spec.md (backlog item UX-001, "Clin" / Nanamex)
**Reviewer role:** UX Critic (independent review-only)
**Basis:** product/prd.md, product/prd-addendum.md, config/PROJECT.md,
config/CONSTRAINTS.md, agent/qa/prd-review.md, agent/BACKLOG.md (UX-001 acceptance criteria)

This review does not modify any of the four design/ files.

## Verdict

**PASS_WITH_MINOR_ISSUES**

This is a strong, disciplined UX pass. All five decisions product/prd-addendum.md explicitly
delegated to UX are actually made, reasoned, and designed end-to-end (not just asserted) —
including the two decisions most load-bearing for the addendum's fix to the confounded North
Star metric (paywall trigger point, and the free/paid boundary). Admin journeys are complete
enough to hand to TECH_ARCHITECTURE. Mobile-first coverage is genuine and admin's
desktop-only scope is correctly justified against CONSTRAINTS. The issues found below are
internal inconsistencies and a few unaddressed edge cases — none of them undermine the five
delegated decisions or reopen a PRODUCT_GATE-level question. They should be fixed (a few are
one-line corrections) but do not warrant a full REVISE cycle.

## Critical Issues

None.

## Important Issues

### 1. J-FAM-1 self-contradicts on whether email/phone verification is a hard gate before "crear necesidad"

In `design/journeys.md`, J-FAM-1's **Decisions** line states: "a family cannot skip
phone/email verification and proceed to create a necesidad (**hard gate**)". Its own
**Failure paths** line, two lines below, states the opposite: "family can still create a
necesidad in a **soft-gated state**... but cannot proceed past the paywall (FAM-08) until
both are verified." `AUTH-03`'s spec in UX-spec.md agrees with the *soft*-gate reading
("user may continue browsing in a limited state... not fully blocked from the app").

This is a direct self-contradiction inside one journey, and it matters: whether "crear
necesidad" itself requires full verification is exactly the kind of behavior
TECH_ARCHITECTURE/BUILD should not have to guess about. Two of three mentions support the
soft-gate reading, so this is likely a one-line editing slip in the "Decisions" bullet, not a
deeper design problem — but it should be corrected before TECH_ARCHITECTURE reads this
document, since it directly names "hard gate" as if it were the resolved behavior.

**Recommendation:** Delete or rewrite J-FAM-1's "Decisions" line to match the soft-gate
behavior actually specified everywhere else (AUTH-03, Failure paths).

### 2. Pipeline "Nueva" state's creation trigger is inconsistent between the IA object model and FAM-11's empty state

`information-architecture.md`'s object table lists **Estado de candidatura (Pipeline)**
with states `Nueva, Contactada, Entrevista, Contratada, Descartada` — implying "Nueva" is a
real, distinct pipeline state that exists for a matched-but-not-yet-contacted candidate,
matching PRD section 5's literal state list.

But `UX-spec.md`'s FAM-11 screen spec defines its **empty state** as "no candidates
**contacted** yet — points back to FAM-04," which implies the pipeline view is literally
empty (no rows at all, including no "Nueva" rows) until the family takes a contact action.
If "Nueva" candidates aren't shown in the pipeline until contacted, then either (a) "Nueva"
never actually appears in FAM-11 and the state is vestigial, or (b) the pipeline should show
every matched candidate as "Nueva" and FAM-11 should essentially never be "empty" as long as
FAM-04 has any matches — which contradicts the stated empty-state condition.

This is a real modeling ambiguity that TECH_ARCHITECTURE needs resolved before deciding when
a `Solicitud`/pipeline record is created (at match time vs. at first contact).

**Recommendation:** Clarify in FAM-11's spec whether "Nueva" candidates are shown in the
pipeline view pre-contact (in which case rewrite the empty-state condition to "no matches at
all") or whether the pipeline is scoped to contacted-and-beyond candidates only (in which
case FAM-04's ranked list is where "Nueva" effectively lives, and the IA's object-state list
should say so explicitly).

## Minor Issues

- **FAM-10's "optional message field"** to the candidate at the moment of "Solicitar
  entrevista" sits close to the "no chat/mensajería propia" non-goal (PRD section 9). It's a
  single one-shot text field attached to a paid action, not a threaded conversation, so it's
  very likely fine — but flag it for TECH_ARCHITECTURE/BUILD awareness so it isn't quietly
  grown into anything resembling in-app messaging post-launch.
- **No niñera-side "decline" action after formal contact.** Once a family sends "Solicitar
  entrevista" (paid), the niñera's only view is read-only (NIN-09); there's no in-app action
  for her to signal "no estoy disponible / no interesada" back through the platform — the
  family would only find out off-platform and would have to manually mark "Descartada." This
  appears to be a deliberate, explicitly-reasoned choice (J-FAM-4: "State transitions are
  family-initiated only... avoids building bidirectional state-sync complexity not specified
  in the PRD"), consistent with the no-chat non-goal, so it is not a defect — but it is a
  real comprehension gap worth naming for SOP/DOCUMENTATION: families should be told this
  explicitly (e.g. in onboarding copy) so they don't expect a platform-native decline signal.
- **Destructive admin action ("Eliminar cuenta," ADM-05) has no specified confirmation
  step.** Given this is irreversible, a confirm dialog should be added to the ADM-05 spec
  (standard pattern, not a design gap per se — just missing from the written spec).
- **Editing an active necesidad's requirements mid-flow** is only explicitly designed as a
  recovery path from FAM-04's zero-match empty state (link back to FAM-03's revisión step).
  There's no explicit spec for a family editing an already-active necesidad that already has
  contacted candidates (e.g., raising the pay range after a partial pipeline exists) — a
  plausible real scenario. Not required by the PRD explicitly, but worth a short note in
  UX-spec.md's Part E ("open items") for TECH_ARCHITECTURE, similar to how other open
  questions are already flagged there.
- **Editing profile fields after "Identidad verificada" is granted** (e.g., a niñera changes
  her displayed name post-approval) has no specified effect on the badge. Not required by
  PRD/CONSTRAINTS, but a trust-integrity edge case worth a one-line note (e.g., "editing
  [name] after verification does/does not require re-verification") before TECH_ARCHITECTURE
  finalizes the data model — low severity, easy to add later.

## Missing States

Beyond the two Important items above (which are inconsistencies, not omissions), no missing
states were found for the core flows. Specifically confirmed present: zero-match empty state
(FAM-04), zero-opportunity empty state (NIN-03/04), zero-open-vacante empty state (NIN-05),
draft/incomplete necesidad and profile states, session-expiry preservation of destination
(SYS-02), offline state (SYS-03), payment failure/retry (FAM-09), rejected-verification
resubmit path (NIN-08/ADM-03), candidate/vacante becoming unavailable mid-session (FAM-06/
NIN-06 "unavailable" state), permission-denied role-mismatch redirects, and duplicate-account
registration handling with a login escape hatch.

## PRD Coverage

Checked against PRD section 5's full MVP list and product/prd-addendum.md's five delegated
decisions:

| PRD/Addendum item | Coverage | Notes |
|---|---|---|
| Familia: registro/login, perfil, crear necesidad (6 fields), listado, filtros, perfil completo, favoritas, solicitar entrevista, estado de candidatas | Covered | FAM-01–FAM-13; all six necesidad fields present in FAM-03 |
| Niñera: registro/login, perfil+foto, zona, experiencia, disponibilidad, expectativa salarial, modalidades, descripción, referencias, aplicar/mostrar interés | Covered | NIN-01–NIN-11 |
| Confianza y seguridad: verificación teléfono/correo, verificación identidad+badge, referencias, reportar | Covered | AUTH-03, NIN-08, ADM-02/03, FAM-12/NIN-10, ADM-04/05 |
| Match Score display (% + checklist) | Covered, correctly scoped | Display format only; weights/thresholds explicitly and correctly left to TECH_ARCHITECTURE (UX-spec Part E #1) — exactly matches addendum's intent, no invented business logic |
| Children's age data as ranges, never exact age/birthdate | Covered | Fixed range set in FAM-03; explicitly called out as the CONSTRAINTS resolution |
| Decision 1 — Niñera discovery model (hybrid) | Resolved, designed end-to-end | Journey (J-NIN-4), IA nav (Oportunidades/Explorar sub-tabs, dedicated routes), screens (NIN-04/05/06) all consistent |
| Decision 2 — Referencias visually distinct from verified badge | Resolved, designed at screen level | FAM-06/NIN-07 specify separate section, no badge iconography, explicit "self-reported" labeling |
| Decision 3 — Pending-verification honest state | Resolved, consistently applied | Three states (No verificada/Verificación en proceso/Identidad verificada) applied consistently across NIN-03, NIN-07, NIN-08, FAM-04, FAM-06 per screen-inventory's coverage check |
| Decision 4 — Paywall gates only contact, not browsing/favoriting | Resolved, consistently applied | Confirmed across Decision 4, FAM-04/06/07/08 specs, and IA; the "encontró candidata compatible" vs. "contactó candidata" event split needed by the addendum's North Star fix is explicitly preserved |
| Decision 5 — Reported profile handling is admin-internal, no public mark, no deranking | Resolved, explicit anti-abuse reasoning | Decision 5 explicitly reasons about the bad-faith-report abuse vector; correctly frames itself as a default, deferring escalation-policy specifics to SOP rather than overstepping into SOP's ownership |
| Admin journeys (verification queue, report queue) | Complete enough for handoff | FIFO + SLA color-coding, reason codes, resolution actions, escalation ownership correctly deferred to SOP |
| Mobile-first coverage, admin desktop-only | Covered and correctly scoped | Explicit per-screen responsive behavior (Part D); admin exception is justified against CONSTRAINTS' "Mobile QA: not applicable" |

## Recommended Revisions

1. Fix J-FAM-1's self-contradicting "Decisions" line (hard gate vs. soft gate) — one-line
   edit, no new design work required (Important #1).
2. Clarify FAM-11's empty-state condition against the IA's Pipeline object model so "Nueva"
   has one unambiguous meaning (Important #2).
3. Add a confirmation step to ADM-05's "Eliminar cuenta" action (Minor).
4. Add a short Part E entry noting mid-flow necesidad editing (post-first-contact) and
   post-verification profile-edit badge integrity as open items for TECH_ARCHITECTURE,
   consistent with how other open items are already flagged in that section (Minor).

None of these require re-running the full UX phase; they are narrow, targeted edits to
existing documents.

## Exit Criteria Assessment

Assessed against UX-001's acceptance criteria (agent/BACKLOG.md):

- **design/journeys.md covers familia, niñera, and admin (verification + reports) journeys
  end-to-end** — PASS (one internal contradiction noted above, Important #1).
- **design/information-architecture.md** — PASS, consistent with screen-inventory.md and
  journeys.md except for the Pipeline/"Nueva" ambiguity noted above (Important #2).
- **design/screen-inventory.md covers every MVP surface plus addendum-mandated states
  (pending-verification, paywall/contact-gate, reported-profile)** — PASS, explicit coverage
  checklist included and verified accurate against the four documents.
- **design/UX-spec.md resolves the deferred spikes UX owns** (niñera self-serve browsing,
  referencias visual distinction, pending-verification state) — PASS, all three resolved with
  explicit reasoning, plus the paywall-trigger and reported-profile decisions also resolved
  (both load-bearing for the addendum's North Star fix and abuse-vector concern
  respectively).
- **UX Critic has reviewed and returned PASS or PASS_WITH_MINOR_ISSUES** — met by this
  document: **PASS_WITH_MINOR_ISSUES**. No further review cycle is required; the orchestrator
  may proceed to mark UX VERIFIED once the two Important items are corrected (or explicitly
  accepted as low-risk and logged in agent/DECISIONS.md), and hand off to UI/
  TECH_ARCHITECTURE.
