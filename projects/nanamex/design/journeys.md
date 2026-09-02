# User Journeys — Clin (Nanamex)

Source of truth: `product/prd.md` + `product/prd-addendum.md` (both authoritative together).
Do not treat anything here as changing product scope — where a journey step required a UX
decision the PRD/addendum left open, the decision is called out explicitly with reasoning
inline (also summarized in `design/UX-spec.md` section "UX Decisions on Deferred Spikes").

Roles: **Familia** (family), **Niñera** (nanny/babysitter), **Admin** (internal operator).

---

## FAMILIA

### J-FAM-1 — Registro y configuración de cuenta

- **Trigger:** A family arrives at Clin (referral, search, ad) wanting to find a niñera.
- **Objective:** Create a trustworthy account quickly enough to reach "crear necesidad" without friction.
- **Steps:**
  1. Landing page → elige "Soy familia."
  2. Registro: nombre, correo, teléfono, contraseña (or social/email-link, TECH_ARCHITECTURE to decide provider).
  3. Verificación de correo (link) y teléfono (OTP) — both required per PRD "Confianza y seguridad."
  4. Perfil familiar mínimo (nombre, zona general).
  5. Redirect to "Crear necesidad" (FAM-03).
- **Decisions:** verification is a **soft gate**, not a hard one — a family may proceed to create a necesidad (FAM-03) before completing phone/email verification, to avoid an onboarding dead end. Full verification (both channels) is required before the family can pass the paywall/contact a candidate (FAM-08), since verified contact info is foundational trust infrastructure for the niñera side too, and paid contact is where that trust signal actually matters.
- **System behavior:** OTP resend with cooldown; email link expires (24h) and can be re-sent; duplicate email/phone blocks registration with a clear "ya existe una cuenta" message + login link.
- **Outcome:** Verified family account, ready to create a necesidad.
- **Failure paths:** OTP not received → resend / change number. Email verification abandoned → account exists but is limited (see FAM-13 "cuenta no verificada" banner); family can still create a necesidad in a soft-gated state per product intent to reduce onboarding friction, but cannot proceed past the paywall (FAM-08) until both are verified — contacting a candidate requires full trust signals on both sides.

### J-FAM-2 — Crear necesidad (vacante)

- **Trigger:** Verified family wants to define what kind of niñera they need.
- **Objective:** Produce a complete, matchable "necesidad" with minimum required fields.
- **Steps:**
  1. Multi-step wizard (mobile-first, one section per step): (a) Niños — número y **rango de edad** per child or per group (see CONSTRAINTS: age ranges only, never exact age/birthdate); (b) Zona; (c) Días y horarios; (d) Modalidad (planta / entrada por salida / ocasional); (e) Rango de pago; (f) Fecha de inicio; (g) Responsabilidades esperadas (checklist + free text).
  2. Review screen summarizing all fields before submit.
  3. Submit → system runs rules-based matching (algorithm/weights owned by TECH_ARCHITECTURE per addendum) → redirect to FAM-04 (listado de candidatas).
- **Decisions:** Family chooses a **rango de edad** from a fixed set of ranges (e.g. 0–1, 1–3, 3–6, 6–12 años) — never a numeric age input or date picker. This is a hard CONSTRAINTS requirement, called out explicitly here since PRD section 5 wording ("edad de niños") is looser.
- **System behavior:** Draft auto-saved between steps (family can abandon and resume). Validation per step (cannot advance with required field empty). On submit, if zero candidates match, family still reaches FAM-04 but in its **empty state** (not an error) with guidance to broaden criteria.
- **Outcome:** An active "necesidad" exists; family sees a candidate list (populated or empty).
- **Failure paths:** Family abandons mid-wizard → draft persists, resumable from FAM-02 dashboard ("Necesidad incompleta"). Family submits an unrealistic combination (e.g. very low pay + planta modality) → not blocked, but empty-state messaging on FAM-04 should suggest which field to relax (non-blocking hint, not a hard rule).

### J-FAM-3 — Ver candidatas, revisar perfil, y contactar (paywall moment)

