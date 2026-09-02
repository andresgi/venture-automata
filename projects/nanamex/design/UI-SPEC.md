# UI Spec — Clin (Nanamex)

Screen-level visual specification. Built on `design/UI-SYSTEM.md` tokens/components, over
the approved flows in `design/UX-spec.md` and IDs from `design/screen-inventory.md`. Does
not alter scope, fields, or state logic defined by UX — only how each screen looks,
is composed, and behaves visually.

Grouping mirrors UX-spec's own grouping: screens with non-trivial visual decisions get a
full spec; simple/standard-pattern screens are grouped together with the pattern they
inherit, so every one of the 37 screen IDs in screen-inventory.md is covered.

---

## AUTH — Shared entry (AUTH-01…05)

### AUTH-01 — Landing

- **Layout:** Full-bleed hero, mobile: single column, photo of a real caregiver/family
  moment (warm, natural light, no stock-office gloss) as a 4:5 crop behind a scrim gradient
  bottom third — **adults only** (a niñera, a parent, or both together in a home setting);
  no child in frame, per UI-SYSTEM §0.10's no-child-imagery rule; `display` (Fraunces)
  headline over the scrim (1–2 lines, e.g. framing the value prop in plain terms, not a
  slogan); two role-selection buttons stacked below the fold: "Soy familia" (primary), "Soy
  niñera" (secondary-outline, same width).
- **Desktop:** two-column hero — copy + role CTAs left (max 480px column), photography
  right (fills remaining width, `radius-lg` on the image container only).
- **Hierarchy:** Photo/headline → role choice (the only two actions on the page) → below
  fold: 3-line trust summary (verification, references, reporting — plain text + small
  outline icons, not badges) → footer (legal links).
- **Visual emphasis:** the two role buttons are the single decision this page asks for;
  nothing else competes for primary-button weight on this screen.
- **States:** default only (no auth state yet).

### AUTH-02 — Registro

- **Layout:** Centered single-column form, max-width 420px, on `bg`. Small role indicator
  chip at top (non-interactive here, e.g. "Registro · Familia") confirming the choice made
  on AUTH-01.
- **Hierarchy:** `h1` "Crea tu cuenta" → 4 stacked inputs (nombre, correo, teléfono,
  contraseña+confirmación) → legal consent checkbox (small, `body-sm`) → primary button
  "Crear cuenta" full-width → text-link "¿Ya tienes cuenta? Inicia sesión" below.
