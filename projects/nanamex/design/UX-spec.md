# UX Spec — Clin (Nanamex)

This is the detailed screen specification, interaction/state design, and responsive
behavior document. It also formally resolves the five UX-owned decisions deferred by
`product/prd-addendum.md`. Screen IDs match `design/screen-inventory.md`.

---

## Part A — UX Decisions on Deferred Spikes

Per `product/prd-addendum.md`, these five items were explicitly left for UX to decide (not
silently invent, not leave implicit). Each includes the decision and the reasoning.

### Decision 1 — Niñera-side discovery model: hybrid (passive + active)

**Decision:** Niñeras get both channels: (a) pushed "Oportunidades" from the rules engine
(as the PRD literally describes), **and** (b) a self-serve "Explorar vacantes" screen
(NIN-05) where they can browse/search all open necesidades and proactively "mostrar
interés," identical in mechanics to acting on a pushed opportunity.

**Reasoning:**
- The addendum frames this explicitly as a supply-liquidity risk mitigation: since the
  Match Score algorithm's weights are themselves unspecified/unvalidated (a separate
  deferred spike), a purely passive model has a single, unproven point of failure for the
  entire niñera side of the marketplace. Giving niñeras a fallback removes that
  single-point dependency without weakening the passive channel — both coexist.
- It does not expand approved V1 scope: PRD section 5 already lists "Aplicar/mostrar
  interés en oportunidades" as a niñera capability. This decision only adds a second way to
  *reach* that same, already-approved action (browsing a listing vs. receiving a push) — it
  does not add a new terminal capability, a new paid feature, or a new object type.
  Families already get an equivalent capability ("Listado de niñeras compatibles" +
  "Filtros básicos"); giving niñeras a symmetrical browse view is consistent with the
  two-sided nature of the product, not scope creep.
- Risk this decision does NOT create: no niñera-side paywall is introduced by this
  (browsing and "mostrar interés" remain free, consistent with PRD section 7 "niñeras
  gratis"), and no in-app messaging/chat is introduced (mostrar interés is still a discrete
  action, not a conversation).

### Decision 2 — "Referencias" are self-reported; visually distinct from the verified-identity badge

**Decision:** References are presented as **self-reported, unverified** information. They
live in a clearly separate profile section (not inside a "Confianza y seguridad verificada"
cluster), use plain text-list styling with a neutral/informational icon, and are labeled
"Referencias (proporcionadas por la niñera)" — no checkmark, shield, or badge iconography,
and never placed adjacent to or visually similar to the "Identidad verificada"/"Verificación
en proceso" badge (see Decision 3).

**Reasoning:**
- Neither the PRD nor CONSTRAINTS defines an operator reference-check process (CONSTRAINTS
  only specifies manual review for *identity*, via uploaded ID). Inventing an
  operator-verified references process would silently add operational scope (SOP workload,
  a contact-checking workflow) never approved anywhere. Treating references as
  self-reported is the only option consistent with actually-approved scope.
- The Product Critic review flagged the specific risk this decision addresses: grouping
  unverified references under "Confianza y seguridad" next to phone/email OTP and ID review
  risks implying equal rigor. The fix is visual/informational, not a new verification
  feature — different iconography, different section, explicit "no verificado" framing in
  copy.
- If real reference-checking becomes valuable post-V1, it should go through
  PRODUCT_STRATEGY as new scope, not be backed into a UX decision now.

### Decision 3 — Pending-verification is a distinct, honest visual state (not absence of a badge)

**Decision:** Two mutually exclusive, always-visible states on every niñera profile
surface (list cards and detail): **"Verificación en proceso"** (neutral/amber tone, clock
icon) and **"Identidad verificada"** (affirmative/green tone, shield-check icon). A third
state, **"No verificada"** (gray, outline icon, only before any ID has been submitted),
covers niñeras who haven't started verification at all. All three states keep the profile
fully visible/browsable/matchable, per the addendum's explicit resolution — none of the
three ever hides or deprioritizes a profile in listings or matching.

**Reasoning:**
- The addendum is explicit that hiding unverified profiles would silently throttle supply
  and contaminate the North Star reading (this was Critical Issue #2 in the Product Critic
  review). An honest, always-present state label is how UX keeps that resolution intact
  while still being truthful to families about what's actually been checked.
- Three states, not two: "No verificada" (never submitted) and "Verificación en proceso"
  (submitted, awaiting admin) are meaningfully different for a family deciding how much
  weight to put on the absence of a green badge, and different for a niñera deciding
  whether she needs to act (upload an ID) vs. wait. Collapsing them into one "not verified"
  state would lose that actionable distinction.
- Placement/hierarchy: the badge sits next to the niñera's name/photo (same visual slot
  regardless of which of the three states is active), so a family always sees *some*
  status, never an empty space that could be misread as an error or overlooked entirely.

