# Code Review

## Verdict

PASS

E6-01's implementation satisfies the central, security-critical acceptance criterion — no
manual `nueva -> contactada` transition is reachable from this code, structurally, at every
layer (RPC, server action, UI) — plus the forward-only ordering, ownership scoping, and
Descartar-from-any-state rules. Automated validation passes in full.

## Critical Issues

None found.

## Important Issues

None found.

## Minor Issues

- `advance_pipeline_state`'s target-state guard (`p_new_estado = 'contactada' or
  p_new_estado = 'nueva'`) combined with the later `else raise exception
  'transition_not_allowed'` branch means any target outside
  `{descartada, entrevista, contratada}` (including future enum values) fails closed, which
  is correct, but there is no explicit test exercising an out-of-range/garbage enum value
  at the RPC layer (only `contactada`/`nueva` are probed). Low risk since Postgres enum
  typing already constrains the parameter domain.
- `PipelineActions`' `Descartar` button is hidden once `item.estado === "descartada"`, but
  there's no client-side disabled/confirmation state distinguishing an in-flight discard
  from a completed one beyond the shared `pending` spinner — acceptable for this scope,
  flagging only as a UX polish opportunity, not a defect.

## Security Observations

- **PASS (central criterion):** `nueva -> contactada` is rejected at three independent
  layers: the Zod schema in `actions/pipeline.ts` (`TARGET_ESTADOS` excludes both `nueva`
  and `contactada` from the input domain entirely — a structural exclusion, not a UI-only
  filter), the `advance_pipeline_state` RPC's explicit guard (checked before any row lookup,
  regardless of current state), and the RPC's `revoke ... from public, anon, authenticated` /
  `grant ... to service_role` — client code cannot call the RPC directly even if it bypassed
  the action. This is a strong, non-bypassable guarantee, not merely "the UI never calls it
  that way."
- **PASS:** Ownership is enforced server-side inside the RPC via
  `join public.necesidades n on n.id = pl.necesidad_id where pl.id = p_pipeline_id and
  n.familia_id = p_familia_id` under `for update`, using the session-derived `familia_id`
  passed from the server action (never client-supplied). The `test-e6-01-pipeline.sql`
  script verifies a second family cannot mutate the first family's pipeline row.
- **PASS:** Forward-only ordering is enforced in the RPC (`contactada -> entrevista`,
  `entrevista -> contratada` only; explicit rejection of skip-step `contactada ->
  contratada` is present both in code and exercised in the DB probe).
- **PASS:** `descartada` is reachable from any non-terminal state including `nueva`,
  matching UX-spec.md's explicit requirement, and is idempotent (repeat discard is a no-op,
  no duplicate analytics event) — verified in the DB probe.
- **PASS:** The server action re-checks session, role (`familia` only), and re-derives
  `p_familia_id` from the authenticated user, not from client input; RPC errors are mapped
  to a generic message without leaking internal error codes.
- **PASS:** No secrets, PII logging, or client-side-only enforcement observed in the diff.
- **PASS:** Notification-handoff narrowing is legitimate and documented consistently with
  E5-04's precedent (`agent/DECISIONS.md` "E5-04 notification handoff narrowed"): the
  migration and action both record the durable `pipeline_state_advanced` analytics event
  (matching `engineering/analytics.md`'s spec) without inventing delivery infrastructure or
  a fake notification queue for the still-absent Epic 10 system.

## Test Coverage Observations

- `tests/db/pipeline-transitions-migration.test.ts`: structural assertions on the migration
  SQL (guard ordering, ownership join, forward-path checks, idempotent discard, analytics
  event, revoke/grant).
- `scripts/test-e6-01-pipeline.sql` (run via `test-e6-01-pipeline.mjs` as part of `npm run
  test:db`): a real, live-database probe — the most important test in this story — proving
  `contactada` is rejected as a manual target from both a `nueva` row and an already-
  `contactada` row, `nueva` itself is rejected as a target, forward-only ordering (no
  skipping `contactada -> contratada`), idempotent discard, and cross-family ownership
  rejection. This is exactly the kind of DB-level guarantee the story's validation
  criterion calls for, not just a mocked unit test.
- `tests/actions/pipeline.test.ts`: schema-layer rejection of `contactada`/`nueva` inputs
  (asserting the RPC is never even called), auth/role fail-closed paths, error-message
  genericization, and the happy path forwarding session-derived `familia_id`.
- `tests/components/familia/pipeline-board.test.tsx` and `tests/app/familia-pipeline.test.tsx`:
  cover the five-column kanban with no advance control rendered for `nueva`, the
  contactada-onward advance control, discard-from-any-state with error-toast handling, the
  mobile segmented control, and page-level auth/role/onboarding redirects, ownership-scoped
  reads, and empty/error states.
- E6-02 (NIN-09 read-only mirror) is correctly out of scope for this diff — no niñera-side
  pipeline route or component is touched, consistent with it being a separate, dependent
  story.
- Full validation suite re-run independently by this review, all passing: `npm run lint`,
  `npm run typecheck`, `npm test -- --run --no-file-parallelism` (412 tests, 60 files),
  `npm run check:secrets`, `npm run build`, and `npm run test:db` (fresh local Supabase
  reset plus all `test-e*` scripts including `test-e6-01-pipeline.mjs`, exit 0).

## Acceptance Criteria Assessment

| Criterion | Verdict |
|---|---|
| No manual `nueva -> contactada` transition exists/succeeds via any server action or RPC | PASS |
| `Avanzar estado` available from `contactada` onward only (never manually from `nueva`) | PASS |
| `Descartar` available from any state, including `nueva`, and is idempotent | PASS |
| Forward-only ordering: `contactada -> entrevista -> contratada`, no skipping | PASS |
| Ownership: only the owning familia can transition their own necesidad's pipeline rows | PASS |
| Pipeline record auto-creation on favorite/profile-view (pre-existing from E4-03/E4-04, consumed correctly here) | PASS |
| Analytics event `pipeline_state_advanced` recorded per `engineering/analytics.md` | PASS |
| Notification-handoff narrowing documented consistent with E5-04 precedent | PASS |
| Desktop kanban (5 columns, no color-coding) / mobile segmented control per UI-SPEC | PASS |
| Automated validation (lint, typecheck, tests, secrets, build, test:db) | PASS |

## Required Changes

None required before proceeding to Functional QA / Visual QA. Optional follow-up
(non-blocking): add an RPC-level test for an arbitrary out-of-domain target enum value,
purely for defense-in-depth documentation — current enum typing already makes this
practically unreachable.
