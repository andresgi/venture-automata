# UI System — Clin (Nanamex)

Visual design system for the Clin web app. Companion to `design/UI-SPEC.md` (screen-level
specs) and downstream of the approved `design/UX-spec.md`. This document does not change
product scope or flows — it defines how the approved flows should look, feel, and behave
visually.

---

## 0. Visual Direction

### 0.1 What this product actually is, emotionally

Clin sits at an unusually high-stakes intersection for a "marketplace app": a family is
deciding **who watches their children**, and a niñera is trying to be seen fairly for
**her livelihood**. Both sides are currently served by informal, anxiety-inducing channels
(WhatsApp groups, secondhand recommendations). The interface's job is not to feel exciting,
gamified, or growth-hacked — it's to feel like **a calm, competent person is handling this
carefully**, the way a trusted pediatrician's office or a well-run notaría feels: warm,
unhurried, precise about the things that matter, undecorated about the things that don't.

This rules out two failure modes equally:

- **Generic SaaS**: blue gradients, glassmorphism, dashboard-KPI aesthetics, dense data
  tables as the default surface. This product is not B2B software; families and niñeras are
  consumers making an emotional decision, not operators tracking metrics.
- **Twee/childish**: pastel clouds, rounded mascot illustrations, baby-shower colors,
  playful iconography. Infantilizing the visual language trivializes a decision that is
  fundamentally about safety and trust, and reads as condescending to niñeras being
  evaluated for professional work.

