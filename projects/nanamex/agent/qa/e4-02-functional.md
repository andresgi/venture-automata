# Functional QA

## Verdict

**FAIL**

The implemented FAM-05 happy paths are present and the automated suite/build pass, but invalid URL filter values are not validated or normalized. A malformed payment value can silently show all candidates, and an unknown modality creates an `undefined` active tag. This fails the requested invalid-value validation bar. Browser viewport interaction was not run; mobile/desktop layout behavior was verified from rendered DOM/classes and component tests.

## Environment

- Nanamex Next.js 16.3.4, React 19.2.8, Vitest 4.1.11; web-only QA per `config/CONSTRAINTS.md:31-35`.
- No production code modified.
- Focused FAM-05: `npm test -- --run tests/components/familia/candidate-filters.test.tsx`: **2/2 passed**.
- Full suite: **32 files, 227 tests passed**.
- `npm run lint`: **PASS**.
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS**; existing Supabase Node 20 deprecation warning only.
- E4-02-specific code review artifact was not present in `agent/reviews/`; QA used the implementation plan and existing E4-01 QA/review findings.

## Test Cases

### TC-01 — Mobile filter bottom sheet and draft/apply behavior
- **Scenario:** Open `Filtrar`, inspect dialog, change a draft value, clear or close it without applying, then apply.
- **Expected:** FAM-05 mobile bottom sheet with handle, stacked controls, sticky `Limpiar`/`Aplicar filtros`; draft changes do not affect results until apply.
- **Actual:** PASS by source/component verification. `components/familia/candidate-filters.tsx:128,133` renders the mobile-only dialog (`lg:hidden`), bottom sheet (`absolute ... bottom-0`, rounded top), handle, stacked fields, sticky footer, and separates `draft` from `applied`. Focused tests confirm open, clear draft, close, and apply behavior.
- **Result:** PASS.

### TC-02 — Desktop persistent sidebar/live filtering
- **Scenario:** Inspect the desktop render and update each sidebar control.
- **Expected:** Persistent left filter panel; changes apply live without a separate apply action or navigation.
- **Actual:** PASS by source verification. `components/familia/candidate-filters.tsx:131` renders `aside` with `hidden ... lg:block`; its field setter updates `applied` and calls `writeFilters` immediately. The list is derived locally at `:120`.
- **Result:** PASS (runtime desktop viewport not available).

### TC-03 — Zona filtering
- **Scenario:** Select a zone from the filter and apply/live-update.
- **Expected:** Only candidates whose work zone matches remain.
- **Actual:** PASS by implementation. `:35-37` requires `candidate.zonas.includes(filters.zona)`; options are derived from candidate zones at `:114-115`. Zone values are populated from live `zonas.alcaldia_municipio` in `app/familia/necesidad/[id]/page.tsx:170-173`.
- **Result:** PASS.

### TC-04 — Modalidad filtering
- **Scenario:** Select Planta, Entrada por salida, or Ocasional.
- **Expected:** Only candidates accepting that modality remain.
- **Actual:** PASS by implementation. `:37` checks membership in `candidate.modalidades`; all three specified options/labels are rendered at `:24-29,82-86`.
- **Result:** PASS.

### TC-05 — Payment-range overlap filtering
- **Scenario:** Apply minimum and/or maximum payment values, including candidate ranges that overlap boundaries.
- **Expected:** Candidate remains when ranges overlap; candidates entirely below/above are removed.
- **Actual:** PASS for numeric values. `:38-41` implements candidate `salarioMax >= filter min` and `salarioMin <= filter max`, with null salary rejected when a corresponding bound is requested.
- **Result:** PASS for valid numeric input.

### TC-06 — Availability filtering
- **Scenario:** Select one or multiple availability days.
- **Expected:** Candidate remains only if available on every selected day.
- **Actual:** PASS by implementation. `:42` requires every selected day to occur in the candidate availability array. The UI exposes all seven days at `:30-33,100-103`. This is day-level filtering, consistent with the FAM-05 availability chip-group spec; no time-of-day filter is exposed.
- **Result:** PASS.

