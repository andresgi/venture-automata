# Code Review

## Verdict

REVISE

## Critical Issues

None.

## Important Issues

- Mobile dialog focus is not restored on every dismissal path. The close button and Escape explicitly focus the trigger, but backdrop dismissal and successful `Aplicar filtros` only set `open` to false. Focus can consequently land on a removed dialog control or the document body. Restore focus through one shared close handler (or a dialog primitive) for backdrop, Escape, close, and apply.
- The review-required regression coverage is still absent. The focused suite remains only two tests and does not cover malformed URL hydration, reversed/negative/non-finite form values, `popstate`, desktop live updates, or all filter dimensions/boundaries. The implementation currently normalizes both URL hydration and form field updates, but these paths are not protected.
- Invalid URL values are ignored in React state but are not canonicalized in the address bar. For example, a reversed range or unknown modality remains in `location.search` after hydration/popstate. If the requirement is that URL state itself be normalized (rather than merely ignored for filtering), `readFilters` should rewrite/remove invalid parameters without navigation.

## Minor Issues

- `candidateMatchesFilters` is exported and still treats an arbitrary nonnumeric payment string as `NaN`; its comparisons then allow every candidate. All current component state paths normalize first, so this is not reachable through the UI, but the predicate is not defensive at its public API boundary.
- The current worktree also contains unrelated deletions under `projects/test-invoice-generator/` and an untracked root `.claude/settings.json` (outside E4-02). They must not be included in this story's change set; restore/exclude them before merge.

## Security Observations

- No authorization regression found. Filtering remains client-side over the already server-authorized candidate set and does not grant access to additional candidates or PII.
- No new secret exposure or sensitive logging was introduced by E4-02.

## Test Coverage Observations

- Focused E4-02 tests: 2 passed, but they cover only mobile pay filtering and draft clearing/close.
- Full suite: 32 files, 227 tests passed.
- `npm run lint`, `npm run typecheck`, and `npm run check:secrets` passed. No production build was rerun during this final review (the story validation records a prior passing build).
- Add focused tests for URL normalization, form normalization, initial hydration, `popstate`, desktop live updates, all filter dimensions, boundary overlap, and modal focus/close behavior.

## Acceptance Criteria Assessment

### Bottom sheet on mobile / sidebar on desktop

PASS — responsive bottom-sheet and persistent sidebar structures are present.

### Filters apply without a full page reload

PASS — filtering is local state and URL persistence uses `history.replaceState`.

### URL hydration and back/forward synchronization

PASS — hydration reads normalized values and a `popstate` listener updates both applied and draft state. URL canonicalization itself remains UNCERTAIN as noted above.

### URL/form values are normalized/validated and do not produce misleading state

PASS — known zones/modalities/days, finite nonnegative payment values, and reversed ranges are normalized before state/filter application. UNCERTAIN for whether malformed query text must also be removed from the URL itself; it currently remains in the address bar.

### Zona, modalidad, pay-overlap, and availability-day filtering

PASS for valid normalized values — each requested dimension is implemented, including overlap comparisons and all-selected-days matching.

### Existing FAM-04 authorization/error/empty behavior remains intact

PASS — server-side ownership and base error/empty branches remain in place; filtered zero results have a separate message.

### Accessible responsive interaction

FAIL — focus entry, trapping, Escape dismissal, and body scroll locking are now implemented, but focus restoration is missing for backdrop dismissal and Apply. Therefore the modal lifecycle is not fully keyboard accessible.

## Required Changes

1. Restore focus to the filter trigger through a shared close path for backdrop dismissal and Apply, in addition to existing close-button/Escape paths.
2. Add regression tests for malformed/invalid URL and form values, reversed ranges, initial hydration, `popstate`, desktop live filtering, filter dimensions/boundaries, and modal focus/keyboard/scroll lifecycle.
3. Decide and implement URL canonicalization if the acceptance criterion requires the URL query itself—not only React state—to contain normalized values.
4. Ensure unrelated `projects/test-invoice-generator` deletions and root `.claude/settings.json` are excluded/restored before merging this story.