The target is closer to **premium, editorial, human** — think of how a well-designed
Mexican consumer-trust brand presents financial or safety decisions (Kavak's calm,
photography-led, verification-forward marketplace language; Airbnb's quiet, non-alarmist
identity-verification pattern; Nubank/Klar's warm-but-credible fintech tone in LatAm) rather
than how a recruiting ATS or admin dashboard presents a pipeline.

### 0.2 Brand personality

- **Calm, not clinical.** Confidence comes from clarity and restraint, not from badges,
  gradients, or urgency-inducing color.
- **Honest, not persuasive.** Especially in verification and paywall moments: the product
  never oversells a pending state as more trustworthy than it is, and never dresses up a
  paid gate as a discovery.
- **Warm, not cute.** Warmth comes from color temperature, photography, and type pairing —
  never from cartoon iconography or exclamation-heavy copy.
- **Grounded in México**, not a generic Silicon Valley template translated into Spanish.
  Color temperature, imagery, and tone should feel local and specific, not like a US SaaS
  template with `es-MX` strings swapped in.

### 0.3 Visual references (patterns extracted, not copied)

| Reference | Category | Pattern extracted |
|---|---|---|
| Airbnb identity verification UI | Trust-based marketplace | A verification badge that is informative, never alarmist; "not yet verified" is rendered as a neutral fact, not a warning. Badge sits fixed next to name/photo across every surface. |
| Kavak (MX marketplace) | Premium consumer marketplace, MX | Warm neutral backgrounds instead of stark white; photography-led listings; inspection/certification language rendered matter-of-factly, not as marketing badges; confident single accent color rather than a rainbow of status colors. |
| Care.com / Sittercity | Direct category comparable | What to take: standardized comparable profile fields, checklist-style compatibility signals. What to elevate past: their dated, cluttered, badge-heavy visual execution — Clin should feel like a more restrained, editorial version of the same information. |
| Nubank / Klar (LatAm fintech) | Trust + money in LatAm consumer product | Friendly-but-credible tone is achievable without primary-blue corporate color; a single confident brand hue plus disciplined neutrals reads as more trustworthy than a "trustworthy-blue" default. |
| WhatsApp (as user context, not literal reference) | Existing user mental model | The target users already coordinate childcare over WhatsApp today. The product should feel at least as fast and low-friction as that, not add enterprise-software ceremony on top of a task users currently do over chat. |

### 0.4 Typography direction

Two-typeface system, used asymmetrically on purpose:

- **Inter** (UI/body) — nearly all interface text: navigation, forms, list content, body
  copy, screen titles, admin. Chosen for legibility at small sizes, full Latin-extended
  support for Spanish diacritics (ñ, á, é, í, ó, ú), and because it disappears into the
  background rather than performing "brand."
- **Fraunces** (display serif, warm/humanist, variable optical size) — reserved for a small
  number of **emotionally significant moments only**: the landing hero, empty-state
  headlines, the paywall headline, and verification-outcome moments (approved/rejected
  banners). This is deliberate scarcity: if every screen title used a display serif it would
  read as generic "premium template" rather than as considered emphasis. Fraunces appears
  where the product is asking for a breath — never in dense, transactional UI (admin,
  pipeline boards, forms).

Admin area uses **Inter only, no Fraunces** — it is an internal operator tool, not a
trust-building consumer surface, and should read as efficient rather than warm.

### 0.5 Density

Mobile-first, moderately spacious — not admin-dashboard-dense, not luxury-brand-empty.
Profile and evaluation content (where a family is making a careful decision) gets generous
line-height and breathing room; list/browsing surfaces (candidate lists, opportunity lists)
are comfortably scannable without feeling like a spreadsheet. Admin queues are the one
deliberately denser surface in the product — operators triage volume, and information
density there is a feature, not a compromise.

### 0.6 Border-radius philosophy

Radius correlates with an element's concreteness as a discrete, touchable object — it is
**not** applied uniformly to every container. Plain layout structure (page sections, list
wrappers, dividers) has no radius and often no border at all. Radius scale:

- `--radius-sm` (8px): inputs, buttons, filter chips, small controls.
- `--radius-md` (14px): cards (candidate cards, vacante cards, profile section cards).
- `--radius-lg` (20px): modals, bottom sheets, large hero/photo containers.
- `--radius-full`: avatars, verification badges, status pills, tags — anything that is
  conceptually a "token" rather than a "container."

### 0.7 Spacing philosophy

8px base rhythm, applied consistently rather than eyeballed per screen: `4, 8, 12, 16, 24,
32, 40, 48, 64, 80`. Section-level spacing (between distinct content blocks on a profile or
form) uses the larger steps (24–48); component-internal spacing (icon-to-label, field
label-to-input) uses the smaller steps (4–12). No arbitrary one-off pixel values.

### 0.8 Color strategy

A small, semantically disciplined palette rather than "a color per status." One warm
neutral surface family, one confident brand accent, and exactly three reserved
**trust-state hues** that are never reused for anything else in the product (see §3). This
scarcity is what lets the three-state verification badge (§4.2) and the referencias
treatment (§4.3) carry real meaning — if the same amber or teal showed up decoratively
elsewhere, the badges would lose their signal value.

### 0.9 Elevation / shadow strategy

Default resting state is **flat**: hairline 1px borders separate content, not drop shadows.
Shadows are reserved for genuinely temporary/overlaid content (dropdowns, modals, sheets)
and for hover/focus feedback on interactive cards. Nothing in a static, at-rest layout
"floats" — this is the single biggest lever against the generic "everything in a
shadowed card" AI-template look.

### 0.10 Imagery / illustration philosophy

- **Photography over illustration wherever a real photo exists** (niñera profile photos,
  landing page). Photography should read as warm and natural — home settings, soft natural
  light — never corporate stock-photo gloss, never posed "diverse professionals in an
  office" imagery that has nothing to do with childcare.
- **No child imagery, anywhere in the product, without exception — including landing-page
  and any other marketing/photography use.** This is a privacy/safety commitment, not just
  an aesthetic one: Clin holds indirect, minimal data about real children it has no consent
  to depict (age ranges only, per `config/CONSTRAINTS.md`), so no photography or illustration
  in the product may put an actual or implied child's likeness on screen — not full-frame,
  not partial, not anonymized/out-of-focus/from-behind. Concretely, AUTH-01's "caregiver/
  family moment" hero photo must show **adults only** (a niñera, a parent, or both together
  in a home setting) and never include a child in frame. Keeping the visual register focused
  on the adults evaluating each other, rather than on pictures of kids who aren't the
  viewer's own, is also consistent with §0.1's non-infantilizing brand intent — but the
  primary reason for the rule is protecting children's privacy, not tone.
