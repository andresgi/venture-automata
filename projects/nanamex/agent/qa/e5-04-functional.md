# Functional QA

## Verdict

PASS

The permanent-contact lifecycle behavior is functionally correct in the independent focused suites and live local Postgres probe. Do not mark the story VERIFIED or merge based on this report; workflow/status ownership remains with the orchestrator. Notification delivery is intentionally deferred because Epic 10 infrastructure is not present; this pass confirms the durable contact/event transaction does not attempt notification delivery or depend on it.

## Environment

- Repository: `projects/nanamex`
- Test date: 2026-09-04
- Platform: web-only Next.js 16.3.4, TypeScript, React 19, Vitest 4.1.11; mobile QA is not applicable per `config/CONSTRAINTS.md` and web QA is agent-driven.
- Database: local Supabase/Postgres; `npm run test:db` reset the database and applied migration `20260904000017_confirm_contact.sql`.
- Reviewed: E5-04 implementation plan, PRD/addendum, UX FAM-10/FAM-11 requirements, architecture/analytics/security, current action/route/RPC/UI, code review, and prior E5 QA findings.
- No production code was modified by QA. The working tree contains unrelated sibling-story/workspace changes noted by Code Review; this report assesses runtime behavior only.

## Test Cases

### TC-001 — Authenticated active familia, onboarding and verification gates
- **Scenario:** Exercise the action and FAM-10 route with no session, non-familia, incomplete onboarding, and missing email/phone verification.
- **Expected:** Reject/redirect before contact data reads or RPC execution.
- **Actual:** Focused route tests pass: redirects are `/login`, `/familia`, `/familia/perfil`, and `/verificar`, with no destination reads. Action test returns the session-expired error and does not call the RPC when unauthenticated. The RPC independently requires active familia plus both verification flags.
- **Result:** PASS

### TC-002 — Owned active necesidad and candidate authorization
- **Scenario:** Attempt contact for an unowned/non-active necesidad or invalid/ineligible candidate.
- **Expected:** No contact, pipeline transition, analytics event, or phone disclosure.
- **Actual:** RPC locks only an active necesidad owned by the supplied family and fails closed for missing/wrong-owner pairs. Its write-boundary eligibility checks require published/complete/active candidate, role, zone, modality, availability, salary, age, and experience. Route tests verify unavailable candidates redirect back and apply candidate filters.
- **Result:** PASS

### TC-003 — New-contact entitlement and pipeline eligibility
- **Scenario:** Eligible `nueva` pipeline with active entitlement; repeat with missing/expired entitlement and stale candidate eligibility.
- **Expected:** New contact succeeds only with an unexpired `contacto_30d` entitlement and current eligibility; stale/ineligible state cannot reveal phone.
- **Actual:** Live SQL probe passes success and failure assertions. The RPC checks durable contact first, then requires `estado = nueva`, current eligibility, and `expires_at > now()` before inserting. Route sends non-entitled new access through the FAM-08 marker and does not read entitlement for established contact access.
- **Result:** PASS

### TC-004 — Atomic contact, pipeline, and analytics event
- **Scenario:** Successful confirmation with optional message; invalid 1001-character message.
- **Expected:** One transaction creates `contacto`, advances `nueva` → `contactada`, and writes exactly one `candidate_contacted` event containing the entitlement ID; invalid input leaves all three unchanged.
- **Actual:** Live probe confirms one contact, `contactada`, preserved trimmed message, and one event. Rollback assertion confirms invalid message leaves pipeline `nueva`, zero contact rows, and zero event rows.
- **Result:** PASS

### TC-005 — Existing-contact lifecycle after expiry and state progression
- **Scenario:** Retry an established contact with expired/no entitlement while pipeline is `contactada`, `entrevista`, `contratada`, and `descartada`.
- **Expected:** Return `already_contacted` with phone, without entitlement or new-event requirements.
- **Actual:** Live SQL probe and route suite pass for every listed state. Route does not query entitlement once a durable `contacto` relation exists; RPC returns the durable contact before lifecycle and entitlement gates.
- **Result:** PASS