### Decision 4 — Paywall/contact-gate: fires only on "Contactar" / "Solicitar entrevista," never on browsing, filtering, or favoriting

**Decision:** The gate (FAM-08) appears at the exact moment a family clicks **"Contactar"**
on a candidate profile (FAM-06) or **"Solicitar entrevista"** (FAM-10 entry point). Viewing
the ranked list (FAM-04), applying filters (FAM-05), opening a full profile (FAM-06), and
saving favoritas (FAM-07) all remain entirely free and unlimited, per PRD section 7's
explicit "Gratis: crear necesidad y visualizar candidatas."

**Reasoning:**
- This is the narrowest reading of PRD section 7 consistent with the addendum's own
  analytics resolution: the addendum requires distinguishing "encontró candidata
  compatible" (fires on viewing a matched profile — must stay free to be a meaningful,
  unconfounded signal) from "contactó candidata" (fires only after payment). If browsing or
  favoriting were also gated, the "found a match" event would itself be paywall-contaminated,
  defeating the addendum's entire purpose in adding that instrumentation.
- The specific mechanics beyond the trigger point — what "contactar" includes (uncapped
  within 30 days vs. capped), what happens to in-progress conversations at expiration, what
  "verificaciones adicionales" adds at the premium tier — are explicitly out of this
  document's scope (TECH_ARCHITECTURE spike, per addendum). FAM-08/FAM-09 are specified
  below with that gap flagged inline, not silently resolved.
- Niñera-side "mostrar interés" is never gated (Decision 1) — the paywall is one-sided by
  design (PRD section 7: "niñeras gratis"), so this decision only touches family-side
  screens.

### Decision 5 — Reported profiles stay fully visible; "under review" is admin-internal only, never public

**Decision:** A profile with an open report is not hidden, throttled, or publicly marked in
any way. The only visible trace of a pending report is internal — in ADM-04/ADM-05's status
column ("Nuevo" / "En revisión" / "Resuelto") — never on the profile itself as seen by
families, other niñeras, or the reported user.

**Reasoning:**
- Consistency with Decision 3's precedent: the product already treats "pending review" as a
  state that should not penalize the reviewed party until a human has actually acted (same
  logic as unverified-but-pending identity). Applying a different, harsher default to
  reports (auto-hide on a single unverified accusation) would be an inconsistent trust
  model and would create an obvious abuse vector — a bad-faith report could otherwise
  instantly remove a competitor from visibility with zero verification.
- This is explicitly a default, not a final policy: SOP owns the actual moderation runbook,
  including escalation thresholds (e.g., whether a *pattern* of multiple independent
  reports should trigger an automatic temporary suspension before manual review completes).
  This document only fixes the UX/trust-framing default for a single, unreviewed report;
  SOP may layer stricter automatic escalation rules on top for repeat/severe cases without
  contradicting this decision.
- Flagged dependency: `agent/BACKLOG.md`'s SOP phase should treat this as the accepted
  starting default when it authors the moderation runbook, not re-derive it from scratch.

---

## Part B — Screen Specifications

Only screens with non-trivial behavior get a full spec below. Simple/self-explanatory
screens (AUTH-04 Login, AUTH-05 Recuperar contraseña, FAM-01 Onboarding perfil familiar,
FAM-07 Favoritas, FAM-13 Cuenta, NIN-01/02 profile wizard steps, NIN-11 Cuenta, ADM-01 Admin
login) follow standard patterns implied by their one-line purpose in the screen inventory
and are not separately detailed, to keep this document focused on the screens that carry
real product/trust decisions.

### AUTH-02 — Registro

- **Purpose:** Create an account with the minimum info needed to reach verification.
- **Entry points:** AUTH-01 landing role selection; "Crear cuenta" link from AUTH-04 login.
- **Content hierarchy:** Role indicator (Familia/Niñera, already chosen) → form → legal
  consent checkbox (terms/privacy) → submit.
- **Inputs:** Nombre, correo, teléfono, contraseña (+ confirmación).
- **Actions:** Crear cuenta; switch role ("¿Eres familia? / ¿Eres niñera?" link back to role
  selection); link to login for existing accounts.
- **Validation:** Required fields; email format; phone format (México, +52); password
  minimum strength; duplicate-email/phone check server-side.
- **System responses:** Success → AUTH-03 (verification). Duplicate account → inline error
  with a "Iniciar sesión" link, not a dead-end message.
- **Exit paths:** AUTH-03 (success), AUTH-04 (existing account), back to AUTH-01 (role
  switch).

### AUTH-03 — Verificación de correo/teléfono

- **Purpose:** Confirm ownership of contact channels used for all downstream notifications
  (niñera opportunity pushes, family pipeline-state notifications, OTP-based trust signal).