- **Simple line-art only for empty states and onboarding**, in a single warm ink tone with a
  primary-tint circular container — never a cartoon mascot, never multi-color clip-art
  illustration.

### 0.11 Iconography

Single icon family throughout: **Phosphor Icons, Regular weight**, 1.5px-equivalent stroke,
rounded terminals (matches the warmth of Fraunces without being playful). Default sizes:
16px (dense/inline), 20px (default UI), 24–32px (empty states, banners).

A deliberate rule reinforces the verification badge system (§4.2): **outline icons signal
an unresolved/in-motion state; a filled icon signals a resolved, affirmative state.** This
is used nowhere else in the product except the verification badge, so it stays meaningful:

- "No verificada" → outline empty-circle icon.
- "Verificación en proceso" → outline clock icon.
- "Identidad verificada" → **filled** shield-check icon.

Icons are functional, not decorative — no icon is placed next to a list item, label, or
heading merely for visual texture. If an icon doesn't add information (a state, an action
affordance) it's omitted.

### 0.12 Motion philosophy

Subtle and purposeful, never decorative. Page/route transitions: none beyond a brief
crossfade. List loading: skeleton screens, not spinners. State-confirming moments (a
verification badge flipping to "Identidad verificada," a payment succeeding) get one small,
restrained transition (e.g. a 200ms fade+scale on the badge, a checkmark draw-in on payment
success) — not confetti, not a modal celebration. All motion respects
`prefers-reduced-motion` by falling back to an instant state change with no animated
easing.

---

## 1. Type Scale

Base: 16px root, Inter for all UI text, Fraunces reserved per §0.4.

| Token | Font | Size / Line-height (mobile) | Size / Line-height (desktop) | Weight | Use |
|---|---|---|---|---|---|
| `display` | Fraunces | 32/38 | 56/60 | 500 | Landing hero only |
| `headline` | Fraunces | 26/32 | 34/40 | 500 | Empty-state headline, paywall headline, verification-outcome banner headline |
| `h1` | Inter | 22/28 | 26/32 | 600 | Screen title (top of FAM/NIN/ADM screens) |
| `h2` | Inter | 18/24 | 20/28 | 600 | Section header within a screen (e.g. "Referencias", "Disponibilidad") |
| `body-lg` | Inter | 16/24 | 17/26 | 400 | Lead paragraph, descripción personal |
| `body` | Inter | 15/22 | 15/22 | 400 | Default body/list/form text |
| `body-sm` | Inter | 13/18 | 13/18 | 400 | Secondary/meta text, helper text, timestamps |
| `caption` | Inter | 12/16 | 12/16 | 500 | Badge labels, chip labels, table headers (admin) |
| `numeral-lg` | Inter | 28/32 | 34/38 | 700 | Match Score percentage |
| `button` | Inter | 15/20 | 15/20 | 500 | Button labels |

Line length for body/profile copy is capped at ~65ch on desktop to keep evaluation content
(descripción personal, responsabilidades) readable rather than stretched full-width.

---

## 2. Spacing Scale & Layout Grid

**Spacing tokens (px):** `space-1:4  space-2:8  space-3:12  space-4:16  space-5:24
space-6:32  space-7:40  space-8:48  space-9:64  space-10:80`

**Breakpoints:** `base <640px` (phone), `md 640–1023px` (tablet), `lg ≥1024px` (desktop).

**Grid / container rules:**

- Mobile: single column, 16px side padding (20px on larger phones), full-bleed
  photography only where the spec calls it out (candidate photo hero on FAM-06).
- Tablet: 2-column card grids where a list of cards exists (FAM-04, NIN-04, NIN-05);
  forms remain single-column.
- Desktop (Familia/Niñera areas): fixed 248px left sidebar nav + content area, content
  max-width 840px for forms/detail screens, 1120px for card-grid listing screens, centered
  with 32–48px outer gutters. Card grids: 3-column at ≥1280px, 2-column at 768–1279px — the
  3-column threshold sits above the general `lg` breakpoint because once the 248px sidebar
  and outer gutters are subtracted from a 1024–1279px viewport, the remaining content width
  is too narrow for a third card without crowding (see FAM-04/NIN-04/NIN-05).