### TC-006 — Existing contact after candidate depublication/deactivation
- **Scenario:** After contact, set `perfil_ninera.publicado = false` and candidate `profiles.account_status = suspendida`, then retry.
- **Expected:** Existing contact remains accessible and phone remains available; new contact must not be allowed.
- **Actual:** Live probe passes both depublication and account-deactivation checks. Route/RPC use the established relation branch before discovery eligibility, returning the phone only for that owned durable contact.
- **Result:** PASS

### TC-007 — Phone disclosure boundary and action/RPC wiring
- **Scenario:** Render FAM-10 before contact, after established contact, and invoke the server action.
- **Expected:** Phone absent before a positive contact result; phone present only on `contacted`/`already_contacted`; family ID comes from session.
- **Actual:** Route tests pass: no phone is passed for a `contactada` pipeline without a contacto row, while object/array-shaped established relations receive phone. Action tests pass successful and idempotent responses and assert RPC receives session-derived `p_familia_id`.
- **Result:** PASS

### TC-008 — Duplicate and concurrent idempotency
- **Scenario:** Retry with a changed message and invoke two independent sessions concurrently for the same pair.
- **Expected:** One contact and one analytics event; later calls return `already_contacted`, with no duplicate transition/event.
- **Actual:** Sequential retry assertions and the live concurrent probe pass. The database row lock serializes the pair; the probe leaves one contact/event and accepts either concurrent message. Code Review notes the probe has no deterministic barrier/induced delay, so this is strong runtime evidence but not a deterministic contention proof.
- **Result:** PASS_WITH_MINOR_ISSUE

### TC-009 — Notification deferral
- **Scenario:** Inspect successful RPC transaction and E5-04 wiring for notification behavior.
- **Expected:** Durable contact success is not rolled back or failed because notification infrastructure is unavailable; Epic 10 owns delivery.
- **Actual:** Migration comment and action/RPC show no Resend/Twilio call or notification dependency. Live contact success completes without notification infrastructure. This matches the approved narrowed scope; the implementation plan’s original “notifies” wording is deferred to E10.
- **Result:** PASS (approved scope deferral)

## Bugs

None found in E5-04 runtime behavior.

### Non-blocking QA notes

- The concurrent probe launches sessions without a synchronization barrier, so exact lock contention is possible rather than guaranteed.
- Code Review identified that the working tree is not a strict E5-04 diff and includes unrelated sibling-story/workspace changes. This is a change-set hygiene/merge concern, not a functional failure found by this QA run.

## Regression Results

- Focused E5-04 suites (`actions/contact`, FAM-10 route, contact button): **PASS — 3 files, 18 tests**.
- Full Vitest suite: **PASS — 54 files, 371 tests**.
- `npm run lint`: **PASS**.
- `npm run typecheck`: **PASS**; route types generated successfully.
- `npm run check:secrets`: **PASS** — no server-only secret exposed client-side.
- `npm run build`: **PASS**; FAM-10 route is listed as dynamic. Existing Supabase Node 20 deprecation warnings only.
- `npm run test:db`: **PASS** — local reset, all prior probes, and E5-04 probe completed successfully. The payment-boundary duplicate-key error printed during its intentional concurrency assertion; command exited 0. E5-04 probe passed success, rollback, ownership, entitlement expiry, lifecycle states, depublication/deactivation, and concurrent idempotency checks.
- `git diff --check`: **PASS**.

## Recommendation

Recommend accepting E5-04 functional behavior as passing, while leaving VERIFIED/merge decisions to the orchestrator. Preserve the explicit Epic 10 notification handoff. Before merge, isolate the strict E5-04 change set from unrelated working-tree changes; a deterministic concurrency barrier and separate route tests for depublication versus account deactivation would improve evidence but are not functional blockers in this pass.
