# Code Review

## Verdict

PASS_WITH_MINOR_ISSUES

## Critical Issues

None identified.

## Important Issues

None for E7-03/NIN-08. The final touch-target fix adds `min-h-11` to the verified-state `Reemplazar documento` action while preserving its low-weight link treatment. Upload, RPC, cleanup, concurrency, state rendering, E7-01 wiring, and responsive paths are consistent with the approved scope.

## Minor Issues

- No authenticated browser session or pixel screenshot harness was available; responsive behavior was verified through source inspection and component tests.
- Cleanup queue insertion is best-effort if the database itself is unavailable, and the queue has no consumer. This is an operational/E12 follow-up, not an E7-03 blocker.

## Security Observations

- PASS: `identity-documents` is private. Owner browser insert/update policies are removed by the hardening migration; authenticated direct Storage writes are denied.
- PASS: The server action derives the authenticated user, requires an active `ninera` profile, checks size before reading bytes, and validates MIME, extension, and JPEG/PNG/WEBP signatures before upload.
- PASS: Storage paths are server-generated below the authenticated user UUID, use `crypto.randomUUID()`, and upload with `upsert: false`. The service-role-only RPC rechecks role/profile eligibility, ownership/path shape, and active-review status.
- PASS: RPC row locking plus the partial unique active-submission index safely handles duplicate/concurrent submissions. The transaction creates the pending row, transitions the profile to `en_proceso`, records analytics, and does not alter `publicado`.
- PASS: RPC rejection/exception paths attempt deletion; failed deletion is recorded in the system-only cleanup queue. No document contents, raw file data, or sensitive payloads are logged.
- E8 admin review, signed URLs/access logging, and E12 retention/deletion/worker policy were not added or bypassed. Resolve the legal retention policy and admin controls before collecting real government IDs in production.

## Test Coverage Observations

- PASS: `npm test -- --run --no-file-parallelism`: **464 tests passed** across 66 files.
- PASS: `npm run test:db`: passed after a clean local migration reset, including E7-01 wiring, Storage/RPC authorization, status/publication/analytics behavior, rejected and verified resubmission motivos, inactive-account rejection, and concurrent-submission probes. The expected duplicate-payment probe error was handled and the command exited successfully.
- PASS: `npm run lint` and `npm run typecheck` passed.
- Focused tests cover TrustBadge state/color/icon semantics, server auth and role checks, byte/type/extension/size rejection, cleanup and durable queueing, inline preview/progress/retry behavior, touch target, responsive control ordering, and E7-01 route wiring.
- Residual gap: no cleanup worker test is applicable because the worker and retention policy are explicitly E12 scope.

## Acceptance Criteria Assessment

- PASS — Upload creates a pending identity submission and sets the profile verification state to `en_proceso`.
- PASS — The profile remains `publicado`, visible, and matchable while verification is pending or not yet submitted.
- PASS — Pending copy communicates “normalmente toma 24–48 horas” as an expectation, not a guarantee.
- PASS — Server validation covers maximum size, MIME, extension, and image byte signatures before Storage; oversized files are rejected before reading bytes.
- PASS — Only an authenticated, active niñera with a profile can submit; identity is derived server-side.
- PASS — Storage is private; browser direct insert/update/replacement is denied; generated paths are unique and immutable to browser callers.
- PASS — Submissions are append-only with safe duplicate/concurrent handling and correct first-submission/verified-revision motivos.
- PASS — Submission analytics are recorded atomically with the pending transition.
- PASS — No-verificada, rejected-with-reason/resubmit, en-proceso, and verificada states are represented; TrustBadge large colors/icons/labels remain correct.
- PASS — Responsive camera/gallery/desktop controls, selected preview, progress feedback, inline retry errors, and the 44px replacement action are implemented.
- PASS — E7-01 `Subir ahora` wiring targets `/ninera/perfil/identificacion`.
- PASS — Admin review and identity-document retention/deletion policy remain outside E7-03 and were not invented; E8/E12 scope is preserved.

## Required Changes

None for E7-03/NIN-08. Before production collection of real government ID documents, make the legal retention/deletion decision and implement the policy-gated E8/E12 operational paths. This review does not mark the story VERIFIED or approve merge.
