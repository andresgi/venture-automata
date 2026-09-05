# Functional QA

## Verdict

PASS — final independent functional QA for E7-03/NIN-08. No functional bugs found. Do not mark VERIFIED or merge from this report.

## Environment

- Repository: `projects/nanamex`; branch `nanamex/e7-03-nin08-identity-upload`; test date: 2026-09-04.
- Next.js 16.3.4, TypeScript, React 19, Vitest 4.1.11, local Supabase/Postgres.
- Web-only V1; mobile QA is not applicable per `config/CONSTRAINTS.md`; web QA is agent-driven.
- No production code was modified. Existing story changes and unrelated workspace changes were left untouched.
- Evidence: independent source inspection, full automated suite, and clean live local database reset/probes. No production data or real identity documents were used.

## Test Cases

### TC-001 — Authenticated active niñera and E7-01 wiring
- **Scenario:** Trace E7-01 onboarding's identity CTA and the server submission action's authentication, role, and account checks.
- **Expected:** `Subir ahora` links to NIN-08; only the authenticated active `ninera` account with a profile can submit.
- **Actual:** E7-01 links to `/ninera/perfil/identificacion`. The action derives the user from `auth.getUser()`, checks `profiles.role = ninera` and `account_status = activa`; the RPC additionally requires a `perfil_ninera` row. Inactive-account and auth/role failures are covered by tests/live SQL.
- **Result:** PASS

### TC-002 — No verificada, pending, rejected/resubmit, and verified behavior
- **Scenario:** Inspect/render all status branches and exercise pending, rejection, and verified replacement transitions.
- **Expected:** Honest status labels; pending and verified are read-only as appropriate; rejection reason is shown with resubmit; profile remains published/visible/matchable.
- **Actual:** `TrustBadge` and NIN-08 represent `no_verificada`, `en_proceso`, and `verificada`; rejected status uses the latest rejection reason and reopens upload; pending removes upload controls and displays 24–48h expectation; verified is read-only except replacement. Live SQL confirmed pending changes `verification_status` without changing `publicado`.
- **Result:** PASS

### TC-003 — Valid upload and atomic pending transition
- **Scenario:** Submit valid JPEG/JPG, PNG, and WEBP payloads through the server action/RPC boundary.
- **Expected:** Supported payload is accepted, stored under a unique authenticated-owner path in private Storage, and atomically creates a pending verification, status transition, and analytics event.
- **Actual:** Unit coverage accepts valid signatures/types/extensions. The action generates `${user.id}/${randomUUID()}.ext`, uses `upsert: false`, then calls the service-role-only RPC. Live probe confirmed `identity_verifications.status = pendiente`, profile `verification_status = en_proceso`, one `identity_verification_submitted` event, correct `ninera_id`, and preserved `publicado`.
- **Result:** PASS

### TC-004 — Rejection reason and resubmission motivo
- **Scenario:** Resubmit after a rejected submission, then replace after a verified submission.
- **Expected:** Rejected resubmission records `primera_vez`; verified replacement records `re-revision_por_edicion_de_perfil`; rejection reason is surfaced in plain language.
- **Actual:** Live database probe confirmed both motivo values and latest rejection reason mapping; rejected state retains upload/resubmit path.
- **Result:** PASS

### TC-005 — Server byte/type/extension/size rejection
- **Scenario:** Bypass client controls with PDF, MIME/extension mismatch, invalid image bytes, and >10 MB payloads.
- **Expected:** Server rejects before Storage write; oversized input is rejected before reading bytes.
- **Actual:** Unit tests cover all invalid cases; action validates size, MIME, extension, then magic bytes, and does not call Storage on rejection. JPEG `.jpeg` is canonicalized to `.jpg`.
- **Result:** PASS

### TC-006 — Storage direct insert/update denial and private/admin-read boundary
- **Scenario:** Inspect policies/migration and issue authenticated direct Storage insert/update attempts.
- **Expected:** Bucket is private; browser-authenticated users cannot insert, update, or replace documents; admin-only read boundary remains intact.
- **Actual:** `identity-documents` is private. Hardening migration removes owner insert/update policies; live SQL direct insert/update attempts were denied. No public read or signed-URL/admin review path was added in E7-03; raw reads remain reserved for the future admin boundary.
- **Result:** PASS

### TC-007 — Duplicate and concurrent submissions
- **Scenario:** Submit while an active review exists and issue two concurrent service-side submissions.
- **Expected:** Duplicate is rejected safely; exactly one active pending row and one analytics/status transition remain.
- **Actual:** Live probe returned `identity_verification_already_in_process` for duplicates. Concurrent probe passed with exactly one successful call and one pending row; row lock plus partial unique index provide defense in depth.
- **Result:** PASS

### TC-008 — Cleanup queue
- **Scenario:** Force RPC rejection/exception after upload, including failed object removal.
- **Expected:** Best-effort object removal occurs; failed removal is queued durably without exposing document contents or inventing retention policy.
- **Actual:** Unit tests cover cleanup on RPC rejection/exception and queue insertion with reason. Queue is RLS-enabled with no browser policy. No worker or retention behavior was added; those remain E12/legal scope.
- **Result:** PASS

### TC-009 — Analytics/publicado and discovery wiring
- **Scenario:** Verify atomic analytics metadata and E7-01 candidate visibility assumptions.
- **Expected:** Submission event records `ninera_id` and `motivo`; pending transition preserves `publicado`; complete `no_verificada` profile remains discoverable.
- **Actual:** Live E7-03 and E7-01 probes confirmed event metadata, unchanged `publicado`, and matching visibility for a complete unverified niñera. Verification status is absent from the candidate eligibility/scoring path.
- **Result:** PASS

### TC-010 — UI state feedback after fixes
- **Scenario:** Inspect current NIN-08 upload state implementation and component tests.
- **Expected:** Mobile camera/gallery controls precede desktop-only drag/drop, selected preview and progress are shown while uploading, and validation errors have inline recovery affordances.
- **Actual:** Current component renders camera/gallery under `lg:hidden`, desktop picker/drop zone under `lg:flex`, selected image preview with progressbar while pending, and icon-bearing inline error with retry when a selected file remains. Component tests passed in the full suite.
- **Result:** PASS

## Bugs

None found in final functional behavior.

## Regression Results

- `npm test -- --run --no-file-parallelism`: **PASS** — 66 files, 463 tests.
- `npm run lint`: **PASS**.
- `npm run typecheck`: **PASS** — route type generation and `tsc --noEmit` clean.
- `npm run check:secrets`: **PASS** — no server-only secret exposed client-side.
- `npm run build`: **PASS** — production build compiled; `/ninera/perfil/identificacion` is dynamic. Only existing Supabase Node 20 deprecation warnings appeared.
- `npm run test:db`: **PASS, exit 0** — clean local migration reset through all existing probes plus E7-01, E7-03 identity authorization/status/analytics/storage tests, and E7-03 concurrent submission probe. The expected duplicate-payment probe error was handled and did not fail the command.

## Recommendation

Accept E7-03 functional behavior as passing. Leave VERIFIED/merge decisions to the orchestrator. Before production collection of real government IDs, resolve the legal retention/deletion policy and operationalize the policy-gated cleanup worker/reconciliation path; this is not an E7-03 functional defect.
