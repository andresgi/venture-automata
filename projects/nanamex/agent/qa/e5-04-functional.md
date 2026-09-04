# Functional QA

## Verdict

PASS

Final independent Functional QA passes E5-04. Do not mark VERIFIED or merge from this report; workflow/status ownership remains with the orchestrator.

## Environment

- Repository: `projects/nanamex`
- Test date: 2026-09-04
- Platform: web-only Next.js 16.3.4, TypeScript, React 19, Vitest 4.1.11. Mobile QA is not applicable per `config/CONSTRAINTS.md`; web QA is agent-driven.
- Database: local Supabase/Postgres, reset by `npm run test:db`; migration `20260904000017_confirm_contact.sql` applied.
- No production code modified by QA. Existing unrelated workspace changes were not assessed as part of the functional verdict.

## Test Cases

### TC-001 — FAM-10 happy path and input validation
- **Scenario:** Submit an eligible new contact with an optional message; retry with an overlong message.
- **Expected:** One atomic contact succeeds, message is trimmed/persisted, invalid input fails without partial writes.
- **Actual:** Live SQL probe confirmed `contacted`, `contactada`, one `contacto`, trimmed message, and one event. A 1001-character message failed with pipeline still `nueva`, zero contact rows, and zero analytics rows. Focused component/action tests passed.
- **Result:** PASS

### TC-002 — Authentication, role, onboarding, and verification gates
- **Scenario:** Access/contact as unauthenticated, non-familia, incomplete-onboarding, or unverified user.
- **Expected:** Reject or redirect before protected destination reads or contact RPC execution.
- **Actual:** Route tests confirmed redirects to `/login`, `/familia`, `/familia/perfil`, and `/verificar`; action test returned the session-expired response and did not call the RPC. The RPC independently checks active familia plus email and phone verification.
- **Result:** PASS

### TC-003 — Ownership, active-necesidad, eligibility, and entitlement gates
- **Scenario:** Use wrong owner, invalid/ineligible/stale candidate, closed necesidad, missing/expired entitlement, and valid active entitlement.
- **Expected:** Only an owned active necesidad, currently eligible candidate, and unexpired account-wide `contacto_30d` entitlement can create a new contact; closed necesidades cannot create one.
- **Actual:** Route and action tests fail closed without phone disclosure. Live probe confirmed wrong owner, closed necesidad, expired/missing entitlement, and depublication/ineligibility rejection; valid entitlement succeeded. Server-derived session family ID is passed to the RPC.
- **Result:** PASS

### TC-004 — Established-contact access and closed-necesidad behavior
- **Scenario:** Retry an existing contact after entitlement expiry, pipeline progression (`entrevista`, `contratada`, `descartada`), candidate depublication/deactivation, and necesidad closure (`cerrada_contratada`, `cerrada_cancelada`).
- **Expected:** Durable established contact remains accessible and returns phone without entitlement/discoverability gates; no-contact closed necesidades remain blocked.
- **Actual:** Route tests and live probe confirmed `already_contacted` with phone in every listed established state and both closed necesidad states, without entitlement reads. New contacts on both closed states were rejected.
- **Result:** PASS

### TC-005 — Phone disclosure boundary
- **Scenario:** Render FAM-10 before a durable contact, after an established contact, and after successful confirmation.
- **Expected:** Candidate phone is absent until positive contact authorization; phone is returned only for `contacted`/`already_contacted`.
- **Actual:** Route tests confirmed no phone for a `contactada` pipeline lacking a `contacto` row, and phone only for object/array-shaped established relations. The form renders the phone only after a positive result or established-contact initialization.
- **Result:** PASS

### TC-006 — Atomicity, idempotency, duplicate submission, and concurrency
- **Scenario:** Retry with changed message and run two independent concurrent confirmations for the same pair.
- **Expected:** One contact row, one `nueva -> contactada` transition, one `candidate_contacted` event; retries return the existing contact and do not duplicate analytics.
- **Actual:** Live probe confirmed sequential idempotency and two concurrent calls resulted in one contact/event; either concurrent message was accepted. Row locking and the durable one-to-one contact relation enforce the boundary.
- **Result:** PASS

### TC-007 — Stale checkout-success return
- **Scenario:** Visit FAM-10 with `checkout=success` before webhook finalization, with a stale boundary, and with an active entitlement.
- **Expected:** Recent/unfinalized returns show a server-backed pending state; stale returns are reconciled and route to the new paywall path only when safe; query input never grants contact access.
- **Actual:** Route tests confirmed pending state while webhook is delayed and redirect to `?contactar=1` for stale state. Source/action tracing confirms Stripe/provider state is consulted for stale boundaries and only expired/never-created boundaries are cleared; no entitlement or phone is granted from the query parameter.
- **Result:** PASS

### TC-008 — Analytics and notification deferral
- **Scenario:** Complete a contact and inspect durable side effects and notification wiring.
- **Expected:** Exactly one `candidate_contacted` event includes necesidad, niñera, familia, and entitlement context; notification delivery must not be required for contact success because Epic 10 infrastructure is deferred.
- **Actual:** Live probe confirmed one event with the entitlement ID in metadata. `confirm_contact` and the action make no Resend/Twilio delivery call or delivery dependency; the durable transaction completes without notification infrastructure. This matches the approved E10 handoff.
- **Result:** PASS (approved scope deferral)

## Bugs

None found.

Non-blocking evidence notes: the concurrency probe uses two independent processes but does not insert an artificial lock barrier, so contention overlap is not deterministically forced on every run. There is also no single combined Stripe-return → webhook → FAM-10 end-to-end test; the seams are covered by route tests and live probes. Neither is a functional failure in this final pass.

## Regression Results

- Focused E5-04 suites: **PASS — 4 files, 26 tests**.
- Full Vitest suite: **PASS — 56 files, 388 tests**.
- `npm run lint`: **PASS**.
- `npm run typecheck`: **PASS**; route types generated successfully.
- `npm run check:secrets`: **PASS** — no server-only secret exposed client-side.
- `npm run build`: **PASS**; FAM-10 route listed as dynamic. Existing Supabase Node 20 deprecation warnings only.
- `npm run test:db`: **PASS** — database reset and all probes passed, including E5-04 authorization, rollback, closed-necesidad, lifecycle, depublication/deactivation, analytics, stale/ineligible, and concurrent-idempotency checks. The payment-boundary duplicate-key message was from its intentional concurrency assertion; command exited 0.
- `git diff --check`: **PASS**.

## Recommendation

Accept E5-04 functional behavior as passing. Preserve the explicit Epic 10 notification deferral and leave VERIFIED/merge decisions to the orchestrator. Keep unrelated workspace changes out of the E5-04 change set.
