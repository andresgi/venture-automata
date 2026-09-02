# UI Review — Clin (Nanamex), UI-001

Reviewer: UI Critic (independent)
Scope: `design/UI-SYSTEM.md`, `design/UI-SPEC.md`, cross-checked against `product/prd.md`,
`product/prd-addendum.md`, `design/journeys.md`, `design/information-architecture.md`,
`design/screen-inventory.md`, `design/UX-spec.md`, `config/PROJECT.md`, `config/CONSTRAINTS.md`.

This is a document-quality review (no rendered app exists — BUILD has not started).

## Verdict

**PASS_WITH_MINOR_ISSUES**

This is a strong, unusually disciplined design system for a two-sided trust marketplace. It
correctly and legitimately resolves all four UX-decision-critical visual treatments the
orchestrator flagged, is genuinely differentiated (not default Tailwind/shadcn, not generic
SaaS, not twee), and gives concrete, verifiable rationale rather than assertion for its "warm,
calm, editorial" direction. It should not be blocked from proceeding to TECH_ARCHITECTURE, but
the items below — mostly internal-consistency defects between the system's own stated rules
and its own screen-level usage — should be corrected (or explicitly resolved as intentional)
before/during BUILD so they don't get silently interpreted either way by whoever implements
them.

---

## 0. Screen coverage claim — verified, and a correction to the review brief

The review brief states screen-inventory.md lists 40 screens. On actual count, it lists
**37**: AUTH-01…05 (5) + FAM-01…13 (13) + NIN-01…11 (11) + ADM-01…05 (5) + SYS-01…03 (3) = 37.
I could not find a 40th/38th/39th screen anywhere in `design/screen-inventory.md` as supplied.

Cross-checked every one of those 37 IDs against `design/UI-SPEC.md`: all 37 are covered, either
with a full per-screen spec or via an explicit group (AUTH-04/05, FAM-01, FAM-12/NIN-10,
NIN-01/02, NIN-11, ADM-01, SYS-01/02/03). The grouping is legitimate, not a coverage gap: it
mirrors `design/UX-spec.md` Part B's own stated list of "simple/self-explanatory screens" almost
exactly (AUTH-04, AUTH-05, FAM-01, FAM-07, FAM-13, NIN-01/02, NIN-11, ADM-01) — UX-spec, not the
UI Designer, made this grouping decision first; UI-SPEC just inherits it (and in fact goes
slightly further than the minimum by giving FAM-07 and FAM-13 their own short paragraphs rather
than leaving them fully implicit).

**Conclusion: the designer's "37 screens, full coverage" claim is accurate.** The 40-screen
figure in this review's brief does not match the authoritative source as supplied and should not
be used to fault this deliverable. Flagging this discrepancy so the orchestrator can confirm
whether screen-inventory.md was supposed to have 3 more screens that are missing from the copy I
read, rather than assuming UI-SPEC under-delivered.

---

## 1. The four UX-decision-critical treatments

### 1.1 Three-state pending-verification badge (`TrustBadge`) — correctly designed, one internal contradiction

- Single component, three mutually exclusive states, consistent iconography rule (outline =
  unresolved, filled = resolved) applied nowhere else in the product (UI-SYSTEM §0.11, §4.1).
  This is exactly right for the addendum's "must stay visible/matchable, not look broken or
  suspicious" requirement.
- "Verificación en proceso" is amber (`trust-pending-*`), explicitly never red/danger, and the
  system's own reasoning for why amber reads neutral here (no competing "amber = warning"
  convention elsewhere in the palette) is sound and non-trivial — this is real design reasoning,
  not just an assertion.
- "No verificada" is deliberately the least visually assertive of the three (neutral ink,
  outline icon, no color fill) — correctly avoids reading as a warning/flag.
- All three states occupy the same fixed slot/geometry next to the name, so a profile never
  reads as "less complete" for being unverified — directly satisfies the addendum's core
  requirement that unverified niñeras not be visually deprioritized.
