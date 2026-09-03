# Code Review

Story: E2-03 — FAM-02 dashboard (Mis necesidades)
Branch: `nanamex/e2-03-fam02-dashboard` vs `main`
Files reviewed: `app/familia/page.tsx`, `app/familia/loading.tsx`, `app/globals.css`,
`tests/app/familia.test.tsx`, `tests/app/familia-loading.test.tsx`

## Verdict

PASS_WITH_MINOR_ISSUES

## Critical Issues

None found.

## Important Issues

1. **`app/familia/loading.tsx` scope bleeds into sibling routes it wasn't scoped for.**
   Next.js's `loading.tsx` route-segment convention wraps `page.tsx` *and every nested
   segment below it* in the same `<Suspense>` boundary unless a nested segment supplies its
   own `loading.tsx` to override it. Placed at `app/familia/loading.tsx` with no overrides
   present at `app/familia/perfil/`, `app/familia/necesidad/`, or
   `app/familia/necesidad/[id]/` (confirmed via directory listing — none of those exist),
   this FAM-02-shaped necesidad-card skeleton will also transiently render for navigations
   into `/familia/perfil` (FAM-01 onboarding form) and `/familia/necesidad` (the wizard) —
   screens with completely different layouts. This is a real, if brief, visual mismatch the
   header comment (`app/familia/loading.tsx:1-9`) doesn't acknowledge; it frames the file as
   scoped to "this page" only. Not blocking (the flash is short and all these routes sit
   behind the same auth/redirect gate), but worth either scoping it more precisely (e.g. a
   route group) or explicitly documenting/accepting the tradeoff, and flagging to Visual QA
   since it won't show up from a cold load of `/familia` alone.

2. **Mobile "Crear necesidad" placement comment mischaracterizes the spec it cites.**
   `app/familia/page.tsx:135-143`'s comment states the spec offers "either a full-width
   sticky-bottom button on mobile (only 'if the list is short') or an inline top button on
   mobile in all cases," and that "the spec itself calls the always-inline option out as an
   acceptable simplification." Re-reading `design/UI-SPEC.md:88-91` literally: "full-width
   sticky-bottom on mobile **if the list is short**, **otherwise** inline top button on
   mobile too" — this is an if/otherwise pair, not an either/or choice available in all
   cases. The spec's intended default state (most families will have a short list —
   arguably the common case for an MVP dashboard) is **sticky-bottom**, not inline-top. The
   FAB-avoidance justification quoted in the comment applies to the "list is not short"
   branch, not to skipping the length-based condition altogether. The engineering choice to
   always use inline-top for MVP simplicity (avoiding a length-threshold heuristic) is a
   defensible simplification on its own merits, but the code comment's claim that "the spec
   itself... calls [this] out as an acceptable simplification" is not accurate and should be
   corrected to state this as a deliberate deviation, not a spec-sanctioned option. Low
   product impact (placement-only, will be caught by Visual QA either way), but the
   documentation misstates what was actually decided and why, which matters given this is
   exactly the kind of judgment call this review was asked to sanity-check.

## Minor Issues