### TC-07 — URL persistence, removable tags, and no full page reload
- **Scenario:** Apply filters, inspect URL/tags, remove individual tags, and observe list update.
- **Expected:** Active filters persist in query state, appear as removable tags, and update in place without a full reload.
- **Actual:** PASS for the implemented flow. `:57-66` uses `history.replaceState`, not navigation/reload; `:122-123` applies/clears locally; `:129` renders removable tags for zone, modality, payment range, and days. Initial URL state is read at `:46-54` and hydrated at `:116-119`.
- **Result:** PASS.

### TC-08 — Missing/invalid values
- **Scenario:** Open a URL with `?pagoMin=abc`, `?modalidad=bogus`, negative payment, or min greater than max.
- **Expected:** Invalid values are rejected, ignored, or surfaced with clear validation; no misleading result/tag state.
- **Actual:** FAIL. `:38-41` converts arbitrary payment strings with `Number()` but does not reject `NaN`; `pagoMin=abc` therefore makes both comparisons false and leaves all candidates visible. `readFilters()` at `:46-54` accepts arbitrary modality/day values; an unknown modality is counted active and `:129` indexes `MODALITY_LABELS` to `undefined`, producing a malformed active tag. Negative and min>max values have no validation path.
- **Result:** FAIL. See BUG-001.

### TC-09 — Preserved base loading/error/empty states
- **Scenario:** Inspect FAM-04 route around filter rendering and filter result zero state.
- **Expected:** Existing loading skeleton, server/API error retry, and base no-match empty state remain distinct; filtering must not replace server failure with a blank page.
- **Actual:** PASS by route/source verification. `app/familia/necesidad/[id]/page.tsx:208-217` preserves necesidad error retry; `:241-258` preserves live-data retry and the base empty state before mounting filters. Filtered zero results render an acknowledged message at `components/familia/candidate-filters.tsx:132`, not a blank grid. Loading boundary remains `app/familia/necesidad/[id]/loading.tsx` and existing E4-01 tests passed.
- **Result:** PASS by implementation/regression checks; no live API failure injection was run.

## Bugs

### BUG-001

- **Severity:** Medium
- **Reproduction:**
  1. Open FAM-04 with candidates.
  2. Set URL to `/familia/necesidad/<id>?pagoMin=abc` and reload, or use an unknown `modalidad` query value.
  3. Observe the candidate list and active tags.
- **Expected:** Invalid filter values are rejected/ignored or produce clear inline validation; URL and displayed state remain valid.
- **Actual:** `Number("abc")` becomes `NaN` and the comparisons at `components/familia/candidate-filters.tsx:38-41` do not exclude candidates, so all candidates remain visible. Unknown modality is accepted by `readFilters` (`:46-54`) and displayed through an undefined label at `:129`. Negative and reversed ranges are not rejected.
- **Affected requirement:** Requested E4-02 validation of missing/invalid values; FAM-05 controls specified in `design/UI-SPEC.md:172-180` and implementation-plan acceptance criteria `engineering/implementation-plan.md:208-211`.

## Regression Results

- Focused FAM-05 tests: **PASS — 2/2**.
- Full suite: **PASS — 227/227**.
- Lint: **PASS**.
- Typecheck: **PASS**.
- Production build: **PASS** with existing Supabase warning only.
- Existing E4-01 regression behavior remains covered; no new regression observed.

## Recommendation

**Do not mark E4-02 VERIFIED.** Add strict parsing/normalization for URL and form values (allow only known zones/modalities/days; finite non-negative payments; define handling for min > max), add tests for malformed query state and all filter dimensions, then rerun QA. The valid filtering, responsive DOM structure, URL replacement, removable tags, and preserved base states are otherwise ready based on source and automated evidence.
