# Functional QA

## Verdict

PASS

Final independent Functional QA passes E6-01. Do not mark VERIFIED or merge from this report; workflow/status ownership remains with the orchestrator.

## Environment

- Repository: `projects/nanamex`
- Test date: 2026-09-04
- Platform: web-only Next.js 16.3.4, TypeScript, React 19, Vitest 4.1.11. Mobile QA is not applicable per `config/CONSTRAINTS.md`; web QA is agent-driven.
- Database: local Supabase/Postgres (Docker), reset by `npm run test:db`; migration `20260904000018_pipeline_state_transitions.sql` applied on top of `20260904000017_confirm_contact.sql` (E5-04).
- No production code modified by QA. Existing unrelated workspace changes (`lib/stripe/client.ts`, `package.json`, deleted `test-invoice-generator` scaffolding, other epics' new API/webhook files) were not assessed as part of this verdict.

## Test Cases

### TC-001 — `nueva -> contactada` is unreachable manually (re-derived independently)
- **Scenario:** Trace every layer that could produce a manual `nueva -> contactada` transition: the `advance_pipeline_state` RPC's target-state guard, the `advancePipelineStateAction` Zod schema's `TARGET_ESTADOS`, the RPC's grant/revoke, and `PipelineBoard`'s `ADVANCE_CONFIG` map (which UI states get a rendered advance button).
- **Expected:** No path — schema, RPC, or UI — can produce this transition; only E5-04's `confirm_contact` RPC may write it.
- **Actual:** Read `db/migrations/20260904000018_pipeline_state_transitions.sql` directly: the function's first statement is `if p_new_estado = 'contactada' or p_new_estado = 'nueva' then raise exception 'transition_not_allowed'; end if;`, executed before any row lookup, unconditional on current state. `revoke execute ... from public, anon, authenticated` / `grant ... to service_role` means the RPC cannot be invoked directly by client-side/authenticated Supabase calls at all — only server code using the service-role client can call it. `actions/pipeline.ts`'s `TARGET_ESTADOS = ["entrevista", "contratada", "descartada"]` structurally excludes `nueva`/`contactada` from the Zod input domain — an out-of-domain value fails `safeParse` before the RPC is ever called. `components/familia/pipeline-board.tsx`'s `ADVANCE_CONFIG` only has entries for `contactada` (→`entrevista`) and `entrevista` (→`contratada`) — no entry for `nueva`, so no manual advance button is ever rendered for a `nueva` row (only "Ver perfil" and "Descartar"). Live DB probe (`scripts/test-e6-01-pipeline.sql`, run via `npm run test:db`) confirms: calling `advance_pipeline_state(..., 'contactada')` on both a `nueva` row and an already-`contactada` row raises an exception and leaves `estado` unchanged; calling with target `'nueva'` also raises.
- **Result:** PASS

### TC-002 — Forward-only ordering, strict per UX-spec
- **Scenario:** Confirm `contactada -> entrevista -> contratada` succeeds in order; confirm skip-step (`contactada -> contratada` directly) and backward moves are rejected.
- **Expected:** Per `UX-spec.md` FAM-11 ("State transitions are forward-only in the happy path... 'Avanzar estado' controls apply from Contactada onward"), only the documented single-step forward path is allowed via manual advance.
- **Actual:** RPC logic: `entrevista` target requires `v_from_estado = 'contactada'`; `contratada` target requires `v_from_estado = 'entrevista'`; anything else raises `transition_not_allowed`. Live probe: `contactada -> entrevista` succeeds and persists with a `pipeline_state_advanced` analytics row (`from_estado=contactada`, `to_estado=entrevista`); `entrevista -> contratada` succeeds and persists; row reset to `contactada` then `contactada -> contratada` (skip-step) is rejected. No RPC path exists for backward moves (e.g. `entrevista -> contactada`) since the `else` branch (any target not `descartada`/`entrevista`/`contratada`) always raises. UI-side, `ADVANCE_CONFIG` only offers the single legitimate next-step button per state, so there is no way to even attempt a skip or backward move from the board.
- **Result:** PASS

### TC-003 — Descartar from every state, idempotent
- **Scenario:** Discard from `nueva`, `contactada`, `entrevista`, `contratada`, and repeat-discard an already-`descartada` row.
- **Expected:** Per UX-spec.md, "Descartar" is available from any state including Nueva; repeat calls are a safe no-op.
- **Actual:** RPC: the `descartada` branch has no `v_from_estado` precondition (unlike `entrevista`/`contratada`), and short-circuits with `return v_pipeline` (no update, no analytics insert) when already `descartada`. Live probe: `nueva -> descartada` succeeds; repeating `descartada -> descartada` on the same row leaves exactly one `pipeline_state_advanced` analytics row (no duplicate). UI: `PipelineActions` renders the "Descartar" button whenever `item.estado !== "descartada"`, i.e. from every non-terminal state including `nueva` (confirmed in `pipeline-board.test.tsx`'s Nueva-card assertion showing "Descartar" present alongside no advance button). Discard from `contactada`/`entrevista`/`contratada` is covered by the same unconditional branch — no separate code path exists that would exclude them.
- **Result:** PASS

### TC-004 — Ownership enforcement
- **Scenario:** Family B attempts to transition a pipeline row belonging to Family A's necesidad.
- **Expected:** Rejected server-side, regardless of client input.
- **Actual:** RPC's row lookup is `where pl.id = p_pipeline_id and n.familia_id = p_familia_id for update` — a wrong `p_familia_id` simply finds no row, raising `pipeline_not_found`. `p_familia_id` is always the server-derived `user.id` from `advancePipelineStateAction` (never client-supplied), so a compromised client cannot spoof it via the action. Live probe: Family B (`...722`) calling `advance_pipeline_state` on Family A's pipeline row raises an exception, row is unaffected. Page-level: `app/familia/necesidad/[id]/pipeline/page.tsx`'s necesidad read filters `.eq("familia_id", user.id)`, and the "not owned" page test confirms a redirect to `/familia/necesidad` when the row isn't found under that filter — a non-owning family can't even see another family's pipeline board to attempt a transition.
- **Result:** PASS

### TC-005 — Empty state
- **Scenario:** Necesidad has zero pipeline records.
- **Expected:** Empty-state template rendered, pointing back to FAM-04.
- **Actual:** `PipelinePage`'s `items.length === 0` branch renders `EmptyState`, which links `Ver candidatas` to `/familia/necesidad/${necesidadId}` (FAM-04's candidate listing for that necesidad). Confirmed via `tests/app/familia-pipeline.test.tsx`'s "renders the empty state pointing back to FAM-04" test, and independently by reading the component: heading "Aún no hay candidatas en tu pipeline" + explanatory copy + CTA link with the correct href, no `PipelineBoard` mounted.
- **Result:** PASS

### TC-006 — Success toast on manual advance
- **Scenario:** Advance `contactada -> entrevista` manually and observe the toast.
- **Expected:** Brief toast reading "Marcada como Entrevista" (per UI-SPEC.md FAM-11), consistent with the shared `Toast` component's established behavior (E4-04 precedent: bottom-anchored, single line, icon + message, auto-dismiss).
- **Actual:** `PipelineBoard.handleTransition` sets `toast = { message: \`Marcada como ${STATE_LABELS[result.estado]}\`, variant: "success" }` on `result.ok`, which for the `entrevista` target renders exactly "Marcada como Entrevista" — matching UI-SPEC's literal example copy. It renders via the shared `components/shared/toast.tsx` `Toast` component (the same component E4-04's `FavoriteToggle` uses per that file's own doc comment), inheriting its 4s auto-dismiss and single-toast-at-a-time behavior (a new `setToast` call replaces, doesn't stack, matching `UI-SYSTEM.md §5.6`). Confirmed in `pipeline-board.test.tsx`'s "shows the contactada onward advance control..." test, which asserts the exact toast text after a mocked successful action call.
- **Result:** PASS

