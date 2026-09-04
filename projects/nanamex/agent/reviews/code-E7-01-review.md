# Code Review

## Verdict

PASS

E7-01 satisfies its acceptance criteria correctly and rigorously. `perfil_completo` is
computed from exactly the field list database.md §3 specifies, `publicado` is set purely
from that completeness flag with no conditional path on `verification_status` anywhere in
the write path, ownership is enforced server-side via session-derived `user.id` (never
client-supplied), and the `profile-photos` Storage bucket is genuinely public-read with
writes RLS-restricted to the owning user's path. The regression-critical addendum
requirement (a `no_verificada`, `perfil_completo=true` niñera must appear in
`computeMatches`) is proven at both the unit level and, more convincingly, at a live-DB
level tracing the exact query `actions/necesidad.ts` runs. Full validation suite re-run
independently by this review, all green: `npm run lint`, `npm run typecheck`, `npm test --
run --no-file-parallelism` (440 tests, 64 files), `npm run check:secrets`, `npm run build`,
and `npm run test:db` (fresh local Supabase reset via Docker, full chain including
`test-e7-01-perfil-ninera.mjs`, exit 0).

## Critical Issues

None found.

## Important Issues

None found.

## Minor Issues

- **Photo type validation relies on the client-supplied `File.type` MIME header, not
  content sniffing.** `uploadPerfilFotoAction` (`actions/perfil-ninera.ts`) checks
  `ALLOWED_PHOTO_TYPES.has(file.type)` server-side, which is a real improvement over a
  client-only `accept` filter (a renamed `.pdf` sent with `Content-Type: application/pdf`
  is correctly rejected, per the test suite), but a maliciously relabeled file (an
  arbitrary payload sent with `Content-Type: image/jpeg`) would pass this check and be
  written to the public `profile-photos` bucket. This is a defense-in-depth gap, not a bypass
  of the story's literal acceptance criterion ("size/type-validated server-side," which this
  does satisfy literally), and is consistent with this codebase's existing patterns
  elsewhere. Low severity given the bucket only ever serves images to `<img>` tags and isn't
  used as a general file host, but worth hardening in a follow-up (e.g. magic-byte sniffing)
  before the story's real-world usage scales.