- **Trigger:** Family has an active necesidad with one or more matched candidatas.
- **Objective:** Evaluate candidates and reach out to the best fit.
- **Steps:**
  1. FAM-04 listado shows ranked candidatas with Match Score (%) + checklist (per PRD section 6 example format) and verification-status badge (see UX Decision #3).
  2. Family applies filtros básicos (zona, modalidad, rango de pago, disponibilidad).
  3. Family opens a candidate's full profile (FAM-06) — **free**, per PRD section 7 ("Gratis: crear necesidad y visualizar candidatas"). Full profile includes experience, availability, referencias (self-reported, visually distinct — UX Decision #2), verification-status badge (UX Decision #3), Match Score detail.
  4. Family can "Guardar favorita" (free, unlimited) at any point.
  5. Family clicks "Contactar" or "Solicitar entrevista" → **paywall gate fires** (FAM-08) — this is the exact moment gated by PRD section 7's MX$299/30-day mechanic (see UX Decision #4 for the precise trigger point and what stays free).
  6. If already unlocked (active 30-day entitlement) → skip gate, go directly to FAM-10 (solicitar entrevista).
  7. If not unlocked → FAM-08 shows the offer, family completes checkout (FAM-09; payment mechanics/entitlement rules are a TECH_ARCHITECTURE spike per addendum — this journey only fixes the *trigger moment* and the *before/after states*, not the payment flow internals).
  8. On successful payment → entitlement unlocked for 30 days → redirect back to the candidate profile with "Contactar" now enabled → FAM-10.
- **Decisions:** See UX Decision #4 (paywall trigger point = "Contactar"/"Solicitar entrevista" action, never viewing/filtering/favoriting).
- **System behavior:** Two analytics events fire at distinct moments per addendum's instrumentation requirement: "encontró candidata compatible" fires when family opens a matched candidate's full profile (step 3); "contactó candidata" fires only on successful payment + contact action (step 8) — kept as separate events so a family that finds a match but doesn't pay isn't misread as a matching failure.
- **Outcome:** Family has sent a contact/interview request to at least one candidate.
- **Failure paths:** Payment fails/declines → return to FAM-08 with error state, no entitlement granted, candidate profile remains view-only. Family closes the paywall modal without paying → returns to FAM-06, "Contactar" remains locked, candidate stays saved as favorita if previously saved. Zero candidates ever reach this point (empty state on FAM-04) → journey ends at J-FAM-2's empty-state guidance instead.

### J-FAM-4 — Gestionar pipeline y entrevista

- **Trigger:** Family has contacted one or more candidatas.
- **Objective:** Move a candidate through to hire or discard.
- **Steps:**
  1. FAM-11 shows candidate-state pipeline: Nueva → Contactada → Entrevista → Contratada/Descartada (per PRD section 5).
  2. Family manually advances state (e.g. marks "Entrevista agendada" after coordinating offline — V1 has no built-in scheduling/calendar or in-app chat, per PRD section 9 non-goals "Chat complejo propio").
  3. Family marks outcome: Contratada or Descartada.
- **Decisions:** State transitions are family-initiated only (niñera does not change the family's pipeline state) — niñera has her own mirrored status view (NIN-09) but it reflects, not drives, the family's record. This avoids building bidirectional state-sync complexity not specified in the PRD.
- **System behavior:** Niñera is notified (in-app + email/SMS, per verified contact channels) when her state changes to Entrevista or Contratada/Descartada, so she isn't left guessing — a "silent state change" would be a dead end per UX Critic's flow-completeness checks.
- **Outcome:** A niñera is marked Contratada for this necesidad; other candidatas can independently continue at other states or be Descartada.
- **Failure paths:** Family lets a candidate sit in "Nueva"/"Contactada" indefinitely — no forced timeout in V1 (not specified in PRD); dashboard nudges (e.g. "3 candidatas esperan respuesta hace 5 días") are a nice-to-have, not required for V1, flagged here as a possible post-V1 addition rather than invented as a requirement.

### J-FAM-5 — Reportar un perfil

- **Trigger:** Family encounters inappropriate content/behavior from a niñera (profile or off-platform coordination).
- **Objective:** Flag the profile to Clin without needing platform to act instantly.
- **Steps:** Family opens candidate profile → "Reportar" → selects reason category + optional detail → submits (FAM-12).
- **System behavior:** Per UX Decision #5, the reported profile **remains fully visible and matchable** to this and other families while pending admin review (no public "under review" mark) — see reasoning in UX Decision #5. Report is queued to ADM-04.
- **Outcome:** Report logged; family receives a confirmation ("Recibimos tu reporte, lo revisaremos").
- **Failure paths:** Family expects immediate removal and doesn't see one → confirmation copy must set expectations ("nuestro equipo lo revisará; si necesitas ayuda urgente, contáctanos"). No SLA is publicly promised in-product for report review (operational SLA is SOP's call, not surfaced as a UX commitment).

---

## NIÑERA

### J-NIN-1 — Registro y creación de perfil

- **Trigger:** A niñera wants to find families/opportunities.
- **Objective:** Produce a complete, discoverable profile.
- **Steps:**
  1. Landing → "Soy niñera" → registro (nombre, correo, teléfono, contraseña) → verificación de correo/teléfono (same OTP/link mechanics as familia).
  2. Perfil (NIN-01/NIN-02 wizard): fotografía, zona de trabajo, años de experiencia, experiencia con edades específicas (same fixed age-range taxonomy as the family side, so matching compares like with like), disponibilidad, expectativa salarial, modalidades aceptadas, descripción personal, referencias (self-reported — see UX Decision #2).
  3. Prompt to subir identificación (NIN-08) — presented as strongly recommended, not blocking: per addendum, an unverified niñera stays visible/matchable, so profile creation must not force ID upload before publishing.
- **Decisions:** ID upload is optional-but-prompted at profile creation, revisitable anytime from NIN-07/NIN-03. Forcing it would contradict the addendum's explicit "pending profiles are not hidden" resolution — if it were mandatory to even have a live profile, the interim-visibility decision would be moot.
- **System behavior:** Profile is publishable (discoverable in matching/browsing) once core fields are complete, regardless of verification status. A "% perfil completo" indicator nudges completion (PRD section 8 tracks this metric).
- **Outcome:** Live niñera profile, visible to families, with a verification-status badge (see UX Decision #3) reflecting current state.
- **Failure paths:** Niñera abandons mid-profile → profile stays in draft, not published/discoverable until minimum required fields are complete (zona, disponibilidad, modalidad, expectativa salarial, descripción — same fields matching depends on).

### J-NIN-2 — Subir identificación y esperar verificación

- **Trigger:** Niñera chooses to upload ID (from onboarding prompt or later from her profile).
- **Objective:** Obtain "Identidad verificada" badge.
- **Steps:** Uploads photo of ID (NIN-08) → submission enters admin queue (ADM-02) → niñera sees "Verificación en proceso" state on her own profile/dashboard, with the 24–48h target SLA communicated to set expectations → admin approves or rejects (J-ADM-1) → niñera notified of outcome.
- **Decisions:** See UX Decision #3 for exact visual/state design (pending vs. verified, both visible to families).
- **System behavior:** Niñera's dashboard (NIN-03) surfaces the pending state prominently so she isn't left wondering why she hasn't heard back within the stated window.
- **Outcome:** Badge becomes "Identidad verificada" (approved) or profile returns to "No verificada" with a rejection reason and a re-submit option (rejected — e.g. blurry photo, mismatched name).
- **Failure paths:** Rejected submission with no clear reason → niñera can't self-correct → reason code is mandatory for admin on reject (see ADM-03 spec). Queue backlog exceeds 48h → this is an operational/SOP escalation, not a UX state per se, but the "Verificación en proceso" copy should avoid a hard promise ("normalmente 24–48 horas" rather than a guarantee) so the UI doesn't misrepresent an SLA that operations might occasionally miss.

### J-NIN-3 — Recibir oportunidades empujadas (modelo pasivo)

- **Trigger:** A family's necesidad rules-matches this niñera.
- **Objective:** Learn about and respond to a compatible opportunity without having to search.
- **Steps:** Niñera receives a notification (in-app + email/SMS) → opens NIN-04 (Oportunidades recibidas) → reviews the vacante's Match Score + checklist (niñera-facing version — same percentage/checklist format, oriented to what matches from her side, e.g. "✓ Tu zona ✓ Tu disponibilidad ✓ Dentro de tu expectativa salarial") → "Mostrar interés" or dismiss.
- **System behavior:** Showing interest notifies the family (advances that candidate to "Contactada" in the family's FAM-11 pipeline is **not** automatic — showing interest signals availability but the family still initiates formal contact per PRD's paid gate; see UX Decision #4 note on what "mostrar interés" does vs. what "contactar" does — these are kept as two distinct actions on two distinct sides).
- **Outcome:** Niñera has expressed interest; she now appears with an "interesada" flag on the family's candidate list (informational signal, free — this is a niñera action, not the family's paid "contactar" action, so it does not conflict with the paywall).
- **Failure paths:** Niñera receives an opportunity that no longer matches her real availability (data went stale) → she can dismiss without penalty; dismissals are not shown to the family as a rejection, only silently drop from her active queue (avoids the family reading it as a negative signal not specified anywhere in the PRD).

### J-NIN-4 — Explorar vacantes activamente (nuevo, ver UX Decision #1)

- **Trigger:** Niñera wants to look for opportunities herself rather than wait for a push (e.g. she has a gap in her queue, or the algorithm hasn't surfaced anything recently).
- **Objective:** Find and act on open vacantes proactively.
- **Steps:** Niñera opens NIN-05 (Explorar vacantes) → sees a listing of open, active necesidades (not yet Contratada) ranked/filterable by the same Match Score logic used for pushed opportunities → opens a vacante's detail (NIN-06, anonymized — no family contact info, consistent with the same paywall logic on the other side) → "Mostrar interés" (same action/outcome as J-NIN-3, step converges into the same downstream state).
- **Decisions:** This journey is the concrete design for UX Decision #1 (self-serve browsing). See UX-spec.md for full reasoning.
- **System behavior:** Listing excludes vacantes already marked Contratada or explicitly closed by the family. No paywall applies to niñera browsing or "mostrar interés" — the PRD's monetization model is one-sided (families pay; "niñeras gratis" per PRD section 7), so nothing here should introduce a niñera-side paywall.
- **Outcome:** Niñera proactively surfaces herself to a family she wasn't automatically pushed to.
- **Failure paths:** No open vacantes match her filters → empty state with guidance ("intenta ampliar tu zona o disponibilidad"), same empty-state pattern as FAM-04.

### J-NIN-5 — Reportar una familia

- Mirrors J-FAM-5 symmetrically: niñera reports from a vacante/family profile (NIN-10); same "stays visible pending review" handling (UX Decision #5) applies to family-side listings/necesidades as well, for consistency across both sides of the marketplace.

---

## ADMIN

### J-ADM-1 — Revisión de verificación de identidad

- **Trigger:** A niñera submits an ID photo (J-NIN-2).
- **Objective:** Approve or reject within the 24–48h target SLA, keeping the queue moving.
- **Steps:**
  1. Admin opens ADM-02 (Cola de verificación), sorted oldest-first (FIFO), each row showing time-in-queue with a color-coded SLA indicator (green < 24h, amber 24–48h, red > 48h — "SLA excedida").
  2. Admin opens a submission (ADM-03): sees the uploaded ID image side-by-side with the profile's stated name, plus the rest of the profile for context.
  3. Admin approves → niñera's badge flips to "Identidad verificada" immediately; or rejects → must select a reason code (e.g. "foto ilegible," "nombre no coincide," "documento inválido") + optional note → niñera notified with that reason and can re-submit.
- **System behavior:** A red "SLA excedida" row is a visual escalation cue for the operator/team lead, per addendum's requirement that a backlog "escalates, not silently delays" — the exact escalation mechanism (e.g. alert to a lead) is an SOP/operational decision, not a UX one; this screen only guarantees the backlog is never silently invisible to whoever is looking at the queue.
- **Outcome:** Submission leaves the queue with a recorded decision; niñera's visible state updates in real time on her profile (families browsing during review see whatever her state was at that moment — pending or verified).
- **Failure paths:** Admin can't render the uploaded image (corrupt file) → reject with reason "no se pudo abrir el documento" rather than leaving it stuck; item does not silently disappear from the queue without a decision.

### J-ADM-2 — Revisión de reportes

- **Trigger:** A user (familia or niñera) files a report (J-FAM-5 / J-NIN-5).
- **Objective:** Review and resolve the report, deciding on any account action.
- **Steps:**
  1. Admin opens ADM-04 (Cola de reportes), FIFO, shows reporter, reported user, reason category, timestamp, status (Nuevo / En revisión / Resuelto).
  2. Admin opens a report (ADM-05): sees full context — reported profile, report reason/detail, prior report history on that user if any.
  3. Admin resolves: Descartar (no action), Advertir (warning logged, profile stays live), Suspender (profile hidden pending further review), or Eliminar cuenta (permanent). Exact policy thresholds for which action fits which report category are SOP's call, not this document's — this screen only needs to expose the action set operators need.
- **Decisions:** See UX Decision #5 — the reported profile is not publicly marked "under review"; the "En revisión" status here is admin-internal only (visible in ADM-04/05, never on the public-facing profile).
- **System behavior:** Marking status "En revisión" (admin picks it up) vs. leaving it "Nuevo" (untouched) lets a team know what's actively being worked, without ever surfacing that internal state publicly.
- **Outcome:** Report resolved with a recorded action; reported user's visibility only changes if the admin explicitly suspends/removes the account.
- **Failure paths:** Duplicate reports on the same profile from multiple users → ADM-04 groups/flags repeat-reported profiles so admin can prioritize by report volume, not just recency (avoids one especially-bad profile lingering behind older-but-lower-severity reports in a strict FIFO).