- Desktop (Admin): fixed 232px left sidebar + fluid table area (no max-width cap — queues
  benefit from the full viewport), 24px outer padding.

---

## 3. Color Tokens

Warm neutral base + one brand accent + three reserved trust hues + one danger hue. No other
hues are introduced anywhere in the product.

### 3.1 Neutrals (warm, not cool gray)

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FBF8F3` | Page background (warm off-white, not stark white) |
| `bg-raised` | `#FFFFFF` | Cards, inputs, sheets — sits slightly lighter than page bg |
| `border` | `#E8E1D6` | Default hairline border |
| `border-strong` | `#D8CFC0` | Emphasized dividers, input focus resting border |
| `ink-900` | `#241F19` | Primary text (warm near-black) |
| `ink-600` | `#5C554A` | Secondary text |
| `ink-400` | `#8F877A` | Tertiary text, placeholders, disabled |
| `ink-200` | `#C9C1B3` | Icon-on-light default, disabled borders |
| `overlay-scrim` | `rgba(36,31,25,0.45)` | Modal/sheet scrim (warm-tinted, not pure black) |

### 3.2 Brand accent — terracotta

Used for primary actions, links, active nav state, and the Match Score numeral. **Never**
used for verification states — this keeps "the thing that gets you to act" visually
distinct from "the thing that tells you what's been checked."

| Token | Hex | Use |
|---|---|---|
| `primary-50` | `#FBEAE1` | Selected-chip backgrounds, subtle highlight |
| `primary-100` | `#F3CBB4` | Hover backgrounds |
| `primary-600` | `#C1522C` | Primary buttons, links, active states, Match Score numeral |
| `primary-700` | `#9C4020` | Hover/active/pressed |

### 3.3 Trust states (reserved, three hues only — see §4.2 for full badge spec)

| Token | Hex | Meaning |
|---|---|---|
| `trust-neutral-*` | uses `ink-400`/`border`/`bg-raised` | "No verificada" — no dedicated hue, deliberately renders as an absence of a claim, not a colored state |
| `trust-pending-50 / 600 / 800` | `#FCF2DE` / `#B8791A` / `#7A4E0C` | "Verificación en proceso" — amber, calm, never confused with error/red |
| `trust-verified-50 / 600 / 800` | `#E7F5EE` / `#1F7A5C` | "Identidad verificada" — teal-green, affirmative |

These three hues are reserved **exclusively** for `TrustBadge` (§4.1). Contact-channel
verification (correo/teléfono, on AUTH-03, FAM-13, NIN-11) is a different, binary concept —
done or not-done, never a three-state review — and must never borrow `trust-verified-*` or
`trust-pending-*`. It signals completion using the outline→filled icon convention (§0.11)
plus a neutral ink-weight change only, never a color change. Borrowing a trust hue here would
let a family read "teal" as a generic "verified" signal rather than specifically "identity
verified by Clin's operators," which defeats the scarcity this section exists to protect.

### 3.4 Danger (destructive/error only — used sparingly)

| Token | Hex | Use |
|---|---|---|
| `danger-50` | `#FBEAE8` | Error banner/toast background |
| `danger-600` | `#B3261E` | Error text, destructive outline buttons, form error borders |
| `danger-700` | `#8C1E17` | Solid destructive button (reserved for the final "Eliminar cuenta" confirm only) |

Color usage rule: **a hue is never introduced for decoration.** If a screen needs a status
color not covered above, that is a signal the state should be re-evaluated against the
existing tokens (most pipeline/informational states in §5.9 map onto neutral + one of the
above, not a new color).

---

## 4. Trust & Verification Components (the parts that must be visually correct)

### 4.1 Component: `TrustBadge` (identity verification, three states)