- **Client-side `canFinish` in `perfil-ninera-wizard.tsx` doesn't replicate the
  `salarioMin <= salarioMax` cross-field check** the Zod schema and `save_perfil_ninera`'s
  implicit ordering assume. A user who sets `salarioMin > salarioMax` will see the
  "Finalizar" button enabled, submit, and only then see a generic Spanish validation error
  surfaced from the first Zod issue — a UX rough edge, not a correctness or security defect,
  since the server-side schema (`perfilNineraDraftSchema`'s `superRefine`) does correctly
  reject it before it ever reaches the RPC.
- **`ZonaMultiSelect`'s deviation from UI-SPEC's literal "same autocomplete as FAM-03"
  wording** (a genuinely necessary adaptation, since `ninera_zonas` is many-to-many while
  FAM-03's `zona_id` is 1:1) is well-documented in-code and in the developer's report, and
  correctly re-uses the same combobox interaction pattern. No objection to the judgment
  call itself; flagging only that this is exactly the kind of UI-SPEC deviation that should
  be confirmed with UX/Product before being treated as final, since it wasn't explicitly
  pre-approved in the spec text.

## Security Observations

- **PASS:** `save_perfil_ninera` is `security definer`, with `execute` revoked from
  `public`/`anon`/`authenticated` and granted only to `service_role` — confirmed both by
  reading the migration SQL directly and by the live-DB probe
  (`scripts/test-e7-01-perfil-ninera.sql`) asserting `has_function_privilege` for all three
  roles and inspecting `pg_proc.proacl` directly (not just trusting the `revoke`/`grant`
  statements ran without checking their effect).
- **PASS:** `p_ninera_id` is always the server-derived `user.id` from
  `supabase.auth.getUser()`, never a client-supplied value — a niñera cannot write another
  niñera's `perfil_ninera` row, `zonas`, `experiencia_edades`, or `referencias` through this
  action.
- **PASS:** `publicado` is never conditioned on `verification_status` anywhere in
  `save_perfil_ninera` — read directly from the SQL: `perfil_completo` and `publicado` are
  computed identically (`v_completo`) and `verification_status` is never referenced in the
  function body at all, matching the schema default (`no_verificada`) staying untouched.
  Live-DB probe additionally asserts `verification_status` is unchanged across both partial
  and full-payload saves.
- **PASS:** `profile-photos` bucket is `public = true` (confirmed via `storage.buckets`
  query in the live-DB probe) with `select` open to `public`, but `insert`/`update`/`delete`
  policies all require `(storage.foldername(name))[1] = auth.uid()::text` — genuine
  write-scoping to the owning user's path, not merely a public-flag-only bucket. (The
  server action itself uses the service-role client, bypassing RLS for its own writes; the
  policy is the correct backstop for any direct/future client-side Storage calls.)
- **PASS:** Zona IDs are re-validated against the real `zonas` table server-side
  (`actions/perfil-ninera.ts`) before being forwarded to the RPC — a client can't inject an
  arbitrary UUID into `ninera_zonas` (and even if it bypassed the action, the RPC's FK
  constraint on `ninera_zonas.zona_id` rolls back the whole transaction atomically, verified
  in the live-DB probe's last block).
- **PASS:** File size (5MB) and MIME allow-list are enforced server-side, not merely via the
  `<input accept>` client hint — see Minor Issues above for the residual MIME-spoofing gap.
- No secrets, PII logging, or client-only security enforcement observed in the diff.

## Test Coverage Observations

- `tests/lib/matching/no-verificada-visibility.test.ts`: a real, non-trivial expression of
  the regression-critical criterion. It is a unit test against `computeMatches` with a
  mocked repository (so on its own it's somewhat shallow — `MatchCandidate`'s type simply
  has no `verification_status` field, so of course the function can't discriminate on it),
  but this review cross-checked its central claim directly against
  `actions/necesidad.ts`'s real candidate query
  (`.eq("publicado", true).eq("perfil_completo", true).eq("profiles.account_status",
  "activa")` — no `verification_status` filter anywhere) and confirmed the claim is accurate,
  not just assumed. The live-DB script closes the remaining gap by asserting the same query
  shape against an actual `no_verificada`/`perfil_completo=true` row post-`save_perfil_ninera`.
  Together (unit + live-DB), this is genuine, non-trivial coverage of the addendum's Critical
  Issue #2 resolution, not a test that could pass by construction alone.
- `scripts/test-e7-01-perfil-ninera.sql`: strong live-Postgres coverage — RPC ACL isolation,
  bucket public-read flag, partial-payload-never-flips-completeness, full-payload flips both
  `perfil_completo`/`publicado` while leaving `verification_status` untouched, join-table
  replace-not-accumulate semantics on re-save, completeness reverting to `false` when a
  required field (`descripcion`) is dropped, and atomic rollback on an invalid `zona_id` FK
  violation.
- `tests/actions/perfil-ninera.test.ts`: malformed-JSON/unknown-field/unauthenticated/
  wrong-role/invalid-zona-id fail-closed paths, RPC-call argument shape (snake_case
  normalization), RPC-failure error surfacing, and the photo-upload path's size/type
  rejection plus own-path upload confirmation.
- `tests/lib/ninera/perfil-validation.test.ts` and
  `tests/components/ninera/perfil-ninera-wizard.test.tsx` were reviewed for shape and are
  consistent with the schema/component behavior described above (progressive-fill optional
  fields, `superRefine` cross-field salario check, step-gating logic).
- E7-02 through E7-05 (edit re-review trigger, NIN-08 upload, dashboard, opportunities) are
  correctly out of scope for this diff, consistent with their separate dependency chain in
  implementation-plan.md.
- `scripts/test-e6-01-pipeline.sql`'s only change (`'Prueba'` → `'Prueba E601'` colonia
  label) was diffed directly against main: it is genuinely just a fixture-data change to
  avoid a natural-key collision with `test-e5-04-contact.sql`'s committed (non-rolled-back)
  fixture rows when both run in the same `test:db` chain. No assertion, RPC call, or
  business-logic line in that file changed. Re-running the full `test:db` chain confirms
  both `test-e6-01-pipeline.mjs` and `test-e7-01-perfil-ninera.mjs` pass together, exit 0 —
  the collision this fix addresses is real and now resolved.
- Full validation suite re-run independently by this review, all passing: `npm run lint`,
  `npm run typecheck`, `npm test -- --run --no-file-parallelism` (440 tests, 64 files),
  `npm run check:secrets`, `npm run build`, and `npm run test:db` (fresh local Supabase
  reset against Docker, full script chain including both new E7-01 migrations, exit 0).

## Acceptance Criteria Assessment

| Criterion | Verdict |
|---|---|
| `perfil_completo` computed correctly from exactly database.md §3's required field list (zona de trabajo, disponibilidad, modalidades, expectativa salarial, descripción, ≥1 experiencia_edad) | PASS |
| `publicado` set purely from `perfil_completo`, never gated on `verification_status` | PASS |
| A `no_verificada`, `perfil_completo=true` niñera appears in `computeMatches` results (regression-critical) | PASS |
| Only the owning niñera can write her own `perfil_ninera`/zonas/experiencia/referencias via the RPC | PASS |
| `profile-photos` bucket is public-read but write-restricted to the owning user's own path | PASS |
| File type/size validated server-side for photo upload, not just client-side | PASS (see Minor Issues re: MIME-spoofing residual gap) |
| NIN-01/02 wizard UI matches UI-SPEC's shell/step structure and field set | PASS |
| `/ninera` completion gate redirects an un-onboarded niñera to `/ninera/perfil`, mirroring FAM-01's pattern | PASS |
| Re-saving replaces (not accumulates) join-table rows | PASS |
| Atomicity: a failed write (e.g. invalid `zona_id`) rolls back the whole `save_perfil_ninera` call | PASS |
| `test-e6-01-pipeline.sql` fixture-label change is logic-neutral to the already-VERIFIED E6-01 story | PASS |
| Automated validation (lint, typecheck, tests, secrets, build, test:db) | PASS |

## Required Changes

None required before proceeding to Functional QA / Visual QA. Optional follow-ups
(non-blocking):
1. Consider magic-byte/content-based validation for the photo upload in a later hardening
   pass, since the current server-side check trusts the client-reported `File.type` header.
2. Add a client-side `salarioMin <= salarioMax` guard to `canFinish` in
   `perfil-ninera-wizard.tsx` so the "Finalizar" button doesn't enable on an
   already-known-invalid state, avoiding a round-trip to surface a validation error the
   client could catch immediately.
3. Confirm the `ZonaMultiSelect` many-to-many UI adaptation with UX/Product explicitly,
   since it materially changes the interaction UI-SPEC describes (multi-select chips vs. a
   single-value autocomplete), even though the underlying reasoning (many-to-many schema)
   is sound.