- **Entry points:** Immediately after AUTH-02; re-entered from FAM-13/NIN-11 if a channel
  later becomes unverified (e.g. changed phone number).
- **Content hierarchy:** Two independent checklist items — Correo (link-based), Teléfono
  (OTP code entry) — each shows its own pending/verified state; both must complete to fully
  clear this gate.
- **Inputs:** 6-digit OTP code (teléfono); no input for correo (click emailed link).
- **Actions:** Reenviar código / reenviar correo (with cooldown, e.g. 60s); continuar.
- **Validation:** OTP must match and not be expired (e.g. 10 min); rate-limit resend
  attempts.
- **System responses:** Both verified → proceed to role-specific onboarding (FAM-01 or
  NIN-01). Partial verification (e.g. correo pending) → user may continue browsing in a
  limited state (per J-FAM-1: cannot pass the paywall / cannot have opportunities pushed
  reliably until both channels are confirmed) but is not fully blocked from the app, to
  avoid an onboarding dead end.
- **Exit paths:** FAM-01/NIN-01 (full success); app home in "cuenta no verificada" banner
  state (partial).
- **States:** loading (sending code/checking), error (invalid/expired OTP — clear inline
  message with a retry action, not a full-page failure), success.

### FAM-03 — Crear necesidad (wizard)