One component, three mutually-exclusive states. What's invariant everywhere it appears is
its **color/icon/label semantics** — the same three state definitions below, never a fourth
variant. Geometry scales by context rather than being pixel-identical everywhere: a
**compact inline pill**, immediately right of the niñera's name, is the default placement
used on FAM-04 candidate cards, FAM-06 profile detail, NIN-07 own profile, and admin ADM-03's
context panel — surfaces where the badge is a secondary reference alongside other content.
NIN-03 (dashboard) and NIN-08 (identity-upload screen) intentionally use larger, documented
scale variants — banner-scale and large-standalone respectively (see UI-SPEC) — because those
two screens exist specifically to communicate the niñera's *own* verification status as the
primary subject of the screen, not as a passing reference to someone else's. This is a
deliberate emphasis choice, not an inconsistency: the rule to hold constant is the color/icon
/label logic, not the pixel geometry.

Shape (compact/default placement): pill, `radius-full`, height 24px (28px on detail
screens), horizontal icon+label, `caption` type, 8px horizontal padding, 1px border.

| State | Icon (Phosphor) | Border/bg/text | Label |
|---|---|---|---|
| No verificada | `Circle` (outline) | border `border-strong`, bg `bg-raised`, text `ink-600` | "No verificada" |
| Verificación en proceso | `Clock` (outline) | border `trust-pending-600` @ 40% (`#B8791A` at reduced opacity for border), bg `trust-pending-50`, text `trust-pending-800` | "Verificación en proceso" |
| Identidad verificada | `ShieldCheck` (**filled**) | border `trust-verified-600` @ 40%, bg `trust-verified-50`, text `trust-verified-800` | "Identidad verificada" |

Explicit design decisions this encodes:

- **"En proceso" never uses red, orange-alarm, or the danger token.** Amber reads as
  "in motion, neutral" in this palette specifically because amber appears nowhere else in
  the product except here — there is no competing "amber = warning" convention to collide
  with.
  Amber is also visually closer to `bg`/neutral warmth than to `danger-600`, so it recedes
  rather than alarms.
- **Within any given placement, all three states share identical geometry and the same
  fixed slot** — a family never sees an empty space where a badge could be, and the badge
  never grows/shrinks/moves depending on *state* within that placement, so no state reads as
  "less complete a UI" than another. (Geometry may still differ *between* placements per the
  scale-variant rule above — compact pill vs. NIN-03 banner vs. NIN-08 standalone — but never
  varies state-to-state within one placement.)
- **"No verificada" is deliberately the quietest of the three** (neutral ink tones, no
  color fill) — it should read as "nothing to report yet," not as a flag or a warning.
- On tap/click (mobile) or hover (desktop), the badge reveals a one-line tooltip/sheet with
  the plain-language explanation ("Esta niñera aún no ha subido su identificación" /
  "Estamos revisando su identificación, normalmente toma 24–48 horas" / "Identidad
  verificada por el equipo de Clin"), so the state is never just an unexplained pill.

### 4.2 Component: `ReferenceList` (self-reported, deliberately un-badged)

Renders on FAM-06 and NIN-07 as a plain, separate section — never inside a "confianza y
seguridad" cluster, never near the `TrustBadge`.

- Section heading (`h2`, Inter, ink-900): **"Referencias"**
- Immediately below, in `body-sm` / `ink-600`: **"Proporcionadas por la niñera — Clin no
  las ha verificado."** This line is permanent, not dismissible, and always renders even
  when references are empty.
- Each reference is a plain row: name + relationship (e.g. "Familia anterior," 2021–2023) +
  optional contact note, separated by hairline `border` dividers. No card wrapper, no
  border-radius container, no background tint.
- Icon: a single small outline `ChatCircleText` icon (neutral `ink-400`) at the section
  heading only — never a shield, checkmark, or any icon shared with `TrustBadge`.
- No color from §3.3 (trust hues) is used anywhere in this component. If references were
  ever teal or amber, they would visually borrow the verification badge's credibility by
  association — this is the exact failure mode Decision 2 exists to prevent.

### 4.3 Component: `MatchScore`

Used on FAM-04 (compact), FAM-06 (full detail), NIN-04/NIN-05/NIN-06 (niñera-facing
mirror). Two densities of the same component:

**Compact (card):**
- Large numeral, `numeral-lg`, `primary-600` (e.g. "92%"), with "compatible" in `body-sm`
  `ink-600` immediately beside/below it.
- Up to 3 checklist lines below, `body-sm`, each with a small outline `Check` icon in
  `ink-600` (not colored, not a badge) + plain text (e.g. "Disponible L–V"). Checklist
  items are plain rows, not chips/pills — avoids stacking a third badge style onto an
  already-badged card (verification badge + match score should be the only two visual
  "signals" on a card; the checklist is typographic, not componentized).

**Full (detail):**
- Same numeral treatment, larger (`numeral-lg` at desktop max size), with a short
  sub-label clarifying it's a fit estimate, not a guarantee (copy TBD by content, not a UI
  concern — TECH_ARCHITECTURE owns the underlying factors per addendum).