1. `app/familia/page.tsx:92` (`NecesidadCard`'s `<article>`) omits the `elevation-1` /
   `border-strong` hover treatment that UI-SYSTEM §5.3 assigns to "interactive cards"
   (candidate/vacante/opportunity cards). FAM-02's own necesidad cards are also described in
   UI-SPEC as "genuinely discrete, tappable" — arguably in scope for that treatment — but
   §5.3's explicit list doesn't name necesidad cards, so this is ambiguous rather than a
   clear miss. Flag for Visual QA rather than requiring a revision here.
2. `tests/app/familia-loading.test.tsx` is a single, fairly shallow smoke test (aria-label +
   skeleton count). Adequate given the component is pure presentation with no branching
   logic, but it's the thinnest test in the diff.
3. No test exercises an invariant-grammar count >1 for "en entrevista" (e.g. 2 pipeline rows
   both `entrevista`) to prove the code doesn't accidentally pluralize it — low risk since
   `PIPELINE_LABELS.entrevista.singular === .plural` in source, so no branch could regress
   this silently, but worth a one-line addition for completeness.

## Security Observations

- `app/familia/page.tsx:186-191` uses `createServiceRoleClient()` (bypasses RLS) and
  authorizes the query purely via `.eq("familia_id", user.id)`. This is consistent with the
  established pattern already in `actions/necesidad.ts` and
  `app/familia/necesidad/[id]/page.tsx` (both filter the same way with the same client), so
  it is not a new authorization gap introduced by this story — but it's worth reiterating
  for the record that every one of these server-rendered pages depends on this manual filter
  being present and correct, since RLS is bypassed entirely at this client. No omission
  found in this diff.
- The FAM-01 gate (`app/familia/page.tsx:176-184`) is preserved with identical semantics to
  the pre-existing implementation (`git show main:.../page.tsx`): check session → query
  `perfil_familiar` by `profile_id = user.id` → `redirect("/familia/perfil")` if absent. No
  regression found — this was the primary risk called out for this rewrite and it survived
  intact.
- No PII is logged; no secrets touched in this diff.

## Test Coverage Observations

`tests/app/familia.test.tsx` (7 tests total across both files) meaningfully covers:
- FAM-01 gate redirect (regression-critical) — `familia.test.tsx:82-86`.
- Empty state rendering, including the "two separate Crear necesidad links" distinction
  (header + empty-state CTA) — `:88-102`.
- Single draft card rendering (chip, zona/modalidad labels, resume link, no pipeline
  summary for drafts) — `:104-128`.
- Mixed draft + active rendering, pipeline summary ordering/grammar for a non-trivial
  multi-state count (`2 nuevas · 1 en entrevista · 1 descartada`), and `zonas: null`
  fallback ("Zona sin especificar") — `:130-169`.
- Zero-pipeline-rows fallback text for an active necesidad — `:171-186`.
- No-session branch (no redirect attempted, banner + header render) — `:188-196`.

This is solid, non-superficial coverage of every dimension called out in the assignment.
The only gaps are the minor ones noted above (loading-state test shallowness, no explicit
plural-invariant-at-count>1 case) — neither rises above "minor."

Confirmed independently: `npx tsc --noEmit` clean, `npm run lint` clean, and
`npx vitest run tests/app/familia.test.tsx tests/app/familia-loading.test.tsx` → 7/7 passing.

## Acceptance Criteria Assessment

| # | Criterion | Verdict |
|---|---|---|
| 1 | Card grid matches UI-SPEC FAM-02 (single column mobile, 2-column ≥768px) | PASS |
| 2 | Pipeline summary: per-state counts, plain text (not badges), correct lifecycle order (`nueva→contactada→entrevista→contratada→descartada`, matches `database.md`'s enum), correct singular/plural incl. invariant "en entrevista" | PASS |
| 3 | Pipeline summary renders only for `activa` necesidades, never `borrador` | PASS |
| 4 | Empty state matches §5.8 template (icon in `primary-50` circle, Fraunces headline, one guidance line, one primary action; genuine Phosphor icon) | PASS |
| 5 | Loading state is a real Next.js `loading.tsx` route-segment file, correctly placed and exported | PASS (with the segment-scope caveat above — functions correctly, but its blast radius is wider than the header comment implies) |
| 6 | Dashboard fetches all non-terminal necesidades (`borrador`+`activa`), not just drafts, with embedded `zonas`/`pipeline`, correctly authorized to the caller's own `familia_id` | PASS |
| 7 | FAM-01 gate (redirect to `/familia/perfil` when no `perfil_familiar` row) survives the rewrite unchanged | PASS |
| 8 | New design tokens (`text-h2`, `text-headline`, `text-caption`) match UI-SYSTEM §1's Type Scale exactly (font, mobile/desktop size+line-height, weight) | PASS — verified line-by-line against `design/UI-SYSTEM.md:182-191` |
| 9 | Judgment call: mobile CTA placement (always inline-top) reasonable per spec | UNCERTAIN — the underlying engineering choice is a reasonable MVP simplification, but the code comment's characterization of what the spec "permits" is inaccurate (see Important Issue #2) |
| 10 | Judgment call: 2-column grid capped at `md:`, not extended to 3-column | PASS — confirmed against `design/UI-SPEC.md`: FAM-02's own spec text only calls for "single column mobile; 2-column card grid ≥768px," and the 3-column rule is explicitly scoped to FAM-04 (`design/UI-SPEC.md:152`), not FAM-02. Developer's reading is correct. |

## Required Changes

None blocking. Recommended (non-blocking) before this story is marked VERIFIED:

1. Correct the code comment at `app/familia/page.tsx:135-143` to accurately describe the
   mobile CTA decision as a deliberate simplification/deviation from the spec's
   short-list-gets-sticky-bottom branch, rather than claiming the spec itself sanctions an
   always-inline option. (Comment-only fix; no behavior change required unless product
   wants the sticky-bottom variant for the common short-list case — that's a product call,
   not a code defect.)
2. Add a one-line acknowledgment (comment or follow-up backlog note) that
   `app/familia/loading.tsx` will also surface for `/familia/perfil` and
   `/familia/necesidad*` navigations, and flag it to Visual QA so it isn't mistaken for a
   bug when observed on those screens.