- **Purpose:** Capture all fields the matching engine needs.
- **Entry points:** FAM-02 "Crear necesidad" CTA; resume link on an incomplete draft.
- **Content hierarchy (one step per screen on mobile; single scroll on desktop):**
  1. **Niños:** número de niños (stepper) + **rango de edad** per child, chosen from a
     fixed set of options (e.g. 0–1 año, 1–3 años, 3–6 años, 6–12 años, 12+ años) — **never**
     a numeric age field, date picker, or birthdate input, per CONSTRAINTS. This is the
     concrete resolution of the addendum's "rango de edad" wording spike.
  2. **Zona:** address/colonia autocomplete or map-pin selection.
  3. **Días y horarios:** day-of-week multi-select + time range(s).
  4. **Modalidad:** single-select — planta / entrada por salida / ocasional.
  5. **Rango de pago:** min–max slider or two numeric inputs (currency MXN).
  6. **Fecha de inicio:** date picker.
  7. **Responsabilidades esperadas:** checklist of common responsibilities (e.g. "preparar
     alimentos," "ayuda con tareas," "transporte escolar") + free-text "otros."
  8. **Revisión:** full summary of all above, editable inline before submit.
- **Inputs:** As listed per step.
- **Actions:** Siguiente / Atrás per step; Guardar y salir (persists draft); Publicar
  necesidad (final step).
- **Validation:** Each step requires its fields before "Siguiente" is enabled; rango de
  pago min ≤ max; fecha de inicio cannot be in the past.
- **System responses:** Publish triggers rules-based matching (algorithm internals owned by
  TECH_ARCHITECTURE) and routes to FAM-04. Draft auto-saves on every step transition.
- **Exit paths:** FAM-04 (published), FAM-02 (saved as draft and exited).
- **States:** default, loading (matching computation — should be near-instant for a
  rules-based engine, but show a brief loading state defensively), empty (see FAM-04),
  error (e.g. network failure on publish — retry without losing entered data).

### FAM-04 — Listado de candidatas

- **Purpose:** Present ranked matches for one necesidad.
- **Entry points:** FAM-03 publish; FAM-02 necesidad card tap.
- **Content hierarchy:** Necesidad summary header (collapsible) → filter bar/entry to FAM-05
  → ranked candidate cards, each showing: photo, nombre, Match Score % (large, prominent —
  per PRD section 6 example format), verification-status badge (Decision 3), top 3–5
  checklist highlights (✓ items, per PRD section 6 example, e.g. "✓ Disponible L–V," "✓
  Trabaja en tu zona"), "Guardar favorita" icon, "Ver perfil" CTA.
- **Inputs:** none directly (filters live in FAM-05).
- **Actions:** Ver perfil (→ FAM-06); Guardar favorita (toggle, free); abrir filtros (→
  FAM-05).
- **Validation:** n/a (read surface).
- **System responses:** List re-ranks/re-filters client-side or server-side as filters
  change (FAM-05).
- **Exit paths:** FAM-06 (profile detail), FAM-07 (via favorited items later), FAM-02 (back).
- **States:**
  - **Default:** populated ranked list.
  - **Loading:** skeleton cards while matches compute/load.
  - **Empty (zero matches):** not an error — explicit empty state: "Aún no encontramos
    candidatas compatibles con esta necesidad" + actionable guidance to broaden the most
    likely blocking field (e.g. "Intenta ampliar tu zona o rango de pago") + link back to
    edit the necesidad (FAM-03 revisión step). This directly addresses the UX Critic's
    "missing recovery flow" concern for a no-results scenario.
  - **Partial (few, low-score matches):** shown normally, no artificial threshold hides them
    (the addendum/PRD do not define a minimum score cutoff — showing everything ranked,
    with the score itself as the honesty signal, avoids UX inventing a threshold
    TECH_ARCHITECTURE hasn't specified).
  - **Error:** matching/listing failed to load — retry action, not a blank screen.

### FAM-06 — Perfil de niñera (candidate detail)

- **Purpose:** Full evaluation view before deciding to contact.
- **Entry points:** FAM-04, FAM-07 (favoritas).
- **Content hierarchy:** Photo + nombre + verification-status badge (Decision 3, same visual
  treatment as list card) → Match Score detail (% + full checklist, more items than the
  card preview) → Experiencia (años, edades específicas) → Disponibilidad → Modalidades
  aceptadas → Expectativa salarial → Descripción personal → **Referencias** section, visually
  separated and labeled per Decision 2 → actions footer (sticky on mobile).
- **Inputs:** none (read surface) besides the report/favorite/contact actions below.
- **Actions:** Guardar favorita (free); Reportar (→ FAM-12); **Contactar** / **Solicitar
  entrevista** (→ triggers Decision 4's gate: FAM-08 if not unlocked, FAM-10 directly if
  already unlocked for this family's active 30-day window).
- **Validation:** n/a.
- **System responses:** Opening this screen fires the "encontró candidata compatible"
  analytics event (per addendum instrumentation and Decision 4's reasoning) — this happens
  regardless of payment status, since it must be an unconfounded signal.
- **Exit paths:** FAM-08/FAM-10 (contact flow), FAM-04 (back), FAM-12 (report).
- **States:** default, loading, unavailable (candidate profile was removed/deactivated
  between list-load and open — clear message + back to FAM-04, not a broken page), error.

### FAM-08 — Paywall / Desbloquear contacto

- **Purpose:** The explicit contact-gate moment (Decision 4).
- **Entry points:** "Contactar"/"Solicitar entrevista" from FAM-06, for a family without an
  active entitlement.
- **Content hierarchy:** Candidate context (photo/name, so the family remembers who they're
  unlocking contact for) → offer: "MX$299 · Contacta candidatas durante 30 días" → what's
  included (copy here is intentionally generic pending TECH_ARCHITECTURE's resolution of
  exact feature-gating mechanics — see flagged gap below) → CTA to checkout (FAM-09).
- **Inputs:** none on this screen (moves to payment details in FAM-09).
- **Actions:** Continuar a pago (→ FAM-09); Cerrar (dismiss, returns to FAM-06 with
  "Contactar" still locked).
- **Validation:** n/a.
- **System responses:** Dismissing does not lose the family's favorited/browsed state.
- **Exit paths:** FAM-09 (proceed), FAM-06 (dismiss).
- **⚠️ Flagged dependency (not resolved here, per addendum):** whether the MX$299 unlock is
  uncapped-within-30-days or capped at N contacts, whether it's scoped to one necesidad or
  account-wide, and what the premium tier (MX$499–699) concretely adds are
  TECH_ARCHITECTURE spikes. This screen's copy must be revisited once those are resolved —
  it is deliberately written generically now rather than inventing specifics.
- **States:** default, loading (transitioning to checkout), error (e.g. entitlement check
  failed to load — retry).

### FAM-09 — Checkout / Confirmación de pago

- **Purpose:** Complete payment and grant entitlement.
- **Entry points:** FAM-08 "Continuar a pago."
- **Content hierarchy:** Order summary (MX$299 / 30 días) → payment fields (provider TBD by
  TECH_ARCHITECTURE) → confirm.
- **Inputs:** Payment method fields (provider-dependent — not specified here).
- **Actions:** Confirmar pago; Cancelar (→ FAM-08).
- **Validation:** Provider-dependent (out of UX scope).
- **System responses:** Success → entitlement activated, "contactó candidata" analytics
  event fires (per addendum), redirect to FAM-10 for the specific candidate that triggered
  the gate. Failure → stays on FAM-09 with a clear, specific error (declined card, network
  issue) and a retry action — never a silent failure back to FAM-06.
- **Exit paths:** FAM-10 (success), FAM-08 (cancel), FAM-09 itself (retry on error).
- **States:** default, loading (processing payment — must not be dismissible mid-submit, to
  avoid duplicate charges), error (specific reason surfaced), success.

### FAM-10 — Solicitar entrevista

- **Purpose:** Formal contact/interview request after unlock.
- **Entry points:** Post-payment redirect (FAM-09), or directly from FAM-06 if already
  unlocked.
- **Content hierarchy:** Candidate's revealed contact info (per whatever
  TECH_ARCHITECTURE decides "contactar" reveals — e.g. phone/WhatsApp) + optional message
  field + "Marcar como contactada" confirmation.
- **Inputs:** Optional message/note to the candidate.
- **Actions:** Confirmar solicitud (advances FAM-11 pipeline state to "Contactada");
  Cancelar.
- **System responses:** Niñera is notified (in-app + email/SMS) that a family wants to
  connect — this is the moment her "Mis solicitudes" (NIN-09) reflects "Contactada" for this
  vacante.
- **Exit paths:** FAM-11 (pipeline view).
- **States:** default, success (confirmation banner), error (notification delivery failure
  — request itself still records, retried delivery in background, not blocking).

### FAM-11 — Estado de candidatas (pipeline)

- **Purpose:** Track each matched candidate from first engagement through hire/discard.
- **Entry points:** FAM-02 necesidad card; FAM-10 post-contact redirect.
- **Content hierarchy:** Per necesidad, a board/list of candidates grouped by state (Nueva,
  Contactada, Entrevista, Contratada, Descartada). Desktop: kanban columns. Mobile:
  segmented control / tabs (kanban columns don't fit a narrow viewport — see Responsive
  Behavior).
- **Inputs:** none besides state-change controls.
- **Actions:** Avanzar estado (dropdown/buttons: e.g. "Marcar entrevista agendada," "Marcar
  contratada," "Descartar"); Ver perfil (→ FAM-06). Nueva → Contactada happens only via
  FAM-10's "Solicitar entrevista" flow (paid), not via a manual control on this screen;
  "Avanzar estado" controls apply from Contactada onward.
- **Validation:** State transitions are forward-only in the happy path but "Descartar" is
  available from any state, including Nueva (a family can drop a matched-but-uncontacted
  candidate at any point).
- **System responses:** A pipeline record (state = Nueva) is created automatically the first
  time the family favorites or opens a candidate's full profile (FAM-06) — see
  information-architecture.md's Pipeline object definition; this is what makes "Nueva" a
  real, populated state rather than a state that only exists in the abstract. Every
  subsequent state change notifies the niñera (per J-FAM-4).
- **Exit paths:** FAM-06 (view profile), FAM-02 (back).
- **States:** default, empty (no candidates favorited or viewed yet for this necesidad — i.e.
  no pipeline record exists in any state, including Nueva — points back to FAM-04), success
  (visual confirmation on state change).

### FAM-12 / NIN-10 — Reportar (niñera / familia)

- **Purpose:** File a report (Decision 5 governs what happens after submission).
- **Entry points:** "Reportar" action on FAM-06 / NIN-06 / NIN-07.
- **Content hierarchy:** Reason category (select: e.g. "comportamiento inapropiado,"
  "información falsa," "solicitud de pago fuera de plataforma," "otro") → detail (free
  text, optional unless "otro") → submit.
- **Inputs:** Reason category, detail text.
- **Actions:** Enviar reporte; Cancelar.
- **Validation:** Reason category required.
- **System responses:** Confirmation message per Decision 5's expectation-setting copy
  ("Recibimos tu reporte, lo revisaremos. No garantizamos una respuesta inmediata."). No
  visible change to the reported profile (Decision 5).
- **Exit paths:** back to the profile screen the report was filed from.
- **States:** default, success (confirmation), error (submission failed — retry, do not
  lose entered text).

### NIN-03 — Inicio (niñera dashboard)

- **Purpose:** Orient the niñera on her status and recent activity.
- **Entry points:** Post-login default landing for niñera role.
- **Content hierarchy:** Verification-status banner (Decision 3 — prominent, top of page,
  with the 24–48h expectation-setting copy while pending) → % perfil completo progress bar
  (with a CTA if incomplete) → recent Oportunidades preview (→ NIN-04) → quick link to
  Explorar (→ NIN-05, Decision 1).
- **Actions:** Completar perfil (→ NIN-07), Subir identificación (→ NIN-08, if not yet
  submitted), Ver oportunidades, Explorar vacantes.
- **System responses:** Banner updates live as verification status changes (submitted →
  pending → approved/rejected).
- **Exit paths:** NIN-04, NIN-05, NIN-07, NIN-08.
- **States:** default, empty (no oportunidades yet — encourages completing profile and/or
  using Explorar rather than just waiting), loading.

### NIN-04 — Oportunidades recibidas

- **Purpose:** Passive-channel opportunity list (Decision 1, channel A).
- **Entry points:** NIN-03; push notification tap.
- **Content hierarchy:** List of pushed vacantes, each with Match Score % + niñera-facing
  checklist (e.g. "✓ Tu zona," "✓ Tu disponibilidad," "✓ Dentro de tu expectativa salarial"),
  anonymized family info (no contact details pre-interest).
- **Actions:** Mostrar interés; Descartar (silent, no negative signal to family per
  J-NIN-3); Ver detalle (→ NIN-06).
- **System responses:** "Mostrar interés" flags this niñera as "interesada" on the family's
  FAM-04 card (informational, free — does not touch the paywall).
- **Exit paths:** NIN-06, NIN-09 (after showing interest).
- **States:** default, empty ("Aún no tienes oportunidades. Mientras tanto, explora vacantes
  abiertas" — links to NIN-05, directly using Decision 1 as the empty-state recovery path),
  loading.

### NIN-05 — Explorar vacantes

- **Purpose:** Active-channel browsing (Decision 1, channel B).
- **Entry points:** NIN-03, bottom-nav "Oportunidades" sub-tab, NIN-04 empty state.
- **Content hierarchy:** Filter bar (zona, modalidad, rango de pago, disponibilidad) →
  ranked list of open vacantes (same Match Score format as NIN-04) not yet marked
  Contratada/cerrada.
- **Actions:** Filtrar; Ver detalle (→ NIN-06); Mostrar interés directly from the card.
- **System responses:** No paywall of any kind (Decision 1's reasoning — niñeras remain
  free per PRD section 7).
- **Exit paths:** NIN-06, NIN-09.
- **States:** default, empty (no open vacantes match filters — suggest broadening, mirrors
  FAM-04's empty state pattern), loading, error.

### NIN-06 — Detalle de vacante

- **Purpose:** Full vacante detail before committing interest.
- **Entry points:** NIN-04, NIN-05.
- **Content hierarchy:** Anonymized family summary (zona, no exact address/contact info
  pre-contact — symmetrical to how a family doesn't get a niñera's contact info until they
  pay) → full necesidad detail (children rango de edad, días/horarios, modalidad, rango de
  pago, fecha de inicio, responsabilidades) → Match Score detail.
- **Actions:** Mostrar interés; Reportar (→ NIN-10); back.
- **Exit paths:** NIN-09 (after interest), NIN-05/NIN-04 (back).
- **States:** default, unavailable (vacante was closed/filled since list load — message +
  back, not a broken page).

### NIN-07 — Mi perfil (view/edit)

- **Purpose:** Editable version of what families see on FAM-06.
- **Content hierarchy:** Same structure as FAM-06 but editable, plus the verification-status
  badge is here paired with a direct "Subir identificación"/"Ver estado" action (→ NIN-08)
  when not yet verified. **Referencias** section uses the same visually-distinct,
  non-badge treatment as Decision 2 (this is the authored side — must match how it renders
  on FAM-06 exactly, so the niñera sees what a family sees).
- **Actions:** Editar cada sección; Subir/actualizar identificación.
- **Validation:** Same field-level rules as onboarding (NIN-01/02).
- **System responses:** Changes save per-section (not a single giant form submit), so
  partial edits aren't lost.
- **Exit paths:** NIN-03.
- **States:** default, editing (per section), success (save confirmation), error.

### NIN-08 — Subir identificación

- **Purpose:** ID upload + status display (Decision 3).
- **Entry points:** NIN-01/02 onboarding prompt (optional), NIN-03 banner, NIN-07.
- **Content hierarchy:** Current status (No verificada / Verificación en proceso /
  Identidad verificada / Rechazada — with reason if rejected) → upload control (if
  No verificada or Rechazada) → SLA expectation copy ("normalmente 24–48 horas").
- **Inputs:** ID photo (file/camera capture, mobile-optimized).
- **Actions:** Subir/Reemplazar documento; (none needed if already verified — read-only
  confirmation).
- **Validation:** File type/size limits; basic client-side image-quality nudge (e.g. "asegúrate
  de que se vea nítida"), not a substitute for admin review.
- **System responses:** Submission moves status to "Verificación en proceso" immediately
  (optimistic) and enters ADM-02's queue; profile stays fully visible/matchable throughout
  (Decision 3).
- **Exit paths:** NIN-03/NIN-07.
- **States:** default (no verificada), uploading, pending (en proceso), success (verificada),
  error/rejected (with admin's reason code surfaced in plain language + re-submit CTA).

### NIN-09 — Mis solicitudes

- **Purpose:** Mirrored, read-only view of pipeline state across vacantes she's interested in.
- **Content hierarchy:** List grouped by state (mirrors FAM-11's states) — read-only, since
  per J-FAM-4 the niñera does not drive these transitions.
- **Actions:** Ver detalle (→ NIN-06); no state-changing actions here.
- **Exit paths:** NIN-06.
- **States:** default, empty ("Aún no has mostrado interés en ninguna vacante" → links to
  NIN-04/NIN-05).

### ADM-02 — Cola de verificación de identidad

- **Purpose:** Operator work queue for identity review (J-ADM-1).
- **Content hierarchy:** FIFO table/list — niñera nombre, submission timestamp, time-in-
  queue with SLA color coding (green < 24h, amber 24–48h, red > 48h "SLA excedida," sorted
  so red items surface first regardless of strict FIFO order — an SLA breach should never
  be buried behind newer items).
- **Actions:** Abrir (→ ADM-03).
- **System responses:** Red-flagged rows are the operational escalation signal per addendum
  (exact escalation mechanism/alerting is SOP's call, not specified here).
- **States:** default (queue populated), empty ("Cola vacía — no hay verificaciones
  pendientes"), loading.

### ADM-03 — Detalle de verificación

- **Purpose:** Approve/reject a single submission.
- **Content hierarchy:** ID image (zoomable) side-by-side with profile's stated nombre and
  other profile context → decision controls.
- **Actions:** Aprobar; Rechazar (requires selecting a reason code from a fixed list, e.g.
  "foto ilegible," "nombre no coincide," "documento inválido," "documento no abre" + optional
  note).
- **Validation:** Rechazar cannot submit without a reason code (per J-ADM-1 — a niñera must
  always get an actionable reason).
- **System responses:** Approve → niñera's badge flips to "Identidad verificada" in
  real time; Reject → status returns to "No verificada" with reason surfaced on NIN-08,
  re-submit path open immediately (not a permanent block).
- **Exit paths:** back to ADM-02 (queue advances).
- **States:** default, unavailable (image failed to load/corrupt file — must still allow a
  decision, specifically reject with "no se pudo abrir el documento," rather than stalling
  the item in the queue indefinitely).

### ADM-04 — Cola de reportes

- **Purpose:** Operator work queue for report review (J-ADM-2).
- **Content hierarchy:** FIFO table — reportante, perfil reportado, categoría, timestamp,
  estado (Nuevo/En revisión/Resuelto); profiles with multiple open reports are visually
  flagged/grouped so repeat-reported profiles aren't buried behind older single reports.
- **Actions:** Abrir (→ ADM-05).
- **States:** default, empty, loading.

### ADM-05 — Detalle de reporte

- **Purpose:** Resolve a single report.
- **Content hierarchy:** Reported profile summary, report reason/detail, this user's prior
  report history (if any) → resolution controls.
- **Actions:** Descartar; Advertir; Suspender; Eliminar cuenta. (Exact policy for which
  action fits which severity/pattern is SOP's call — this screen exposes the action set,
  not the policy.) **Eliminar cuenta requires a confirmation step** (modal: "Esta acción es
  permanente y no se puede deshacer" + explicit confirm/cancel) before it executes, given it
  is irreversible; the other three actions execute directly.
- **System responses:** Marking "En revisión" is admin-internal state only (Decision 5) —
  never shown on the public profile. Suspender/Eliminar are the only actions that change
  what other users see (profile hidden/removed); Descartar/Advertir leave the profile
  exactly as it was.
- **Exit paths:** back to ADM-04.
- **States:** default, confirm (Eliminar cuenta only), success (resolution recorded).

---

## Part C — Global / Cross-Cutting States

These patterns apply consistently across all screens listed above, per the UX Designer's
"Design sequence" and "States" responsibilities — not repeated screen-by-screen above where
already covered, but stated once here as the baseline every screen inherits:

- **Loading:** skeleton content matching the eventual layout (not a generic spinner-only
  screen) for list/detail views; button-level spinners for actions (e.g. "Confirmar pago").
- **Empty:** always paired with an actionable next step (never a bare "no hay resultados").
  Specific empty-state copy is defined per screen above where it's non-obvious (FAM-04,
  NIN-04, NIN-05, NIN-09, FAM-11, ADM-02, ADM-04).
- **Error:** distinguishes recoverable (retry available, entered data preserved — e.g. form
  submission failures) from unrecoverable (SYS-01 generic fallback, e.g. broken deep link).
  Never a silent failure with no user-facing acknowledgment.
- **Success:** explicit confirmation for state-changing actions (favoritar, reportar,
  pagar, avanzar pipeline, aprobar/rechazar verificación) — never assume the user infers
  success from a screen simply changing.
- **Unavailable:** for objects that can be removed/closed mid-session (a candidate profile
  deactivated, a vacante filled) — distinct from "error," since nothing actually broke; the
  underlying object just changed state elsewhere.
- **Permission denied:** role-mismatched routes (e.g. a niñera-role account hitting a
  `/familia/*` URL, or a non-admin hitting `/admin/*`) redirect to that account's own home
  with a neutral message — never expose that the route exists or leak what's behind it.
- **Session expired (SYS-02):** preserves the user's intended destination and returns them
  there post-re-authentication (e.g. mid-checkout on FAM-09 — critical not to lose payment
  context on a session timeout).

---

## Part D — Responsive Behavior

V1 is mobile-first web (per CONSTRAINTS — web only, no native app, but usage is expected
primarily on phones given the target users' existing WhatsApp/Facebook-group habits).
Admin is the one deliberate exception (desktop-first internal tool — see
information-architecture.md section 2).

- **Navigation:** Familia/Niñera use a bottom tab bar on mobile (≤ 3–5 primary items per
  IA), collapsing to a left sidebar at desktop breakpoints. Admin uses a persistent left
  sidebar always (no bottom-tab pattern needed for a small internal team).
- **FAM-03 wizard:** one step per screen on mobile (full-screen steps with a progress
  indicator); collapses to a single scrollable form with section anchors on desktop/wide
  viewports.
- **FAM-04 / NIN-04 / NIN-05 lists:** single-column stacked cards on mobile; multi-column
  grid on desktop. Filters (FAM-05) render as a bottom sheet on mobile, a persistent
  sidebar panel on desktop.
- **FAM-11 pipeline:** kanban columns (Nueva/Contactada/Entrevista/Contratada/Descartada)
  side-by-side on desktop; on mobile, a horizontally-swipeable segmented control/tab set
  showing one state's list at a time, since 5 simultaneous columns don't fit a phone
  viewport without harmful truncation.
- **FAM-08/FAM-09 paywall/checkout:** full-screen modal takeover on mobile (avoids a small
  in-page modal being awkward on a small viewport); centered dialog on desktop.
- **NIN-08 ID upload:** mobile prioritizes native camera capture; desktop offers file
  picker/drag-drop as the primary path (camera capture is a secondary/less relevant flow on
  desktop).
- **Admin queues (ADM-02/04):** table layout assumes desktop viewport widths; no mobile
  card-collapse treatment is specified for V1, consistent with CONSTRAINTS' "Mobile QA: not
  applicable" and the small-internal-team assumption — if an operator ever needs to
  triage from a phone, that is a post-V1 addition, not silently built now.

---

## Part E — Conflicts / Open Items Flagged to Other Phases

Per the UX Designer's mandate to document conflicts rather than silently resolve them
outside UX's ownership:

1. **Match Score weights/thresholds** (PRD section 6): this spec designs the *display*
   format (% + checklist, per the PRD's own example) but intentionally does not invent
   weights, hard-filter vs. soft-factor rules, or a minimum "compatible" threshold — that
   remains TECH_ARCHITECTURE's spike per the addendum. FAM-04's "no artificial threshold"
   decision above is a UX display choice (show everything, ranked), not a resolution of the
   underlying algorithm question.
2. **Paywall feature-gating mechanics** (contact cap, expiration behavior, premium-tier
   contents): flagged inline at FAM-08 above — this document fixes the *trigger moment*
   only (Decision 4), not the entitlement mechanics.
3. **Reported-profile escalation policy beyond the single-report default** (Decision 5):
   this document fixes the default (visible, admin-internal-only "en revisión" marker); SOP
   owns whether report *patterns* (e.g. 3+ independent reports) should auto-escalate beyond
   that default.
4. **ID document retention/deletion policy** (per config/CONSTRAINTS.md "Legal / Data
   Constraints"): NIN-08 assumes documents are stored somewhere pending admin review, but
   this spec does not (and should not) determine how long they're retained after a
   decision is made — that is the pre-existing open human/legal item tracked in
   agent/STATE.md, not a new one raised by UX.
5. **Niñera-side in-app "decline" signal after formal contact**: once a family sends
   "Solicitar entrevista" (paid), the niñera has no in-app action to signal "no disponible /
   no interesada" back through the platform (NIN-09 is read-only past this point) — this is
   an intentional scope choice (see J-FAM-4: state transitions are family-initiated only),
   not a gap to design; SOP/DOCUMENTATION should set user expectations accordingly.
6. **Editing an active necesidad after it already has contacted candidates** (e.g. raising
   the pay range mid-pipeline) is not specified — only the zero-match recovery edit (from
   FAM-04's empty state back to FAM-03) is designed. Flagged for TECH_ARCHITECTURE to decide
   whether/how an edit to a necesidad with an active pipeline affects existing Match Scores
   or pipeline records.
7. **Badge integrity when a verified niñera edits identity-relevant profile fields**
   (e.g. displayed name or photo) after receiving "Identidad verificada" is not specified.
   Flagged for TECH_ARCHITECTURE: does editing name/photo post-verification revoke/reset the
   badge pending re-review, or is it left untouched? Not required by PRD/CONSTRAINTS, but a
   trust-integrity question the data model should answer explicitly rather than by default.