- Full checklist, same plain-row treatment as compact, no artificial cap on item count.
- This component deliberately renders **no weighting/breakdown numbers per factor** —
  only the aggregate % and the pass/fail checklist the PRD's own example shows. Per-factor
  weights are a TECH_ARCHITECTURE spike (addendum); the visual system is built to display
  whatever checklist items the engine returns, generically, without assuming specific
  factors beyond the PRD's own example set.

### 4.4 Component: `PaywallGate` (contact-gate moment)

Full-screen takeover (mobile) / centered dialog (desktop), triggered only by "Contactar" /
"Solicitar entrevista" — see UI-SPEC FAM-08 for full screen composition. Key visual rules:

- Uses `headline` (Fraunces) for the single price/offer line — this is one of the scarce
  Fraunces moments (§0.4), so the paywall reads as a considered, calm moment rather than an
  aggressive interstitial upsell.
- Lock iconography (outline `LockSimple`, `primary-600`, inside a `primary-50` circular
  container) — never red, never an exclamation mark. The gate is a normal, expected part of
  the product, not an error state or a "you did something wrong" moment.
- No dark pattern affordances: "Cerrar"/dismiss is always equally visible as "Continuar a
  pago," same button size class (secondary vs primary weight, not size), positioned
  consistently (primary bottom, secondary text-link below it) on every occurrence.
- Every screen that leads up to this moment (browsing, filtering, profile viewing,
  favoriting) renders with **zero paywall visual language** — no blurred content, no lock
  icons, no "desbloquear para ver más" teasers, no dimmed sections. The gate exists at
  exactly one moment; nothing upstream foreshadows it visually, matching UX Decision 4.

---

## 5. Core Components

### 5.1 Buttons

| Variant | Bg | Border | Text | Use |
|---|---|---|---|---|
| Primary | `primary-600` | none | white | One per screen/section — the single most important action (Publicar necesidad, Continuar a pago, Confirmar solicitud) |
| Secondary | transparent | 1px `border-strong` | `ink-900` | Supporting actions (Guardar y salir, Editar, Filtrar) |
| Text/link | transparent | none | `primary-600`, underline on hover | Tertiary actions, in-line links |
| Destructive-outline | transparent | 1px `danger-600` | `danger-600` | Descartar, Reportar-adjacent negative actions |
| Destructive-solid | `danger-700` | none | white | Reserved exclusively for the final confirm step of "Eliminar cuenta" (ADM-05) |

Height: 44px default (touch target), 40px in dense/admin contexts. Radius `radius-sm`.
No shadow. Disabled: 40% opacity, no pointer events. Loading: label replaced by a 16px
spinner, button width does not reflow.

### 5.2 Inputs

Height 44px, 1px `border`, `radius-sm`, `bg-raised`. Label always above the field (no
floating labels — prioritizes legibility for a broad-literacy, mobile-first audience over
compactness). Focus: 2px `primary-600` ring + border darkens to `primary-600`. Error:
border `danger-600`, helper text below in `danger-600` `body-sm` with a small inline
`WarningCircle` icon. Helper/hint text (non-error) in `ink-400`.

Specialized inputs:
- **Rango de edad, modalidad, día-de-semana:** rendered as selectable chip groups (pill
  buttons, `radius-full`, outline `border` default → `primary-50` bg / `primary-600`
  border+text when selected), never a dropdown or free numeric/date field — this is the
  concrete UI expression of the CONSTRAINTS-mandated age-range field.
- **Rango de pago:** dual numeric input pair (min–max) with MXN currency prefix, plus an
  optional slider affordance on desktop.