### TC-007 — "Ver perfil" links to the correct FAM-06 route
- **Scenario:** Click "Ver perfil" on a pipeline card/row.
- **Expected:** Navigates to the FAM-06 candidate detail route for that necesidad/candidate pair.
- **Actual:** `PipelineActions` renders `<Link href={\`/familia/necesidad/${necesidadId}/candidatas/${item.nineraId}\`}>`. Confirmed this is FAM-06's actual route by listing the filesystem: `app/familia/necesidad/[id]/candidatas/[ninId]` exists as the candidate detail page directory (verified E4-03's earlier work), and the URL pattern matches exactly (necesidad id + niñera id segments in the same order/positions).
- **Result:** PASS

## Bugs

None found.

## Regression Results

- Full Vitest suite: **PASS — 60 files, 412 tests** (`npm test -- --run --no-file-parallelism`). Matches the code review's reported baseline.
- `npm run lint`: **PASS** — no output/errors.
- `npm run typecheck`: **PASS** — route types generated successfully, `tsc --noEmit` clean.
- `npm run check:secrets`: **PASS** — "no server-only secret exposed client-side."
- `npm run build`: **PASS** — production build compiled, `/familia/necesidad/[id]/pipeline` listed as a dynamic (`ƒ`) route as expected (session-dependent per-request read). Only pre-existing Node 20 Supabase deprecation warnings, unrelated to this story.
- `npm run test:db`: **PASS, exit 0** — fresh local Supabase reset plus all `test-e*` scripts including `test-e6-01-pipeline.mjs`. Live SQL output independently inspected: `nueva -> contactada` manual rejection (from both a `nueva` and a `contactada` row), rejection of `nueva` as a target, `contactada -> entrevista -> contratada` forward path with correct analytics rows, skip-step rejection, idempotent discard-from-nueva with no duplicate analytics event, and cross-family ownership rejection — all consistent with `scripts/test-e6-01-pipeline.sql`'s assertions and none raised an unexpected error.

## Recommendation

Accept E6-01 functional behavior as passing. The central security-critical guarantee (no manual `nueva -> contactada` path) was re-derived independently across all three layers (RPC guard + grant/revoke, action-layer Zod schema, and UI advance-button availability) rather than taken on the code review's word, and holds. Leave VERIFIED/merge decisions to the orchestrator.
