# Functional QA

## Verdict

PASS

Final independent Functional QA passes E7-01. Do not mark VERIFIED or merge from this report; workflow/status ownership remains with the orchestrator.

## Environment

- Repository: `projects/nanamex`, branch `nanamex/e7-01-nin-onboarding`
- Test date: 2026-09-04
- Platform: web-only Next.js 16.3.4, TypeScript, React 19, Vitest 4.1.11. Mobile QA is not applicable per `config/CONSTRAINTS.md`; web QA is agent-driven.
- Database: local Supabase/Postgres (Docker), reset by `npm run test:db`; migrations `20260904000019_perfil_ninera_onboarding.sql` (RPC) and `20260904000020_profile_photos_storage.sql` (Storage bucket) applied on top of E6-01's chain.
- No production code modified by QA. Existing unrelated workspace changes (`lib/stripe/client.ts`, `package.json`, deleted `test-invoice-generator` scaffolding, other epics' new API/webhook files) were not assessed as part of this verdict.

## Test Cases

### TC-001 — `perfil_completo` computed from exactly database.md §3's required field list
- **Scenario:** Trace `save_perfil_ninera`'s `v_completo` boolean expression directly and cross-check against a partial-payload and a full-payload write.
- **Expected:** `perfil_completo = true` only once zona de trabajo (≥1), disponibilidad (≥1), modalidades (≥1), salario_min, salario_max, descripcion (non-empty after trim), and experiencia_edades (≥1) are all set; any single missing field keeps it `false`.
- **Actual:** Read the RPC SQL directly (`db/migrations/20260904000019_perfil_ninera_onboarding.sql:45-51`): `v_completo := array_length(zonas)>0 and jsonb_array_length(disponibilidad)>0 and array_length(modalidades)>0 and salario_min is not null and salario_max is not null and descripcion is not null and array_length(edades)>0` — exactly the seven fields the story specifies, no more, no fewer. Live-DB probe (`scripts/test-e7-01-perfil-ninera.sql`, run via `npm run test:db`, exit 0) confirms: a paso-1-only payload (foto + zonas + años) leaves `perfil_completo=false`; a full payload flips it to `true`; dropping only `descripcion` from an otherwise-full payload flips it back to `false`. Client-side `canFinish` in `perfil-ninera-wizard.tsx` independently gates the "Finalizar" button on the same field set (disponibilidad, modalidades, salarioMin/Max, descripcion, experienciaEdades — zonaIds is gated earlier by `canNext` for paso 1→2), consistent with the server-side source of truth.
- **Result:** PASS

### TC-002 — `publicado` is set purely from `perfil_completo`, never gated on `verification_status` (regression-critical)
- **Scenario:** Independently re-derive, from the RPC SQL and the real candidate query, that a `no_verificada` niñera with a complete profile is `publicado` and appears in matching.
- **Expected:** `publicado := perfil_completo` unconditionally; `verification_status` never referenced in the write path or the read/matching path.
- **Actual:** RPC SQL (`20260904000019...sql:58,68`) sets `publicado` to `v_completo` in both the `insert` values list and the `on conflict do update set` clause — `verification_status` is never mentioned anywhere in the function body (confirmed via full read of the 97-line migration; no reference exists). The real candidate query in `actions/necesidad.ts:148-149` — `.select("...").eq("publicado", true).eq("perfil_completo", true).eq("profiles.account_status", "activa")` — filters on exactly these three conditions and has no `verification_status` clause at all. Live-DB probe explicitly asserts `verification_status = 'no_verificada'` is unchanged across both the partial-save and full-save calls, and separately asserts (lines 77-85 of the SQL script) that the exact shape of `actions/necesidad.ts`'s query returns this `no_verificada`, `perfil_completo=true` row. Unit test `tests/lib/matching/no-verificada-visibility.test.ts` corroborates at the `computeMatches` level: a candidate shaped exactly like this RPC's output appears in results for a compatible necesidad and ranks identically to an otherwise-identical "verificada" candidate (verification never enters scoring). `MatchCandidate`'s type has no `verification_status` field at all, matching the real query's column list.
- **Result:** PASS

### TC-003 — `/ninera` completion gate redirects an incomplete profile, mirrors FAM-01
- **Scenario:** An authenticated niñera with `perfil_completo = false` (or no `perfil_ninera` row at all) visits `/ninera`.
- **Expected:** Redirected server-side to `/ninera/perfil` before rendering any dashboard content.
- **Actual:** `app/ninera/page.tsx` reads `getNineraOnboardingState(user.id)` and calls `redirect("/ninera/perfil")` when `isNinera && !isOnboarded`. `lib/auth/ninera-onboarding.ts`'s `isOnboarded` is `Boolean(perfil_ninera.perfil_completo)` — a row with `perfil_completo = false`, or no row at all (`maybeSingle()` returns `null`), both evaluate to `false`/falsy, correctly gating both the "never started" and "started but incomplete" cases, not merely "row exists." Page is `force-dynamic`, so this check runs per-request against the caller's real session rather than being cached — same pattern as `app/familia/page.tsx`'s FAM-01 gate. `app/ninera/perfil/page.tsx` itself pre-fills any partial progress from `perfil_ninera`/`ninera_zonas`/`ninera_experiencia_edades`/`referencias` scoped to `user.id`, so a returning user resumes rather than restarting.
- **Result:** PASS

### TC-004 — Authorization: a niñera cannot write another niñera's profile/zonas/experiencia/referencias
- **Scenario:** Confirm `p_ninera_id` passed to `save_perfil_ninera` cannot be client-controlled, and that the RPC's ACL prevents direct invocation.
- **Expected:** Ownership derived server-side from the authenticated session, never from client input; direct RPC access blocked for `anon`/`authenticated`.
- **Actual:** `actions/perfil-ninera.ts:61-64` calls `db.rpc("save_perfil_ninera", { p_ninera_id: user.id, ... })` where `user.id` comes from `supabase.auth.getUser()` — never read from `formData`/the client payload. The RPC is `security definer` with `revoke execute ... from public, anon, authenticated; grant execute ... to service_role` (migration lines 95-96), confirmed live via `has_function_privilege` checks in the SQL probe for all three roles plus a direct `pg_proc.proacl`/`aclexplode` inspection ruling out a `PUBLIC` grant. Since a client-side Supabase call cannot invoke this RPC at all (no execute grant), and the server action always supplies the session-derived id, a niñera cannot target another niñera's row through this path. `zonaIds` are also re-validated against the real `zonas` table before being forwarded (rejecting an arbitrary UUID with a generic error before the RPC is even called), and the RPC's own FK constraint on `ninera_zonas.zona_id` provides a second backstop (probed live: an invalid `zona_id` raises an exception and rolls back the whole call, leaving prior state untouched — verified count unchanged).
- **Result:** PASS

### TC-005 — "Subir ahora" (NIN-08 placeholder) is genuinely disabled, not misleadingly clickable
- **Scenario:** Reach the end-of-paso-2 identity-upload prompt card and inspect the "Subir ahora" control.
- **Expected:** Non-functional placeholder since NIN-08/E7-03 doesn't exist yet; must not silently no-op or navigate to a broken route.
- **Actual:** `IdentityPromptCard` in `perfil-ninera-wizard.tsx:471` renders `<button type="button" disabled title="Próximamente" ... className="... opacity-40">Subir ahora</button>` — a real HTML `disabled` attribute (not just a no-op `onClick`), so it cannot receive focus/clicks/keyboard activation at all, with a visible `opacity-40` dimming and an explanatory `title` tooltip. "Más tarde" is the only live action, calling `onSkip` which routes to `/ninera` (completing onboarding). This matches the acceptance criterion and the code review's finding; independently confirmed by reading the rendered JSX, not just trusting the review's description.
- **Result:** PASS

### TC-006 — Photo upload writes to `profile-photos` bucket under the owner's own path, URL is usable
- **Scenario:** Upload a valid image; confirm storage path, public-read policy, and returned URL.
- **Expected:** File lands at `{profile_id}/{filename}` in the public `profile-photos` bucket; write policies restrict to the owner's path; returned URL is a real public URL.
- **Actual:** `uploadPerfilFotoAction` (`actions/perfil-ninera.ts:104-114`) builds `path = \`${user.id}/${Date.now()}.${extension}\`` (session-derived, not client-supplied), uploads via the service-role client, then calls `.getPublicUrl(path)` and returns `publicUrl.publicUrl` to the client, which the wizard immediately renders in an `<img src={data.fotoUrl}>` preview. Migration `20260904000020_profile_photos_storage.sql` creates the bucket with `public = true` and a `profile_photos_public_read` policy open to `public`, while `insert`/`update`/`delete` policies all require `(storage.foldername(name))[1] = auth.uid()::text` — write-scoped to the owning user's path (this is the correct backstop for any future direct client-side Storage call; the server action itself uses the service-role client and bypasses RLS for its own writes, which is consistent with this codebase's established pattern). Live-DB probe confirms the bucket exists with `public = true`. Unit test (`tests/actions/perfil-ninera.test.ts`) confirms the uploaded path starts with `user-1/` and the action returns the mocked public URL unmodified. Size (5MB) and MIME allow-list (`image/jpeg`, `image/png`, `image/webp`) are both enforced server-side, independently confirmed by reading the checks in `uploadPerfilFotoAction` and by the unit tests rejecting an oversized file and a relabeled `.pdf` even with a bypassed client-side `accept` filter.
- **Result:** PASS