### 5.3 Cards

Default: `bg-raised`, 1px `border`, `radius-md`, 16–20px padding, **no shadow at rest**.
Interactive cards (candidate card, vacante card, opportunity card) gain `elevation-1`
(§6) and a `border-strong` edge on hover/focus only — signals tappability without making
static content look like it's floating.

Cards are used only for genuinely discrete, browsable/tappable objects (a candidate, a
vacante, a payment-history line). Page sections that are simply "a group of related fields
or content" (e.g. a profile's "Disponibilidad" section) are **not** wrapped in a card — they
are plain sections separated by a hairline divider and a section heading. This is the
primary defense against the "everything in a rounded container" symptom.

### 5.4 Navigation

- **Familia/Niñera, mobile:** bottom tab bar, 60px + safe-area, `bg-raised`, 1px top
  `border`, no shadow. 3 items (Familia: Mis necesidades / Favoritas / Cuenta) or 5 items
  (Niñera: Inicio / Oportunidades / Mis solicitudes / Mi perfil / Cuenta). Active: icon +
  label in `primary-600`; inactive: `ink-400`.
- **Familia/Niñera, desktop:** fixed 248px left sidebar. Logo (wordmark, Fraunces
  "Clin" lockup) top-left, nav rows below (icon 20px + label), active row gets a
  `primary-50` pill background behind icon+label, not just a color change — makes the
  active state readable at a glance in a short list.
- **Admin, always desktop, always sidebar:** 232px, Inter-only, denser row height (36px vs
  44px), no logo lockup treatment (small wordmark, not the emotional landing lockup) — the
  admin sidebar should read as a tool, not a brand moment.

### 5.5 Badges & chips (non-trust)

Reserved for genuinely useful state/metadata, not decoration. Two allowed shapes:
- **Status chip** (pill, `caption`, neutral `ink-600` on `bg` with `border`): "Interesada"
  flag on a family's candidate card, "Borrador" on an incomplete necesidad.
- **Count/meta chip**: e.g. "3 candidatas" summary on a FAM-02 necesidad card — plain text
  with a numeral, not colored.

No screen should carry more than two badge-like elements per card (in practice: the
`TrustBadge` + at most one status chip). Pipeline state (§5.9) is communicated by column/tab
position, not a third badge, specifically to avoid badge stacking.

### 5.6 Feedback: toasts, banners, inline validation