- **Spacing:** 24px between field groups, 16px within a label+input pair.
- **States:** default, field-level error (inline per §5.2), duplicate-account error
  (inline banner above the submit button, `danger` tokens, with an embedded "Iniciar
  sesión" link — never a dead-end message), loading (button spinner on submit).
- **Responsive:** identical structure mobile→desktop, just wider side margins on desktop
  (form stays 420px, centered).

### AUTH-03 — Verificación de correo/teléfono

- **Layout:** Centered column, max-width 420px. Two independent checklist rows (Correo,
  Teléfono), each: icon (outline circle → filled check on completion, same convention as
  `TrustBadge`) + label + status text + action ("Reenviar correo" / OTP input + "Verificar").
- **Hierarchy:** `h1` "Confirma tus datos de contacto" → the two rows → "Continuar" primary
  button, enabled even with one row pending (soft gate per UX Decision) but with a small
  `body-sm` note under the button: "Podrás usar Clin ahora; necesitarás verificar ambos
  antes de contactar a una candidata."
- **States:** loading (sending/checking code), error (invalid/expired OTP — inline under the
  OTP field, retry without losing the correo state), success (row flips to a **filled**
  `Check` icon + label text bumped from `ink-600` to `ink-900`, matching FAM-13's
  contact-verification convention: icon-shape change only, no color change. This state never
  uses `trust-verified-600` or any other reserved trust hue — see §3.3 — since binary
  contact verification is a different concept from identity verification and must not
  borrow its signal).
- **Responsive:** no structural change; OTP input is a 6-box segmented numeric field on all
  breakpoints (large tap targets on mobile).

### AUTH-04 — Login / AUTH-05 — Recuperar contraseña

Standard pattern, same centered 420px column and input styling as AUTH-02. Login: correo +
contraseña + primary "Iniciar sesión" + text-links for "¿Olvidaste tu contraseña?" and
"Crear cuenta." Recuperar contraseña: single email input + primary "Enviar instrucciones" +
success state replaces the form with a confirmation message (not a redirect), so the user
isn't left wondering if it worked.

---

## FAM — Familia

### FAM-01 — Onboarding perfil familiar

Standard short form pattern (same as AUTH-02): centered column, `h1` "Cuéntanos un poco de
tu familia," 2 fields (nombre, zona — same autocomplete/pin control as FAM-03's Zona step),
primary "Continuar" → redirects to FAM-03.

### FAM-02 — Mis necesidades (dashboard)

- **Layout:** Home/landing screen for the familia area. Top: `h1` "Mis necesidades" + primary
  button "Crear necesidad" (top-right on desktop, full-width sticky-bottom on mobile if the
  list is short, otherwise inline top button on mobile too — a floating action button is
  avoided as an unnecessary extra affordance when a single top button suffices).
- **Content:** Each necesidad is a **card** (§5.3 — genuinely discrete, tappable object):
  photo-less summary card with zona + modalidad + estado ("Activa" / "Borrador" as a status
  chip per §5.5) + a compact pipeline summary row (small count per state, e.g. "2 nuevas · 1
  en entrevista," plain text, not 5 separate badges) + "Ver candidatas" / "Continuar
  borrador" action.
- **Grid:** single column mobile; 2-column card grid ≥768px.
- **States:** default (populated), **empty** (first-time family, no necesidad yet — empty
  state per §5.8: icon, headline "Encuentra a tu próxima niñera," one line of guidance,
  primary "Crear necesidad" button), loading (skeleton cards).

### FAM-03 — Crear necesidad (wizard)

- **Layout, mobile:** one step per full-screen view, top progress indicator (7 thin
  segments, current segment filled `primary-600`, not a percentage number — simpler to
  parse at a glance across 7 steps), step content vertically centered in available space,
  sticky bottom bar with "Atrás" (text button) + "Siguiente" (primary, full remaining
  width).
- **Layout, desktop:** single scrollable page, 7 sections in order with anchored side
  navigation (left rail, 200px, listing the 7 step names, current section highlighted) —
  content column max-width 640px.
- **Step 1 (Niños):** stepper control for número de niños (− / count / +) + for each child,
  a **chip group** (§5.2) of fixed rango-de-edad options (0–1, 1–3, 3–6, 6–12, 12+) —
  single-select chips, never a numeric/date input. This is the field-level enforcement of
  the CONSTRAINTS-mandated age-range rule and is the most scrutinized field in this wizard.
- **Step 2 (Zona):** address/colonia autocomplete input with a small embedded map preview
  (pin, not full interactive map — keeps this step lightweight) once a zona is chosen.
- **Step 3 (Días y horarios):** 7 day-of-week chips (multi-select) + time-range picker
  (from/to, simple two-field selects, not a full calendar widget).
- **Step 4 (Modalidad):** 3-option single-select chip row (planta / entrada por salida /
  ocasional) — large tap targets, this is a consequential field so it gets full-width chips
  stacked on mobile rather than tightly packed.
- **Step 5 (Rango de pago):** min/max numeric inputs with "MXN" prefix, inline helper text
  showing a formatted range as typed (e.g. "$4,500 – $6,500 MXN/semana," unit TBD by
  content).
- **Step 6 (Fecha de inicio):** standard date picker, disabled dates before today.
- **Step 7 (Responsabilidades):** checklist of ~8 common responsibilities (checkbox rows,
  not chips — a longer list reads better as a vertical checklist than wrapped chips) +
  "Otros" free-text field below.
- **Revisión step:** full read-only summary grouped by the same 7 section headers, each with
  an inline "Editar" text-link jumping back to that step; primary "Publicar necesidad" at
  the bottom.
- **States:** default, per-step validation (Siguiente disabled until required fields set,
  no error-shouting until the user tries to advance), loading (brief, on publish — matching
  compute), error (publish failed — inline banner, data preserved), draft-saved indicator
  (small `body-sm` "Guardado" text near the top after each step transition, auto-dismissing
  — not a toast, since it fires on every step and shouldn't compete with the toast pattern's
  action-confirmation role).

### FAM-04 — Listado de candidatas

- **Layout:** Collapsible necesidad-summary header (zona, modalidad, days — one line,
  expandable for full detail) → filter entry point (a single "Filtrar" secondary button
  opening FAM-05, not an inline filter bar — keeps this screen's primary content, the
  cards, uncluttered) → ranked list of candidate cards.
- **Candidate card composition (top to bottom / left to right on wide cards):**
  1. Photo (56px circle mobile / 64px desktop) + nombre + `TrustBadge` (§4.1) inline right
     of the name, same row.
  2. `MatchScore` compact (§4.3): numeral + up to 3 checklist lines.
  3. Footer row: "Guardar favorita" icon button (heart outline/filled toggle, `ink-600`
     default → `primary-600` when saved) left, "Ver perfil" primary-text button right.
- **Grid:** single column mobile (full-width cards); 2-column ≥768px, 3-column ≥1280px.
- **Dimensions:** card min-height ~180px (compact) to accommodate photo+badge+score+3
  checklist lines without crowding; 16px internal padding, 16px gap between cards.
- **Visual emphasis:** the Match Score numeral (`numeral-lg`, `primary-600`) is the largest,
  most saturated element on the card — it is the thing a family scans for first, by design.
  `TrustBadge` is present but sized/positioned to be a secondary read (24px pill next to the
  name), not competing with the score for attention.
- **States:**
  - Default: populated, ranked.
  - Loading: skeleton cards (photo circle + 2 text bars + 3 checklist-line placeholders).
  - **Empty (zero matches):** full empty-state template (§5.8) — icon, `headline` "Aún no
    encontramos candidatas para esta necesidad," guidance line naming the likely blocking
    field (zona/rango de pago), primary button "Editar necesidad" → FAM-03 revisión step.
    Rendered as a genuinely calm state, not styled with any error/warning color — this is
    an expected outcome, not a failure.
  - Partial/low-score: rendered identically to default, no visual demotion or graying-out of
    lower scores — the numeral itself is the only signal, per UX's "no artificial threshold"
    decision.
  - Error: inline retry banner above where cards would render.

### FAM-05 — Filtros

- **Mobile:** bottom sheet (§5.7), drag handle, `radius-lg` top corners, filters stacked
  (zona, modalidad chip group, rango de pago dual input, disponibilidad chip group), sticky
  footer with "Limpiar" (text) + "Aplicar filtros" (primary).
- **Desktop:** persistent left panel (240px) beside the FAM-04 card grid rather than a
  sheet/modal — filters apply live without a separate "Aplicar" step at this width.
- **States:** default, applied (chip summary of active filters shown as small removable
  tags atop the FAM-04 list, e.g. "Zona: Polanco ✕").

### FAM-06 — Perfil de niñera (candidate detail)

- **Layout, mobile:** full-bleed photo header (4:5 or 1:1, `radius-lg` bottom corners only
  as it meets content) with nombre + `TrustBadge` overlaid on a scrim at the bottom edge of
  the photo → scrollable content below → **sticky bottom action bar** (Guardar favorita
  icon + "Contactar" primary button, `elevation-2`, always visible while scrolling).
- **Layout, desktop:** two-column — left column (~360px) sticky photo + name + badge +
  action buttons (no sticky-bottom-bar needed, actions live in this fixed column instead);
  right column (scrollable) holds all detail sections.
- **Content order (both breakpoints):** `MatchScore` full (§4.3) → Experiencia (años,
  edades) → Disponibilidad → Modalidades aceptadas → Expectativa salarial → Descripción
  personal (`body-lg`, max 65ch) → **Referencias** (`ReferenceList`, §4.2 — visually
  separated by a `border` divider and extra top spacing (`space-7`, 40px) from the section
  above it, reinforcing that it's a distinct, lower-rigor category, not a continuation of
  the verified-facts sections above it).
- **Visual emphasis order:** photo/name/badge (identity) → Match Score (why she's shown) →
  factual profile fields → descripción (voice) → referencias (self-reported, clearly last
  and clearly separate) → actions (decision point).
- **Actions:** Guardar favorita (icon toggle, free, always enabled); Reportar (text-link,
  low visual weight, placed in a small "..." overflow menu or footer-adjacent text link —
  present but not competing with the primary action); **Contactar** (primary button — fires
  `PaywallGate` per §4.4 if unlocked entitlement absent, otherwise routes straight to
  FAM-10).
- **States:** default, loading (skeleton: photo block + text bars), **unavailable**
  (candidate removed/deactivated since list load — replaces content with a plain message +
  "Volver al listado" button, not a broken/blank page), error.

### FAM-07 — Favoritas

Same card component as FAM-04 (photo, nombre, `TrustBadge`, compact `MatchScore` where
still applicable/available), grouped optionally by necesidad if a niñera is favorited
across more than one. Empty state: "Aún no has guardado ninguna niñera" + button to the
first active necesidad's FAM-04.

### FAM-08 — Paywall / Desbloquear contacto

This is the screen where §4.4 `PaywallGate` composition is fully specified.

- **Mobile:** full-screen takeover (no scrim, replaces the view — per UX Decision 4's
  intent that this feels like a deliberate, focused moment, not a popup interrupting
  browsing). Close ("✕") top-left, does not use back-swipe-to-dismiss ambiguity.
- **Desktop:** centered dialog, 560px, `elevation-3`, `overlay-scrim`.
- **Content, top to bottom:**
  1. Small candidate-context row: 40px photo + nombre + `TrustBadge` (so the family isn't
     asked to pay in the abstract — they see exactly who this unlocks contact for).
  2. `headline` (Fraunces): the price/offer statement, e.g. "MX$299 · Contacta candidatas
     durante 30 días" (generic wording per UX-spec's flagged dependency — copy will be
     revisited once TECH_ARCHITECTURE resolves exact entitlement mechanics; this spec fixes
     the *visual treatment*, not the final legal/product copy).
  3. 3-line plain-text "qué incluye" list (no icons needed here — this is informational,
     not a trust checklist, so it deliberately does not borrow the `Check`-icon convention
     from `MatchScore` to avoid implying it's a compatibility signal).
  4. Primary button "Continuar a pago" (full-width mobile, standard width desktop).
  5. Text-link "Cancelar" directly below, equal visual availability to the primary action.
- **Iconography:** single outline `LockSimple` icon in a `primary-50` circular container
  above the headline — calm, not punitive (§4.4).
- **States:** default, loading (transitioning to FAM-09), error (entitlement check failed —
  inline banner + retry, does not lose place).

### FAM-09 — Checkout / Confirmación de pago

- **Layout:** Same dialog/takeover shell as FAM-08 (continuity — the family shouldn't feel
  like they left the "paywall moment" and entered an unrelated payment product screen).
  Order summary card (MX$299 / 30 días, flat line-item style, no card-within-card
  treatment) → payment fields (provider-dependent, out of this spec's scope per
  UX-spec) → primary "Confirmar pago" (not dismissible mid-submit — button shows a spinner
  and the close/back affordance is disabled during processing, to prevent duplicate
  charges).
- **States:** default, loading (processing — non-dismissible), **error** (specific reason,
  e.g. "Tu pago fue rechazado," `danger` inline banner above the retry button — never a
  generic failure), **success** (brief confirmation state — a single filled-check icon
  animation per §0.12's restrained-motion rule — before auto-advancing to FAM-10).

### FAM-10 — Solicitar entrevista

- **Layout:** Standard content column. Confirmation header ("Contacto desbloqueado" small
  `trust-verified` accent line, not a full banner — this isn't a verification event, just a
  brief positive confirmation) → revealed contact info block (plain, labeled fields, e.g.
  WhatsApp/teléfono per whatever TECH_ARCHITECTURE decides "contactar" reveals) → optional
  message textarea → primary "Confirmar solicitud."
- **States:** default, success (confirmation banner + redirect to FAM-11), error
  (notification-delivery failure — non-blocking small inline note, since the request itself
  still records per UX-spec).

### FAM-11 — Estado de candidatas (pipeline)

- **Desktop:** kanban, 5 columns per §5.9, column width ~220px, horizontal scroll if
  viewport is narrow rather than shrinking columns below a usable width. Column header:
  label (`h2`) + count in `ink-400`, no color-coding per column (color is reserved for
  trust states elsewhere in the product — pipeline columns are distinguished by position
  and label only, keeping this screen visually calm despite tracking 5 states).
  "Descartar" available as a small text-link per card, always, regardless of column.
- **Mobile:** segmented control (horizontally scrollable tab row) at the top replacing
  columns; selected tab's list renders below as stacked rows (not full FAM-04-style cards —
  a slightly denser row here: photo 40px + nombre + days-in-state meta + "Ver perfil").
- **States:** default, **empty** (no pipeline record yet for this necesidad — empty-state
  template pointing back to FAM-04), success micro-confirmation on manual state advance
  (brief toast, "Marcada como Entrevista").

### FAM-12 / NIN-10 — Reportar

- **Layout:** Simple modal (desktop centered dialog / mobile bottom sheet), not a
  full-screen takeover — this is a short, low-frequency action and shouldn't interrupt the
  browsing context as heavily as the paywall does.
- **Content:** `h2` "Reportar a [nombre]" → radio-style reason list (category options as
  selectable rows, not chips — longer label text reads better as a vertical radio list) →
  conditional detail textarea (required only if "Otro" selected) → primary "Enviar reporte"
  + text "Cancelar."
- **States:** default, success (the modal replaces its content with a brief confirmation
  message and a single "Listo" dismiss button — copy per UX-spec's expectation-setting
  language), error (submission failed, entered text preserved).

### FAM-13 — Cuenta

Standard account-settings pattern: sectioned list (not cards) — Verificación de contacto
(status rows matching AUTH-03's convention), Historial de pagos (plain table/list of past
entitlement purchases), Seguridad (password change). No `TrustBadge` here — identity
verification is a niñera-only, profile-facing concept; familia accounts only ever show
contact-verification status, which uses the resolved/unresolved outline→filled icon
convention (§0.11) but never the amber "en proceso" hue, since email/phone verification is
binary (pending or done), not a three-state review process.

---

## NIN — Niñera

### NIN-01 / NIN-02 — Onboarding perfil (pasos 1–2)

Same wizard shell as FAM-03 (step progress indicator, sticky bottom nav mobile / anchored
side-rail desktop). Paso 1: photo upload (large circular preview, 120px, with a camera-icon
overlay affordance), zona de trabajo (same autocomplete as FAM-03), años de experiencia
(numeric stepper). Paso 2: disponibilidad (day/time chips, same component as FAM-03 step
3), expectativa salarial (same dual-input pattern as FAM-03 step 5), modalidades aceptadas
(multi-select chips), descripción personal (textarea, character-count helper), referencias
(repeatable simple field group: nombre, relación, contacto — rendered here as the *editable
source* of the `ReferenceList` shown read-only on FAM-06/NIN-07). At the end of paso 2: a
non-blocking prompt card (not a full step) — "Sube tu identificación" with a secondary
"Más tarde" and primary "Subir ahora" (→ NIN-08) — visually low-pressure (plain card, no
urgent color) since it is optional-but-encouraged per UX Decision 3's reasoning.

### NIN-03 — Inicio (dashboard)

- **Layout:** Top: `TrustBadge`-driven **persistent banner** (§5.6) reflecting current
  verification state — this is the one place the badge appears at banner scale (full-width,
  larger icon 24px, includes the plain-language explanation text inline rather than
  requiring a tap, since this is the niñera's own status, not a passing reference to
  someone else's) — followed by a "% perfil completo" progress bar (shadcn `Progress`,
  `primary-600` fill) with a "Completar perfil" link if <100%.
- Below: "Oportunidades recientes" preview (2–3 compact opportunity cards, same visual
  language as NIN-04's cards) with "Ver todas" link, and a secondary "Explorar vacantes"
  entry (a plain text-link/button, not a duplicate card section — this keeps Decision 1's
  second channel discoverable without visually competing with the primary passive-channel
  content).
- **States:** default, empty (no oportunidades yet — the empty message explicitly routes to
  Explorar per UX-spec, rendered as a single line + button under the (still-shown) profile
  -completion section, not a full separate empty-state block), loading.

### NIN-04 — Oportunidades recibidas

Same card grid pattern as FAM-04, mirrored for the niñera-facing `MatchScore` checklist
(e.g. "✓ Tu zona," "✓ Tu disponibilidad," "✓ Dentro de tu expectativa salarial"). No
`TrustBadge` on these cards (the badge is about *her* identity, not relevant when she's
looking at anonymized family/vacante cards). Card footer actions: "Descartar" (text-link,
low visual weight, silent per UX-spec) + "Mostrar interés" (primary). Empty state links to
NIN-05 (Decision 1's fallback channel), per §5.8 template.

### NIN-05 — Explorar vacantes

Same layout as FAM-04+FAM-05 combined pattern (filter entry + ranked card grid), applied to
open vacantes instead of candidatas. No paywall affordance anywhere on this screen or its
cards (Decision 1 — niñera side stays free; the UI here should look exactly as open/
unrestricted as FAM-04 does, with no visual hint that a gate exists elsewhere in the
product).

### NIN-06 — Detalle de vacante

Mirrors FAM-06's structure without a photo hero (family side is anonymized — no family
photo shown pre-interest) — instead a simple icon-avatar placeholder (neutral, generic
"family" line icon, `ink-400`, not a stock photo standing in for a real person) + zona +
`MatchScore` full + full necesidad field list (children rango de edad, días/horarios,
modalidad, rango de pago, fecha de inicio, responsabilidades) as plain labeled rows.
Actions: "Mostrar interés" (primary), "Reportar" (low-weight text-link). State:
**unavailable** (vacante closed/filled since list load) uses the same plain-message
pattern as FAM-06's unavailable state.

### NIN-07 — Mi perfil (view/edit)

Same content structure and section order as FAM-06 (so what the niñera edits visually
matches what a family ultimately sees), but each section has an inline "Editar" affordance
and saves per-section (a small inline success check appears next to the section heading
after a save, not a page-level toast, since multiple sections may be edited in one visit).
`TrustBadge` here is paired with a direct action: if not yet "Identidad verificada," the
badge row includes an inline "Subir identificación" / "Ver estado" text-link to NIN-08.
`ReferenceList` here is the **editable** counterpart of §4.2 — same visual non-badge
treatment, plus an "Agregar referencia" text-link and per-row edit/remove controls.

### NIN-08 — Subir identificación

- **Layout:** Centered column. Large current-status display at top — this reuses
  `TrustBadge`'s exact color/icon logic but at a bigger, standalone size (48px icon, full
  headline-level label) since this screen's entire purpose is showing that one state.
  - **No verificada / Rechazada:** upload control below (mobile: primary "Tomar foto" +
    secondary "Subir desde galería"; desktop: drag-drop zone + "Seleccionar archivo"
    button) + `body-sm` SLA note ("normalmente 24–48 horas"). Rechazada additionally shows
    the admin's reason code in plain language in a neutral (not `danger`-colored — this is
    guidance, not an error the niñera caused maliciously) inline note directly above the
    upload control.
  - **Verificación en proceso:** upload control is replaced by a read-only confirmation
    block ("Recibimos tu identificación, la estamos revisando") — no action available,
    consistent with there being nothing for her to do but wait.
  - **Identidad verificada:** read-only success state, `trust-verified` styling, no upload
    control shown (a small "Reemplazar documento" text-link remains available for cases
    like a renewed/changed ID, low visual weight since it's an edge case).
- **States:** enumerated above are the actual screen states (default/no-verificada,
  uploading — inline progress bar on the preview thumbnail, pending, success/verificada,
  error/rechazada).

### NIN-09 — Mis solicitudes

Read-only mirror of FAM-11's pipeline, grouped by state as section headers (not columns —
this is a single read-only list, so a kanban affordance would wrongly imply she can drag/
change state). Each row: vacante zona/modalidad summary + current state label + "Ver
detalle." Empty state links to NIN-04/NIN-05 per §5.8 template.

### NIN-11 — Cuenta

Same pattern as FAM-13 (contact verification status, security). No identity-verification
content here (lives on NIN-07/NIN-08 per IA).

---

## ADM — Admin

Admin is Inter-only, denser, desktop-only (per CONSTRAINTS QA Ownership and IA). No
Fraunces, no warm-photography moments, no empty-state illustration circles — plain, fast,
utilitarian, consistent with it being an internal operator tool rather than a trust-building
consumer surface.

### ADM-01 — Admin login

Minimal centered form (correo + contraseña + primary "Iniciar sesión"), no marketing
content, no role selector, no link to public registration.

### ADM-02 — Cola de verificación de identidad

- **Layout:** Dense table, full available width (no 1200px cap — operators benefit from
  width), sticky header row. Columns: Niñera (name, small 32px photo), Enviado (timestamp),
  En cola (SLA indicator + duration), Acción.
- **SLA indicator:** small colored dot (8px) + text — green `trust-verified-600` (<24h),
  amber `trust-pending-600` (24–48h), red `danger-600` ("SLA excedida," >48h) — rows with a
  red indicator are visually sorted to the top of the list regardless of raw FIFO order, per
  UX-spec, with a thin red left-border accent on those rows so they're scannable even in a
  long list.
- **States:** default (populated, red-first sort), empty ("Cola vacía — no hay
  verificaciones pendientes," plain centered text, no illustration needed for an internal
  tool), loading (skeleton rows).

### ADM-03 — Detalle de verificación

- **Layout:** Two-column — left: zoomable ID image (fixed frame ~480px, click/pinch to
  zoom); right: profile context (stated nombre prominently compared against the ID, plus
  the rest of her profile summary for context) + decision controls fixed at the bottom of
  the right column (Aprobar primary, Rechazar destructive-outline).
- **Reject flow:** clicking "Rechazar" opens an inline reason-code select (required,
  cannot submit empty) + optional note textarea, directly in the right column (not a
  separate modal — this is a frequent, expected action for this screen, so it shouldn't
  need a dialog interruption).
- **States:** default, **unavailable** (corrupt/unloadable image — the image frame shows a
  plain "No se pudo abrir el documento" message with a pre-filled reject reason of the same
  text, so the admin can still resolve the item without it stalling in the queue).

### ADM-04 — Cola de reportes

Same dense-table pattern as ADM-02. Columns: Reportante, Perfil reportado, Categoría,
Fecha, Estado (Nuevo/En revisión/Resuelto — plain text badge, neutral colors only, since
this status is admin-internal per Decision 5 and never needs to borrow trust hues).
Profiles with multiple open reports get a small `×N` repeat-count indicator next to the
reported-profile name, with those rows sorted above single-report rows of similar age.

### ADM-05 — Detalle de reporte

Report context (reason/detail, reported profile summary, prior report history list if any)
→ resolution action row: Descartar / Advertir / Suspender (all standard buttons, direct
execution) / **Eliminar cuenta** (destructive-outline button that opens a confirmation
dialog — centered modal, `elevation-3`, explicit copy "Esta acción es permanente y no se
puede deshacer," Cancelar + a `destructive-solid` "Eliminar cuenta" confirm button — the
only place in the entire product `destructive-solid` styling is used, reserving maximum
visual weight for the one truly irreversible action in the system).

---

## SYS — Cross-cutting (SYS-01…03)

- **SYS-01 Error genérico:** Centered, minimal — plain outline icon (generic alert, not
  `danger`-colored full-bleed treatment — calm even in failure), one-line explanation,
  "Volver al inicio" button. No `headline`/Fraunces use here — an error isn't one of the
  scarce emotional moments Fraunces is reserved for.
- **SYS-02 Sesión expirada:** Same minimal centered pattern, "Inicia sesión de nuevo" primary
  button that, on success, returns the user to their pre-expiry destination (e.g. mid
  FAM-09 checkout) rather than the app's default home.
- **SYS-03 Sin conexión:** Same minimal pattern, persistent small top banner variant also
  used opportunistically wherever connectivity drops mid-session (not only as a full
  takeover), styled neutral (`ink`/`border` tokens) rather than `danger` — a connectivity
  gap isn't the user's error.
- **Acceso no autorizado (permission denied):** Not a dedicated screen — per UX-spec Part C,
  a role-mismatched route redirects to the user's own home (FAM-02, NIN-03, or the admin
  queue) and surfaces a **neutral inline banner** at the top of that destination, using the
  same non-`danger` neutral treatment as SYS-03's connectivity banner (`ink-600` text on
  `bg-raised`, 1px `border`, no icon fill, no red): one line, e.g. "No tienes acceso a esa
  página." Dismissible, auto-clears on next navigation. It is deliberately styled as a
  matter-of-fact redirect, not a scolding or security warning — consistent with the
  product's "honest, not alarmist" register (§0.2) even when the state is access-related.