### TC-007 — Server-side cross-field salario validation exists (client gap noted, not a defect)
- **Scenario:** Confirm `salarioMin > salarioMax` cannot be persisted even if the client-side "Finalizar" gate doesn't catch it.
- **Scenario detail:** `perfilNineraDraftSchema`'s `.superRefine` (`lib/ninera/perfil-validation.ts`) raises a Zod issue when `salarioMin > salarioMax`, checked in `savePerfilNineraDraftAction` before the RPC is ever called (`validatePerfilNineraDraft(value)` — a `safeParse` failure short-circuits with `status: "error"` and never reaches `db.rpc(...)`).
- **Expected:** Server rejects this state regardless of client behavior.
- **Actual:** Confirmed by reading the schema directly — the cross-field check exists and runs server-side on every save call, independent of the client wizard's `canFinish` (which the code review correctly flagged as *not* replicating this specific check client-side — a UX rough edge, not a correctness/security gap, since the server is the actual enforcement point).
- **Result:** PASS

## Bugs

None found. No new defects beyond what the code review already identified (MIME-spoofing residual gap on photo upload; client-side `canFinish` not mirroring the server's `salarioMin<=salarioMax` check) — both independently re-confirmed above as real but non-blocking, matching the review's severity assessment.

## Regression Results

- Full Vitest suite: **PASS — 64 files, 440 tests** (`npm test -- --run --no-file-parallelism`). Matches the code review's reported baseline.
- `npm run lint`: **PASS** — no output/errors.
- `npm run typecheck`: **PASS** — route types generated successfully, `tsc --noEmit` clean.
- `npm run check:secrets`: **PASS** — "no server-only secret exposed client-side."
- `npm run build`: **PASS** — production build compiled; `/ninera` and `/ninera/perfil` both listed as dynamic (`ƒ`) routes as expected (session-dependent per-request reads). Only pre-existing Node 20 Supabase deprecation warnings, unrelated to this story.
- `npm run test:db`: **PASS, exit 0** — fresh local Supabase reset (Docker) plus the full `test-e*` script chain including `test-e7-01-perfil-ninera.mjs`. Live SQL output independently inspected against `scripts/test-e7-01-perfil-ninera.sql`'s assertions: RPC ACL isolation (service_role only), `profile-photos` bucket public-read flag, partial-payload never flips completeness, full payload flips both `perfil_completo`/`publicado` while `verification_status` stays `no_verificada`, the real candidate-query shape finds this row, join-table replace-not-accumulate semantics on re-save, completeness reverting to `false` when `descripcion` is dropped, and atomic rollback on an invalid `zona_id` FK violation — all consistent, no unexpected errors, `ROLLBACK` at end of script is intentional (wraps the whole probe in one transaction).

## Recommendation

Accept E7-01 functional behavior as passing. The story's central, regression-critical requirement — a `no_verificada`, `perfil_completo=true` niñera stays `publicado` and appears in matching — was re-derived independently by reading the RPC SQL and the real `actions/necesidad.ts` candidate query directly (not taken on the code review's word), and holds at both the unit and live-DB level. Authorization (session-derived ownership, RPC ACL, Storage path-scoping), the completion gate, and the disabled NIN-08 placeholder were all independently traced and confirmed correct. Leave VERIFIED/merge decisions to the orchestrator.