- **Toast** (favorited, reported, saved): bottom-anchored (mobile) / bottom-left (desktop),
  single line, icon + message, `bg-raised` with `elevation-2`, auto-dismiss 4s, max one
  visible at a time (new toast replaces, doesn't stack).
- **Persistent banner** (verification status on NIN-03, "cuenta no verificada" on
  familia/niñera home): full-width, top of content area, colored per the relevant trust
  token (§3.3) when it's a verification banner, or neutral `ink` styling for the contact
  -verification reminder (not a trust-badge state, so it doesn't borrow those hues).
  Dismissible only when the underlying condition isn't blocking a paid action.
- **Inline validation**: per §5.2.

### 5.7 Modals / dialogs / sheets

- **Desktop:** centered dialog, max-width 480–560px (paywall/checkout may use 560–640px to
  fit order summary), `radius-lg`, `elevation-3`, `overlay-scrim` background.
- **Mobile:** two patterns depending on complexity — a **bottom sheet** (drag handle,
  `radius-lg` top corners only) for lightweight confirms and filters (FAM-05 filtros,
  "Eliminar cuenta" confirm), and a **full-screen takeover** (no scrim, replaces the view
  entirely) for multi-step or payment-context flows (FAM-08/FAM-09 paywall/checkout, FAM-03
  wizard steps).
- Destructive confirmations (ADM-05 "Eliminar cuenta") never dismiss via scrim-tap —
  require an explicit Cancelar/Confirmar choice.

### 5.8 Empty states

Icon (24–32px outline Phosphor icon) inside an 64–80px `primary-50` circular container →
`headline` (Fraunces) short statement → one `body` line of guidance → one primary action.
Never a bare "no hay resultados." Copy per screen is specified in UI-SPEC/UX-spec; the
visual template is identical everywhere it's used (FAM-04, FAM-11, NIN-04, NIN-05, NIN-09,
ADM-02, ADM-04).

### 5.9 Pipeline / state display (FAM-11, NIN-09, ADM queues)

- **FAM-11 desktop:** kanban, 5 columns (Nueva/Contactada/Entrevista/Contratada/Descartada),
  column header = plain label + count, no per-card status badge (position already encodes
  state, per §5.5's anti-badge-stacking rule). Cards inside columns: name, photo, `days in
  this state` meta line, "Ver perfil" link.
- **FAM-11 mobile:** segmented control (horizontally scrollable tabs) replacing columns, one
  state's list visible at a time.
- **NIN-09:** same list treatment, read-only (no drag/advance controls), same "position =
  state" convention via grouped section headers instead of a badge per row.
- **Admin queues (ADM-02/04):** table rows, SLA/time-in-queue rendered as a small colored
  dot + text (green `trust-verified-600`/amber `trust-pending-600`/red `danger-600`) — this
  is the one place `danger-600` is used for a non-error, non-destructive state, because an
  SLA breach genuinely is a problem the operator must act on; it does not touch the family/
  niñera-facing `TrustBadge` semantics.

### 5.10 Loading states

Skeleton blocks matching final layout geometry (photo circle/rect, text bars at final line
lengths) for list/detail screens; inline 16px spinners for button-level submission states.
No full-screen spinner-only loading screens except the very first app shell load.

### 5.11 Responsive behavior (summary — see UI-SPEC per-screen for detail)

Mirrors `design/UX-spec.md` Part D exactly (this system does not re-litigate UX's
responsive decisions, only specifies their visual execution): bottom-tab↔sidebar nav,
wizard steps↔single scroll form, card grids 1↔2↔3 columns, filters sheet↔sidebar panel,
kanban↔segmented tabs, paywall/checkout full-screen↔centered dialog, camera-capture↔file
picker priority for ID upload. Admin remains desktop-only per CONSTRAINTS.

---

## 6. Elevation Tokens

| Token | Value | Use |
|---|---|---|
| `elevation-0` | none (1px border only) | Default resting state for nearly everything |
| `elevation-1` | `0 1px 2px rgba(36,31,25,0.06), 0 1px 1px rgba(36,31,25,0.04)` | Hover/focus feedback on interactive cards |
| `elevation-2` | `0 8px 24px rgba(36,31,25,0.12)` | Toasts, dropdowns, popovers |
| `elevation-3` | `0 16px 48px rgba(36,31,25,0.18)` | Modals, dialogs, full-screen-adjacent sheets |

---

## 7. Component Strategy & Build Notes (for TECH_ARCHITECTURE / BUILD)

- **Base:** shadcn/ui (Radix primitives + Tailwind) for behavior/accessibility — Dialog,
  Sheet, Tabs, Select, RadioGroup, Checkbox, Popover, Toast (or `sonner`), Avatar, Progress,
  Form primitives.
- **Full retheme required, not default shadcn styling.** Replace default slate/zinc palette
  and default radius with the tokens in §3/§6; replace shadcn's default "everything is a
  `<Card>`" composition habit with the plain-section-vs-card distinction in §5.3.
- **New custom components** (no existing shadcn equivalent): `TrustBadge` (§4.1),
  `ReferenceList` (§4.2), `MatchScore` (§4.3), `PaywallGate` composition (§4.4, built from
  Dialog/Sheet primitives + custom content), pipeline board (§5.9, custom — shadcn has no
  kanban primitive).
- Do not adopt a shadcn block/template wholesale (e.g. a prebuilt "SaaS dashboard" or
  "pricing page" block) — every screen in UI-SPEC is composed from the primitives above
  against this system's tokens, not from a generic pre-styled block.
- Icon package: `@phosphor-icons/react`, Regular weight default, per §0.11's outline/filled
  rule for `TrustBadge`.
- Fonts: `Inter` (variable) via standard web font loading; `Fraunces` (variable, optical
  size axis available) loaded only where used (§0.4) to avoid shipping display-serif weight
  variations the product barely uses.