- **Finding (Medium) — internal contradiction on badge geometry across surfaces.**
  UI-SPEC's own cross-cutting QA checklist item 1 states: *"`TrustBadge` renders identically
  (geometry, position relative to name, icon outline/filled rule) on FAM-04, FAM-06, NIN-03,
  NIN-07, NIN-08, and in ADM-03's context panel."* But the NIN-03 and NIN-08 screen specs
  explicitly describe **different geometry**:
  - NIN-03: "the one place the badge appears at banner scale (full-width, larger icon 24px,
    includes the plain-language explanation text inline...)"
  - NIN-08: "reuses `TrustBadge`'s exact color/icon logic but at a bigger, standalone size (48px
    icon, full headline-level label)"

  So there are at least three distinct geometries in the spec (standard 24–28px pill; NIN-03's
  full-width banner; NIN-08's 48px standalone), while the QA checklist item that's supposed to
  gate this claims they're identical. This isn't necessarily wrong as a design choice — a status
  dashboard and an upload-status screen plausibly warrant a bigger treatment of the niñera's own
  state than a peer-browsing pill does — but the spec is internally inconsistent about what rule
  actually governs it, and a Visual QA pass run literally against checklist item 1 as written
  would fail on NIN-03/NIN-08 even though the design intent is fine.
  - **Recommended direction:** rewrite checklist item 1 to say the badge's *color/icon/label
    semantics* (not literal geometry) are identical everywhere, and explicitly carve out NIN-03
    (banner) and NIN-08 (large standalone) as documented, intentional scale variants — not
    silently contradict the claim.

### 1.2 Referencias vs. verified-identity badge — correctly and cleanly separated

- `ReferenceList` (§4.2) uses a different icon (`ChatCircleText`, neutral `ink-400`, never a
  shield/checkmark), no trust hues, plain unbadged rows, and a persistent disclaimer line
  ("Proporcionadas por la niñera — Clin no las ha verificado"). This is a clean, well-reasoned
  execution of UX Decision 2 and directly answers the Product Critic's original concern about
  implied equal rigor.
- Physical separation (40px / `space-7` gap, explicit divider) from `TrustBadge` is specified for
  FAM-06 and enforced by the cross-cutting QA checklist item 2. NIN-07 relies on "same visual
  non-badge treatment" inherited from FAM-06 rather than restating the spacing rule explicitly —
  minor documentation thinness, not a design defect, since NIN-07 is explicitly built to mirror
  FAM-06's section order.
- No issues found here beyond the minor documentation point above.

### 1.3 Paywall/contact-gate visual treatment — correctly designed

- Zero paywall visual language upstream of FAM-08 is stated as an explicit rule (§4.4) and
  re-asserted in the cross-cutting QA checklist item 3 (no lock icon, blur, dimming, or
  "desbloquear" language on FAM-04/05/06/07).
- The gate itself uses `LockSimple` in a `primary-50`/`primary-600` (terracotta) treatment —
  explicitly never red/danger, explicitly "not an error state or a 'you did something wrong'
  moment." This meets the requirement to avoid an alarming/drop-off-inducing gate.
- The gate is not obscured either: the offer price and duration ("MX$299 · Contacta candidatas
  durante 30 días") is the single Fraunces headline on the screen — maximum visual prominence,
  so a family cannot miss that a purchase is required.
- Equal-weight dismiss ("Cerrar"/"Cancelar" always as visually available as the primary CTA, same
  position every time) avoids a dark-pattern read, and is a good, specific choice for a
  trust-sensitive product where forcing/hiding a decline path would undercut the "honest, not
  persuasive" brand principle stated in §0.2.
- No issues found here.

### 1.4 Match Score display — correctly scoped, does not overclaim sophistication

- Shows aggregate % (in `numeral-lg`, `primary-600` — deliberately never a trust hue, keeping it
  separate from the verification badge) plus a plain-row checklist, matching the PRD's own
  example format exactly.
- Explicitly states the component "renders no weighting/breakdown numbers per factor" and is
  built to display "whatever checklist items the engine returns, generically" — this is exactly
  right given TECH_ARCHITECTURE has not yet defined weights/thresholds (addendum spike). No gauge,
  radial meter, confidence interval, or "AI-powered" language anywhere in the spec that would
  imply more algorithmic sophistication than the PRD's stated rules-based approach.
- Card-level cap of "up to 3 checklist lines" vs. the PRD's own example showing 5 checkmarks is a
  reasonable, explicitly-scoped simplification (full/uncapped list lives on the detail view) —
  not a misrepresentation.
- No issues found here.

**Summary for the four critical items: three are cleanly executed with no issues; the fourth
(TrustBadge) is correctly designed in intent but has one internal documentation contradiction
(§1.1) that should be fixed before it's used as a literal QA gate.**

---

## 2. Other findings

### 2.1 Finding (Medium) — trust-hue reuse outside identity verification, contradicting the system's own scarcity principle

`UI-SYSTEM.md` §0.8 is explicit: *"exactly three reserved trust-state hues that are never reused
for anything else in the product... if the same amber or teal showed up decoratively elsewhere,
the badges would lose their signal value."* This is a real, well-articulated principle — but two
parts of the spec violate it:

- **AUTH-03** (`UI-SPEC.md`): describes a completed email/phone verification row as flipping to
  "filled-check + `trust-verified-600` text, matching the resolved-state convention from
  `TrustBadge`." This borrows the *identity-verification* teal for a completely different concept
  (binary contact-channel verification), diluting exactly the signal value §0.8 says must be
  protected.
- This directly **contradicts FAM-13** in the same document, which explicitly says familia/niñera
  contact-verification status "uses the resolved/unresolved outline→filled icon convention
  (§0.11) but **never** the amber 'en proceso' hue... since email/phone verification is binary."
  FAM-13 implies color is *not* borrowed (only the icon shape convention is); AUTH-03 explicitly
  says color *is* borrowed. Same underlying UI element (contact verification checklist), two
  contradictory color rules in the same document.

**Why this matters:** the entire strategic case for the three-state `TrustBadge` (both in
UI-SYSTEM's reasoning and in the addendum's Critical Issue #2 resolution) rests on trust hues
being scarce and exclusively meaningful. If teal also means "your OTP succeeded," a family
scanning a profile page loses the ability to treat teal as meaning specifically "identity
verified by Clin's operators" — which is the whole point of Decision 3.

**Recommended direction:** pick one rule and apply it everywhere contact verification is shown
(AUTH-03, FAM-13, NIN-11): either (a) contact verification uses ink/neutral + icon-shape change
only, never a trust hue (matching FAM-13's stated rule — my recommendation, since it protects the
scarcity principle §0.8 argues for), or (b) if the founder/architect wants a green "done" signal,
introduce a distinct, non-trust-reserved semantic-success color rather than reusing
`trust-verified-600`, and update §0.8/§3.3 to say so explicitly rather than leaving the
contradiction standing.

### 2.2 Finding (Minor) — desktop grid breakpoint mismatch (1024px vs 1280px)

`UI-SYSTEM.md` §2 states: *"Card grids: 3-column at ≥1024px, 2-column at 768–1023px."* But
`UI-SPEC.md` FAM-04 states: *"Grid: single column mobile (full-width cards); 2-column ≥768px,
3-column ≥1280px."* NIN-04/NIN-05 inherit FAM-04's grid ("same card grid pattern as FAM-04"), so
this propagates. Between 1024–1279px, the system-level rule and the screen-level rule disagree
about whether the grid should already be 3-column or still 2-column. Not visible at the four
review viewports listed in the brief (375/430/768/1440 all fall unambiguously on one side or the
other), but it's a real spec defect a developer would have to guess through at implementation
time.

**Recommended direction:** reconcile to a single breakpoint (either update §2 to ≥1280px, or
update FAM-04/NIN-04/NIN-05 to ≥1024px) before BUILD.

### 2.3 Finding (Minor) — ambiguous child-imagery rule vs. landing-page photography brief

`UI-SYSTEM.md` §0.10 states two things that read as in tension: photography should show "a
caregiver/family moment" on the landing page (§0.10's own "Photography over illustration" bullet
and AUTH-01's brief in UI-SPEC: "photo of a real caregiver/family moment"), while the same
section separately states *"No illustrations of children... should not visually feature child
imagery at all — this keeps the product's visual register focused on evaluating the niñera and
the arrangement, not on manufacturing warmth via pictures of kids that aren't the user's own."*
As written, it's ambiguous whether "a real caregiver/family moment" on the landing hero is
permitted to include a child in frame (a very natural photographic subject for that phrase) or
must be staged to show only adults (niñera + parent, no child), which is a materially different
photo brief.

Given this product handles sensitive data about real children and the stated principle is
explicit and well-reasoned, this ambiguity should not be left for whoever sources landing
photography to resolve ad hoc.

**Recommended direction:** make AUTH-01's photo brief explicit about whether children may appear
(even anonymized/non-identifying, e.g. from behind, out of focus) or must exclude children
entirely, and align the wording so §0.10's rule and AUTH-01's brief don't read as contradictory.

### 2.4 Finding (Minor) — one UX cross-cutting state has no visual treatment

`UX-spec.md` Part C defines "Permission denied" as a global state (role-mismatched routes redirect
home with a neutral message). This is not a numbered screen ID, so it's reasonable it isn't a
full section in UI-SPEC, but it also isn't mentioned anywhere (no banner/toast pattern assigned).
Given every other Part C cross-cutting state (loading, empty, error, success, unavailable, session
expired) has a corresponding visual pattern somewhere in UI-SYSTEM/UI-SPEC, this one is a small
gap.

**Recommended direction:** add one line specifying what "neutral message" looks like visually
(e.g. a neutral inline banner on whatever home screen the user lands on, using the same
non-`danger` neutral treatment as SYS-03) so it isn't left to be invented during BUILD.

---

## 3. General design quality assessment

**Visual hierarchy / composition:** strong. FAM-06 explicitly states its intended scan order
(identity → why she's a match → facts → voice → self-reported references, clearly last/separate
→ decision actions), and FAM-04's card composition explicitly names the Match Score numeral as
the single most visually dominant element with the badge deliberately secondary. This is
considered hierarchy, not a flat stack of equally-weighted elements.

**Typography:** disciplined two-typeface system with a real, stated reason for scarcity (Fraunces
reserved for landing hero, empty states, paywall headline, verification-outcome banners only —
explicitly excluded from admin and dense transactional UI). Type scale is complete and
consistent (display/headline/h1/h2/body variants/caption/numeral-lg/button), with a sensible
65ch line-length cap for evaluation copy.

**Component coherence:** genuinely coherent. Border radius is tied to a stated concreteness
principle rather than applied uniformly (§0.6) — this alone rules out the single most common
"AI-generated UI" tell (everything wrapped in identical rounded cards). §5.3 explicitly forbids
wrapping plain profile sections in cards, reserving cards for genuinely discrete/tappable
objects. Buttons, inputs, and badges each have one canonical definition that UI-SPEC's screens
consistently draw from (verified by spot-checking button variant usage across AUTH-02, FAM-03,
FAM-06, FAM-08, ADM-03, ADM-05 — all map cleanly onto the five documented variants with no
invented one-offs, aside from the color-token issue at §2.1 above).

**Product character:** this is a real point of strength. The system explicitly names and rejects
both failure modes relevant to this product (generic B2B SaaS blue-gradient dashboards, and
twee/childish pastel-mascot design), gives specific, non-generic tokens (warm off-white
`#FBF8F3`, terracotta accent `#C1522C`, teal/amber reserved trust hues), and explicitly forbids
adopting shadcn's default palette/radius or any prebuilt shadcn block wholesale. This reads as an
intentional, specific identity rather than a component-library demo — a materially better outcome
than the median AI-generated design system.

**Trust:** appropriate for the domain. The verification badge, referencias disclaimer, and
paywall are all handled with the "honest, not persuasive" principle applied consistently and
concretely (no dark patterns, no red/alarm treatment of a normal pending state, no visual
implication of more rigor than actually exists). This is the correct register for a childcare
marketplace, distinct from both a corporate/clinical tone and an infantilizing one.

**Responsive quality:** comprehensive coverage of the four target viewports via three
breakpoints (base <640, md 640–1023, lg ≥1024) plus a documented desktop-only exception for
admin that correctly traces back to `config/CONSTRAINTS.md`'s QA Ownership section. Per-screen
responsive behavior (wizard steps↔single scroll, kanban↔segmented tabs, sheet↔sidebar filters,
full-screen↔dialog paywall, camera↔drag-drop upload) is specified with reasoning, not just
declared. The one defect found is the 1024/1280 breakpoint mismatch noted at §2.2.

**AI-design smell check:** explicitly and successfully avoided — no card soup (§5.3 rule against
it), no gradient overuse (one functional scrim gradient on the landing photo, nothing decorative),
no arbitrary/uniform border radii (§0.6), icons are functional-only with an explicit
no-decoration rule (§0.11), badge/pill usage is capped ("no more than two badge-like elements per
card," §5.5) rather than stacked, whitespace is calibrated per content type rather than uniformly
generous, and hero typography is used exactly once (landing) rather than repeated as a "giant
headline" pattern across screens. This system does not read as a component-library demo.

---

## 4. Summary of findings by severity

| # | Severity | Screen(s) | Issue |
|---|---|---|---|
| 1 | Medium | NIN-03, NIN-08, cross-cutting QA checklist | `TrustBadge` geometry described as "identical" in the QA checklist but explicitly varies (pill vs. banner vs. large standalone) in the actual screen specs |
| 2 | Medium | AUTH-03 vs. FAM-13 | Contact-verification success state contradicts itself on whether it borrows `trust-verified-600` — and either way, borrowing a reserved trust hue outside identity verification violates the system's own stated scarcity principle (§0.8) |
| 3 | Minor | FAM-04 / NIN-04 / NIN-05 vs. UI-SYSTEM §2 | Desktop card-grid 3-column breakpoint disagreement: 1024px (system) vs. 1280px (screen specs) |
| 4 | Minor | AUTH-01 vs. UI-SYSTEM §0.10 | Ambiguous whether landing-page "caregiver/family moment" photography may include a child, given the explicit "no child imagery" principle |
| 5 | Minor | (global) Permission-denied state | UX-spec's cross-cutting "permission denied" state has no corresponding visual treatment anywhere in UI-SYSTEM/UI-SPEC |
| — | Informational | screen-inventory.md count | Review brief states 40 screens; actual authoritative document lists 37, and all 37 are legitimately covered by UI-SPEC — not a coverage gap |

None of these rise to a level that should block handoff to TECH_ARCHITECTURE. All are
documentation-consistency or breakpoint-reconciliation items that can be resolved with small,
targeted edits to `design/UI-SYSTEM.md`/`design/UI-SPEC.md` (recommend routing back to the UI
Designer for a quick pass) or explicitly accepted as-is via `agent/DECISIONS.md` if the
orchestrator judges them low enough priority to defer to BUILD-time judgment calls — but items
1 and 2 in particular touch the specific trust-signal integrity this whole phase exists to
protect, so I'd recommend at least a decision record either way rather than silent deferral.

## 5. Files reviewed

- `/Users/andresgi/Documents/development/venture-automata/projects/nanamex/product/prd.md`
- `/Users/andresgi/Documents/development/venture-automata/projects/nanamex/product/prd-addendum.md`
- `/Users/andresgi/Documents/development/venture-automata/projects/nanamex/design/journeys.md`
- `/Users/andresgi/Documents/development/venture-automata/projects/nanamex/design/information-architecture.md`
- `/Users/andresgi/Documents/development/venture-automata/projects/nanamex/design/screen-inventory.md`
- `/Users/andresgi/Documents/development/venture-automata/projects/nanamex/design/UX-spec.md`
- `/Users/andresgi/Documents/development/venture-automata/projects/nanamex/config/PROJECT.md`
- `/Users/andresgi/Documents/development/venture-automata/projects/nanamex/config/CONSTRAINTS.md`
- `/Users/andresgi/Documents/development/venture-automata/projects/nanamex/design/UI-SYSTEM.md`
- `/Users/andresgi/Documents/development/venture-automata/projects/nanamex/design/UI-SPEC.md`
