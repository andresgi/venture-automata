# Code Review

Story: E1-01 — AUTH-01 Landing + role selection
Branch reviewed: `nanamex/e1-01-landing-role-selection` (diff vs `main`)

## Verdict

PASS_WITH_MINOR_ISSUES

## Critical Issues

None.

## Important Issues

1. **Hero image does not depict a "caregiver/family moment" as UI-SPEC AUTH-01 requires,
   and this is admitted in the sourcing doc.** `design/UI-SPEC.md` AUTH-01 requires "photo
   of a real caregiver/family moment ... (a niñera, a parent, or both together in a home
   setting)". The selected photo (`public/images/auth-01-hero.jpg`) shows a single woman
   alone, cutting fruit in a kitchen — a generic warm-home lifestyle photo, not a
   caregiving scene. `public/images/README-auth-01-hero.md:29-33` explicitly says: "It
   does not literally depict a 'niñera/family' interaction ... this is a known gap." This
   is honestly disclosed, but it is a real AC gap, not just a style nit — the whole point
   of the photo per UI-SPEC is to frame "the adults evaluating each other" (UI-SYSTEM
   §0.10). I've independently viewed the image and confirm it is child-safe (see Security
   Observations), but content-suitability against the "caregiver/family moment" brief is a
   separate question and should not be silently accepted as done. This is flagged for the
   parallel Visual QA reviewer and for human/brand sign-off before RELEASE_GATE — the
   README already asks for that, which is the right call, but the story's acceptance
   criteria ("matches UI-SPEC.md AUTH-01 layout ... adults-only hero image") is only
   half-satisfied (adults-only: yes; caregiver/family framing: no). Recommend the
   orchestrator log this explicitly rather than let it pass as a done AC.

2. **Duplicate `<h1>` in the DOM at all viewport widths** (`app/page.tsx:49` and
   `app/page.tsx:56`). Both the mobile-overlay heading and the desktop-copy heading render
   as `<h1>` with identical text, gated only by Tailwind `lg:hidden` / `hidden lg:flex`
   classes — both elements exist in the DOM simultaneously; only CSS `display` toggles
   which one is visible per breakpoint. In a real browser this is generally fine for
   assistive tech (a `display:none` element is excluded from the accessibility tree), but
   it's worth a deliberate note/comment in the code (there isn't one) since "two h1s in
   one document" is a pattern that's easy to accidentally break later (e.g., a future
   editor changes one heading's text without the other, and now the page has inconsistent
   duplicate headings, or someone swaps `hidden` for `sr-only` and both become
   simultaneously visible to screen readers). Not blocking, but should be called out so
   it's an intentional, documented pattern rather than an oversight. Same duplication
   exists for `RoleSelectButtons` (`app/page.tsx:58` and `app/page.tsx:66`) — that one is
   correctly anticipated and tested (`tests/app/page.test.tsx:20-36` loops over
   `getAllByRole`), so only the heading duplication lacks the equivalent acknowledgment.

## Minor Issues

1. `app/legal/terminos/page.tsx:11` and `app/legal/privacidad/page.tsx:11` apply
   `font-semibold` on top of the `.text-h1` utility class, which already sets
   `font-weight: 600` (`app/globals.css:75`). Redundant but harmless.
2. `HERO_ALT` (`app/page.tsx:23-24`) is a reasonable, non-child alt text, but it doesn't
   describe the image as a "caregiver" moment either (understandably, since the photo
   itself isn't one) — once the hero photo is replaced pre-launch (per the README's own
   TODO), the alt text must be revisited together with it.
3. No `agent/qa/` or checklist artifact was found recording the human content-review
   checklist item the story's acceptance criteria explicitly calls for ("enforce via an
   explicit content-review checklist item, not technically enforceable in code"). The
   Developer did the equivalent manual review and documented reasoning in
   `public/images/README-auth-01-hero.md`, which is good-faith compliance in spirit, but
   it isn't the durable, orchestrator-visible checklist artifact the AC calls for. Suggest
   the orchestrator capture this as a formal decision/checklist entry (e.g. in
   `agent/DECISIONS.md` or `agent/qa/`) rather than leaving it only in a `public/images/`
   README.

## Security Observations

- **Independently viewed `public/images/auth-01-hero.jpg` in full.** Confirmed: exactly
  one adult woman, alone, in a kitchen: no child, no child-adjacent objects (no toys, high
  chair, small shoes, etc.), no implied child presence, no partial/out-of-focus/from-behind
  figure that could be a child. This satisfies UI-SYSTEM §0.10's hard no-child-imagery
  rule. No blocking finding here.
- CC BY 2.0 attribution requirement is satisfied: `public/images/README-auth-01-hero.md`
  documents source/author/license correctly, and the required credit line is actually
  rendered on the live page footer (`app/page.tsx:98-100`): "Foto de portada: Shixart1985
  vía Wikimedia Commons (CC BY 2.0) — imagen temporal." This is a real license-compliance
  requirement and it is correctly wired, not just documented.
