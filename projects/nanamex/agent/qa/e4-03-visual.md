# Visual QA — E4-03 / FAM-06 candidate detail

## Final verdict

**REVISE**

## Scope and evidence

- Compared the current tree with `design/UX-spec.md` FAM-06, `design/UI-SPEC.md` FAM-06, and `design/UI-SYSTEM.md` §§2, 4.1–4.3.
- Checked responsive source classes for **375, 430, 768, and 1440px**.
- Browser screenshots and an authenticated seeded FAM-06 fixture were unavailable. The route cannot be screenshot-validated in this environment; unauthenticated access redirects to `/login`. Findings below are source-level and not screenshot-confirmed.
- Focused tests passed: **13/13**. `npm run lint` and `npm run typecheck` passed. No production code was modified.

## Passing checks

- Loaded mobile composition has the full-bleed 4:5 hero, bottom-only rounding, scrim identity overlay, and `pb-28` content reservation.
- Loaded desktop composition switches at `lg` to the 360px sticky identity column and detail column.
- Mobile and desktop action controls are 44px high; the mobile action bar is fixed and visually separated.
- Detail `TrustBadge` uses the documented 28px variant and preserves the three state label/icon/color semantics.
- `ReferenceList` includes the neutral heading icon, permanent unverified disclosure, neutral row styling, optional contact note, and divider treatment.
- Content order is Match Score → factual sections → description → references. Unavailable state has a clear return CTA.

## Findings

### E4-03-V01 — TrustBadge tooltip is clipped on non-desktop detail hero

- **Severity:** Minor
- **Viewport:** 375, 430, 768px
- **Screen:** FAM-06 candidate identity header
- **Expected:** Tapping/focusing the badge exposes the complete plain-language verification explanation.
- **Actual:** The badge is inside an `overflow-hidden` photo wrapper, while its tooltip is positioned at `top-full`; the tooltip is clipped below the hero and cannot be read.
- **Reproduction:** Authenticate, open a loaded FAM-06 profile, tap/focus the overlaid TrustBadge at one of these widths, and inspect below the badge.

### E4-03-V02 — Tablet hero loses the specified full-bleed mobile treatment

- **Severity:** Minor
- **Viewport:** 768px
- **Screen:** FAM-06 candidate detail hero
- **Expected:** Before the desktop `lg` layout, the mobile-first hero remains full-bleed with bottom-only rounding and overlaid identity.
- **Actual:** `sm:mx-0 sm:rounded-lg` makes the hero inset within page padding and rounds all corners from 640px upward, while the two-column desktop layout does not begin until 1024px.
- **Reproduction:** Open FAM-06 at 768px and compare the hero edge treatment with the FAM-06 mobile composition in `UI-SPEC.md`.

### E4-03-V03 — Loading state omits the sticky action-bar composition

- **Severity:** Minor
- **Viewport:** 375, 430, 768px
- **Screen:** FAM-06 loading state
- **Expected:** The loading composition should preserve the eventual detail shell, including the always-visible mobile action area.
- **Actual:** `loading.tsx` reserves `pb-28` but renders no fixed favorite/contact action bar; the bar appears only after resolution, causing a visible composition change at the bottom of the viewport.
- **Reproduction:** Throttle the candidate-detail request and compare the loading route segment with the resolved profile at a mobile/tablet width.

### E4-03-V04 — Data/query failures are presented as candidate unavailability

- **Severity:** Medium
- **Viewport:** 375, 430, 768, 1440px
- **Screen:** FAM-06 error state
- **Expected:** Recoverable loading/data failures show a distinct user-facing error with retry, while a removed candidate shows the unavailable message and return CTA.
- **Actual:** `candidateError` and the `record_candidate_profile_view` RPC error both return the unavailable view (“Esta candidata ya no está disponible”), with no retry path. This conflates an operational failure with a removed profile.
- **Reproduction:** Cause the candidate query or profile-view RPC to fail after authentication, then open FAM-06; observe the unavailable copy instead of an error/retry state.

### E4-03-V05 — Reference separation includes flex gap in addition to the required 40px spacing

- **Severity:** Minor
- **Viewport:** 375, 430, 768, 1440px
- **Screen:** FAM-06 detail sections / References
- **Expected:** References are separated from the preceding section by the specified `space-7` (40px) extra top spacing.
- **Actual:** The detail column has `gap-7` (28px) between every child and `ReferenceList` also has `mt-10` (40px), producing 68px of separation before references rather than the specified 40px extra spacing.
- **Reproduction:** Open a profile with a description or preceding detail section and measure the vertical gap before the References divider.

## Recommendation

Fix V01–V05, then repeat authenticated screenshot QA at 375, 430, 768, and 1440px. Do not mark E4-03 VERIFIED until the tooltip, tablet treatment, loading/action composition, distinct error state, and reference spacing are rechecked in a browser.

---

## Round 2 (re-check after Developer fixes)

### Final verdict

**PASS**

### Scope and evidence

- Re-read `app/familia/necesidad/[id]/candidatas/[ninId]/page.tsx`, `loading.tsx`,
  `components/shared/trust-badge.tsx`, `components/familia/reference-list.tsx`,
  `components/familia/candidate-detail-actions.tsx`, and `components/familia/retry-banner.tsx`
  against the five round-1 findings, `design/UX-spec.md` FAM-06, `design/UI-SPEC.md` FAM-06,
  and `design/UI-SYSTEM.md` §§2, 4.1–4.3.