---

## Cross-cutting visual QA checklist (for Visual QA / TECH_ARCHITECTURE handoff)

1. `TrustBadge`'s color/icon/label semantics are identical everywhere it appears (FAM-04,
   FAM-06, NIN-03, NIN-07, NIN-08, ADM-03's context panel) — no surface may introduce a
   fourth state or a different color/icon/label combination for the three defined states.
   Geometry is a documented scale variant by context, not a uniform pixel size: compact
   inline pill (position relative to name, per §4.1) on FAM-04, FAM-06, NIN-07, and ADM-03's
   context panel; banner-scale on NIN-03; large standalone (48px icon) on NIN-08. Visual QA
   should verify each surface matches *its* documented variant, not flag NIN-03/NIN-08's
   larger scale as a defect.
2. `ReferenceList` never appears within 40px (`space-7`) of a `TrustBadge` and never
   inherits `trust-verified`/`trust-pending` color tokens, on FAM-06 and NIN-07.
3. No screen upstream of FAM-08 (FAM-04, FAM-05, FAM-06, FAM-07) renders any lock icon,
   blur, dimming, or "desbloquear" language.
4. `MatchScore`'s numeral is the only use of `numeral-lg`/`primary-600` at that size on any
   given screen — nothing else competes with it for visual weight on a candidate/vacante
   card.
5. `destructive-solid` button styling appears exactly once in the product: ADM-05's
   "Eliminar cuenta" confirm step.