- No secrets, no new attack surface — this story is a static marketing page with no data
  mutation, no new API/server action, no auth logic changes. `role-select-buttons.tsx` and
  `app/registro/page.tsx` only pass a client-controlled `role` query param, which
  `isSelfRegisterableRole` (`lib/auth/roles.ts:17-19`) already validates server-side
  against an allow-list (`"familia" | "ninera"`) before use — an attacker manipulating the
  URL can't inject an arbitrary role; a malformed value simply falls back to the plain
  role-selection screen (`app/registro/page.tsx:17-32`). No client-only enforcement risk.
- No PII logging introduced.

## Test Coverage Observations

- `tests/app/page.test.tsx` meaningfully covers: headline content, both role-CTA hrefs
  (across both rendered instances via `getAllByRole`, correctly anticipating the
  responsive duplication), trust-summary content (all three lines), footer legal-link
  hrefs, CC BY attribution text presence, and hero alt-text not referencing a child. This
  is solid coverage for a marketing page and directly exercises the story's key acceptance
  criterion (role pre-fill).
- `tests/setup.ts:11-13` adds a global `afterEach(cleanup)` for React Testing Library.
  Verified this is safe: ran the full suite (`npx vitest run`) — all 88 tests across 10
  files still pass, including `tests/lib/supabase/server.test.ts` which has its own
  cleanup/mock patterns. `cleanup()` only unmounts RTL-rendered trees; it does not
  interact with non-DOM test suites, so this is a safe, correctly-scoped shared
  test-infra change with justified rationale in the comment (first suite with >1 `render()`
  call per file).
- Independently reran `npx tsc --noEmit` (clean) and `npx eslint .` (clean) — matches the
  Developer's reported validation.
- No test covers the "does the hero photo actually match the caregiver/family brief"
  requirement, but this is inherently a Visual/content-review concern, not something a
  unit test could meaningfully assert — correctly left to Visual QA per the test file's
  own comment (`tests/app/page.test.tsx:6-10`).

## Acceptance Criteria Assessment

1. **Matches `UI-SPEC.md` AUTH-01 layout** — PASS. Full-bleed 4:5 mobile hero with bottom
   scrim, `display` (Fraunces) headline over the scrim, stacked role buttons below the
   fold, two-column desktop layout (copy ≤480px left, photo right with `radius-lg` on the
   image container only — `app/page.tsx:33` `lg:rounded-l-lg`), below-fold 3-line trust
   summary with outline icons (not badges), footer legal links. Verified all design
   tokens (`app/globals.css`) transcribed correctly against UI-SYSTEM §3.1/§3.2/§3.4 hex
   values, §0.6 radius scale, and §1 type scale (`display`, `h1`, `body`, `body-sm`,
   `button` — all sizes/line-heights/weights match exactly, both mobile and desktop
   breakpoints). Fraunces confirmed scoped to `.text-display` only (landing hero), not
   leaked elsewhere; Inter used as the base body font (`app/globals.css:52-54`).

2. **Adults-only hero image per UI-SYSTEM §0.10** — PASS on the hard safety rule
   (independently confirmed no child, no implied child in the image). **UNCERTAIN /
   PARTIAL** on the fuller "caregiver/family moment" framing — the image is a generic
   single-adult lifestyle photo, not a niñera/parent caregiving scene, a gap the
   Developer's own README already flags for human/brand review before RELEASE_GATE. Given
   the AC's own wording explicitly calls for a content-review checklist item rather than
   code enforcement, I'd mark this UNCERTAIN pending that human checklist step actually
   happening (not yet evidenced as a recorded decision) — the code side of this AC is
   done correctly (alt text, no-child confirmed, attribution wired).

3. **Role selection routes into AUTH-02 with the role pre-filled** — PASS. Verified
   end-to-end: `role-select-buttons.tsx:15,21` link to `/registro?role=familia` /
   `/registro?role=ninera` → `app/registro/page.tsx:15-17` reads and validates the param
   via `isSelfRegisterableRole` (`lib/auth/roles.ts:17-19`) → valid role renders
   `RegisterForm` with `role` passed as a prop → `components/auth/register-form.tsx`
   embeds it as a hidden form field consumed by `registerAction`. No changes were needed
   to E0-04 code (confirmed unmodified in the diff), and it correctly honors the query
   param exactly as the Developer claimed.

## Required Changes

None blocking. Recommended (non-blocking) follow-ups for the orchestrator to track before
RELEASE_GATE:

1. Record the AUTH-01 hero-image content-review outcome as an explicit, durable decision
   (e.g. `agent/DECISIONS.md` or `agent/qa/`) rather than leaving the reasoning only in
   `public/images/README-auth-01-hero.md` — the story's AC explicitly asked for a
   checklist item, and right now there's a good README note but no orchestrator-visible
   checklist record.
2. Track "replace placeholder hero photo with a real caregiver/family-moment photo before
   RELEASE_GATE" as a backlog item — both the image content and its alt text
   (`app/page.tsx:23-24`) will need to be revisited together.
3. Optional: add a short code comment near `app/page.tsx:33-59` explicitly noting the
   intentional duplicate-`<h1>`-gated-by-CSS-breakpoint pattern, so a future editor
   doesn't accidentally desync the two copies or convert `hidden` to `sr-only` and create
   a real duplicate-heading a11y issue.