- **Browser/screenshot capability is still unavailable in this environment** (no
  playwright/puppeteer/chromium binaries in `node_modules/.bin` or on `PATH`), same
  constraint as round 1. This round remains source-level, not screenshot-confirmed at
  375/430/768/1440px. This is an environment limitation, not something the Developer can
  fix from the app side — flagging per AGENTS.md so a human/CI-with-browser-tooling
  environment can do a final rendered confirmation before RELEASE_GATE, rather than silently
  treating source-level re-verification as equivalent to real rendered QA.
- Ran the relevant automated suite: `tests/app/familia-candidate-detail.test.tsx`,
  `tests/components/familia/candidate-detail-actions.test.tsx`,
  `tests/components/familia/reference-list.test.tsx`,
  `tests/components/shared/trust-badge.test.tsx` — **15/15 passed**.
- `npm run lint` and `npm run typecheck` (`next typegen && tsc --noEmit`) both passed clean.
- No production code was modified by this review.

### Findings re-check

- **E4-03-V01 (TrustBadge tooltip clipped) — RESOLVED.** The hero wrapper
  (`relative -mx-4 overflow-visible rounded-b-lg bg-border sm:-mx-6 lg:mx-0 lg:rounded-lg`)
  is now `overflow-visible`; only the inner photo-only div keeps `overflow-hidden` and no
  longer contains the badge/tooltip. The mobile identity overlay
  (`absolute inset-x-0 bottom-0 ... lg:hidden`) that hosts `TrustBadge` is a sibling of that
  clipped inner div, and no other ancestor between it and `<main>` sets `overflow-hidden`.
  The tooltip (`absolute left-0 top-full z-30 mt-2 w-56 ...`) has an unobstructed path to
  render below the badge. Source-level confirmed at 375/430/768px; recommend a rendered
  tap/focus check once browser tooling is available, since clipping bugs like this are the
  category most likely to hide a residual regression.

- **E4-03-V02 (768px hero loses full-bleed treatment) — RESOLVED.** Classes are now
  `-mx-4 sm:-mx-6 lg:mx-0 lg:rounded-lg` with `rounded-b-lg` as the base (unconditional)
  rounding — there is no `sm:rounded-lg` override anymore. At 768px (`sm` but not yet `lg`),
  the hero stays full-bleed (`-mx-6` cancels the `sm:px-6` page padding) with bottom-only
  rounding, consistent with the two-column desktop layout not starting until `lg` (1024px).
  Matches the FAM-06 mobile hero composition through the tablet breakpoint.

- **E4-03-V03 (loading state omits sticky action bar) — RESOLVED.** `loading.tsx` now
  imports and renders the same `<CandidateDetailActions />` component used by the resolved
  page, in the same position (end of `<aside>`). This means the fixed
  `data-testid="candidate-mobile-actions"` bar (`fixed inset-x-0 bottom-0 ... lg:hidden`) is
  present identically during loading and after resolution — no composition/layout shift at
  the bottom of the viewport across 375/430/768px. Desktop's `hidden lg:flex` inline action
  row is also present in both states.

- **E4-03-V04 (data/query failures shown as candidate-unavailable) — RESOLVED.** The
  `candidateError` branch (and the `record_candidate_profile_view` RPC error branch) now
  return a distinct `CandidateProfileError` component
  ("No se pudo cargar el perfil" + `RetryBanner`) instead of `Unavailable`
  ("Esta candidata ya no está disponible"). `RetryBanner` renders a `role="alert"` banner
  with a "Reintentar" button wired to `router.refresh()`, giving a genuine retry path.
  `Unavailable` (used only for the true not-found/removed-candidate case) is untouched and
  still shows the original copy + return-to-listing CTA. The two cases are now visually and
  semantically distinct at all four viewports (both are simple centered/stacked `<main>`
  layouts that reflow safely down to 375px).

- **E4-03-V05 (reference spacing 68px instead of 40px) — RESOLVED.** `ReferenceList`'s
  outer `<section>` now uses `mt-3` (12px) instead of `mt-10` (40px), with an inline comment
  explaining the intent: the detail column's `gap-7` (28px) + this `mt-3` (12px) = 40px
  total separation before the References divider, matching the specified `space-7` extra
  top spacing without double-counting. Confirmed by direct class inspection; the arithmetic
  holds under Tailwind's default spacing scale (`gap-7` = 1.75rem = 28px, `mt-3` = 0.75rem =
  12px).

### Recommendation

All five round-1 findings are resolved at the source level, tests/lint/typecheck are clean,
and no new issues were found in this pass. Recommend marking E4-03 **VERIFIED**, with one
caveat to log rather than block on: this round (like round 1) could not be confirmed with
actual rendered screenshots because no browser-automation tooling is available in this
environment. If/when browser tooling becomes available (or a human does a quick manual
pass), a rendered spot-check of V01 (tooltip tap/focus on a real mobile viewport) and V02
(768px hero edge) is the highest-value confirmation, since those two are the most
layout-timing/rendering-dependent of the five.
