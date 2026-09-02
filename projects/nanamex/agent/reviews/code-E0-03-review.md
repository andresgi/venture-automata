# Code Review

Story: E0-03 — Core schema migration: `profiles`, `perfil_familiar`, `perfil_ninera`, `zonas`

Files reviewed:
- `db/migrations/20260902000002_core_enums.sql`
- `db/migrations/20260902000003_zonas.sql`
- `db/migrations/20260902000004_profiles.sql`
- `db/migrations/20260902000005_perfil_familiar.sql`
- `db/migrations/20260902000006_perfil_ninera.sql`
- `db/migrations/20260902000007_security_hardening.sql` (added in follow-up round)
- `db/seed.sql`, `supabase/seed.sql` (symlink), `supabase/config.toml`
- `README.md`, `agent/DECISIONS.md`, `config/PROJECT.md` (diffs)
- `.github/workflows/nanamex-ci.yml`
- Cross-checked against `engineering/database.md` §1–4/§7/§14, `engineering/security.md` §2–3, `engineering/architecture.md` §3/§18, `config/CONSTRAINTS.md`, `engineering/implementation-plan.md` (E0-03 entry)

## Verdict

**PASS_WITH_MINOR_ISSUES**

Round 1 (initial implementation, migrations `20260902000002`–`20260902000006` + seed) returned **REVISE**: schema/enums matched `database.md` field-for-field and the four documented judgment calls were sound, but several RLS policies allowed self-service client writes to columns `database.md`/`security.md` explicitly designate as system/admin-only, plus a missing CI validation step and a stale doc comment.

Round 2 (this review): the Developer's follow-up migration `20260902000007_security_hardening.sql`, plus updates to `.github/workflows/nanamex-ci.yml` and `supabase/config.toml`, correctly closes all 6 required changes and both optional items from the prior review. I independently re-read the trigger logic, the RLS policy text, the FK change, and the CI YAML rather than relying on the Developer's test narration — see verification detail below. No new issues were introduced. One trivial documentation gap remains (README not yet mentioning migration 007), noted as a minor issue only.

## Verification of Required Changes (Round 2)

1. **`perfil_ninera.verification_status`/`publicado` self-write gap — CLOSED.** `db/migrations/20260902000007_security_hardening.sql:26-61` adds `perfil_ninera_protect_system_fields()` as a `BEFORE INSERT OR UPDATE` trigger. Verified the logic directly:
   - `caller_role := auth.role()`; `is_privileged := caller_role is null or caller_role = 'service_role'`. This correctly matches Supabase's actual `auth.role()` semantics (`select nullif(current_setting('request.jwt.claims', true)::json->>'role', '')::text` — the `true` arg means "missing is not an error," so a raw `psql`/migration/seed context returns `NULL`, and a PostgREST request under the service-role JWT returns `'service_role'`). Both are correctly treated as privileged; a request under the `anon`/`authenticated` Postgres role (i.e. a direct client call, which is exactly the scenario RLS/this trigger exists to catch) returns `'authenticated'`/`'anon'` and is correctly treated as non-privileged.
   - `INSERT`: rejects any non-privileged insert where `verification_status <> 'no_verificada'` or `publicado <> false` — closes the insert-time bypass I flagged (previously `perfil_ninera_insert_own`'s `with check` only constrained `profile_id`).
   - `UPDATE`: rejects any non-privileged change where `new.verification_status is distinct from old.verification_status` or `new.publicado is distinct from old.publicado` — correctly an old/new comparison (not just a static check), so a client updating unrelated columns (e.g. `descripcion`) while resubmitting the same `verification_status`/`publicado` values is unaffected, matching normal ORM/upsert behavior.
   - Because triggers fire independent of RLS (a `BYPASSRLS` role like `service_role` still executes `BEFORE` triggers), the admin/system write path — which always runs server-side under the service-role client per `architecture.md` §3 — is unaffected: `is_privileged` correctly evaluates true for it.
   - This directly satisfies `security.md` §2.1 ("Modify: Owner; `verification_status` only by system/admin") and §3 ("no server action or API route may set this column directly from user input").

2. **`profiles.email_verified`/`phone_verified` self-write gap — CLOSED.** `20260902000007:63-97` adds `profiles_protect_system_fields()`, an identical pattern (same `auth.role()` privilege check, same insert-default / update-old-vs-new logic) scoped to `email_verified`/`phone_verified`. Matches `database.md` §1 ("system-set, never user-editable directly"). Same reasoning as #1 applies to correctness.

3. **Admin self-provisioning via `profiles_insert_own` — CLOSED.** `20260902000007:99-108` does `drop policy profiles_insert_own on public.profiles;` then recreates it with `with check (auth.uid() = id and role in ('familia', 'ninera'))`. Verified there is exactly one `drop`+`create` pair (no duplicate/orphaned policy left behind) — a self-registering client can no longer set `role = 'admin'`.

4. **`profiles.id` FK `on delete cascade` — CLOSED.** `20260902000007:116-120` does `alter table public.profiles drop constraint profiles_id_fkey;` then re-adds `foreign key (id) references auth.users (id) on delete restrict`. Verified `profiles_id_fkey` is in fact the auto-generated constraint name Postgres would assign to the original inline `references auth.users (id) on delete cascade` in `20260902000004_profiles.sql:4` (default naming convention: `<table>_<column>_fkey`), so the `drop constraint` targets the correct object. `on delete restrict` now structurally blocks a raw `auth.users` hard-delete from cascading through `profiles` → `perfil_familiar`/`perfil_ninera`/etc., consistent with the documented "never hard-delete, always anonymize" lifecycle (`database.md` §1).

5. **Missing CI seed row-count check — CLOSED.** `.github/workflows/nanamex-ci.yml:81-96` adds a "Verify zonas seed populated (row count > 0)" step after `supabase db reset --local`, in the same `migrations` job (so it shares the running local Supabase stack). Verified:
   - `psql -h 127.0.0.1 -p 55322 -U postgres -d postgres` — port `55322` matches `supabase/config.toml`'s `[db] port = 55322`; `postgres`/`postgres` is the correct, well-known local Supabase CLI default (not a real secret, and scoped to an ephemeral CI container — no secret-handling concern).
   - `-tAc` (tuples-only, unaligned) returns a bare integer with no formatting, so the subsequent `[ "${count}" -le 0 ]` integer test is safe.
   - Fails the build (`exit 1` with a `::error::` annotation) if the count is empty or `<= 0`, exactly matching the E0-03 Validation criterion in `implementation-plan.md` ("a query confirms seed row count > 0").

6. **Stale CDMX comment in `supabase/config.toml` — CLOSED.** Confirmed the comment now reads "...populates the `zonas` reference table (Monterrey municipios/colonias, per `agent/DECISIONS.md` 2026-09-02 'V1 launch city confirmed as Monterrey')." Re-ran a repo-wide grep for `CDMX`/`Ciudad de México`: the only remaining hits are in `db/seed.sql`'s header comment and `agent/DECISIONS.md`, both of which are correctly *historical* references explaining what was replaced and why — not stale/incorrect statements about current state.

## Verification of Optional Items (Round 2)

- **`perfil_ninera_publicado_requires_completo` check** (`20260902000007:127-131`): `check (not publicado or perfil_completo)` — correct implication logic (`publicado ⟹ perfil_completo`); trivially satisfied by both columns' `false` defaults, so no risk to existing/future default-value inserts.
- **Non-negativity checks** (`20260902000007:133-142`) on `anos_experiencia`, `salario_min`, `salario_max` — correct, null-safe (`... is null or ... >= 0`), consistent with the existing `salario_min <= salario_max` constraint's style.

## Critical Issues

None.

## Important Issues

None remaining. All five Important issues from the Round 1 review are verified closed (see above).

## Minor Issues

1. **`README.md`'s migrations section is now slightly out of date.** Lines around 66–70 describe "`20260902000002`–`20260902000006`, core schema... `supabase migration list --linked` confirms all six migrations as applied remotely," but a 7th migration (`20260902000007_security_hardening.sql`) has since been added and, per the Developer's summary, pushed to and confirmed on hosted `nanamex-dev`. Purely a documentation lag, no functional impact — worth a one-line update the next time README is touched, not worth a dedicated round-trip.
2. (Carried over from Round 1, not blocking) `referencias_select_authenticated` (`20260902000006_perfil_ninera.sql:162-166`) remains world-readable to any authenticated user regardless of the owning niñera's `publicado` state. This is spec-compliant per `security.md` §2.1's literal wording and was flagged in Round 1 as a product/spec question, not an implementation defect — no action needed from the Developer.

## Security Observations

- The `auth.role()`-based privilege check is the correct, idiomatic Supabase pattern for distinguishing a direct PostgREST client request from a service-role or superuser/migration context, and its NULL-handling (treating an absent JWT context — i.e., migrations/psql/seed — as privileged) is the right call for this schema's operational model, since those paths are the only other legitimate writers today.
- Both new trigger functions are correctly `SECURITY INVOKER` (the default) rather than `SECURITY DEFINER` — they only compare row values and call a public-accessible `auth.role()`, so no elevated-privilege function was introduced unnecessarily (unlike `is_admin()`, which has a specific, justified need for `SECURITY DEFINER` to avoid RLS recursion).
- No secrets introduced; the `postgres`/`postgres` credential in the new CI step is the standard local Supabase CLI default, scoped to an ephemeral, non-production CI container.

## Test Coverage Observations

- The new CI step directly closes the previously-missing automated seed-validation check. No automated test exists yet for the two new triggers or the updated RLS/FK behavior (the Developer's validation was manual, run against both `authenticated` and `service_role` contexts) — as in Round 1, this is a reasonable scope cut for a schema-only story, not a blocking gap, but would be a good candidate for a lightweight pgTAP/SQL regression suite in a later story given how much future work builds on these tables.

## Acceptance Criteria Assessment

Per `engineering/implementation-plan.md` E0-03 entry, re-assessed after Round 2:

1. **"Implement `database.md` §1–4 as SQL migrations, including the `rango_edad` and other enums."** — PASS.
2. **"`zonas` seed script populates the launch city's alcaldías/colonias with centroid coordinates."** — PASS.
3. **Validation: "migration + seed run in CI against a throwaway DB"** — PASS.
4. **Validation: "a query confirms seed row count > 0"** — PASS (Round 1: FAIL; closed in Round 2).
5. **`config/CONSTRAINTS.md` structural requirement: children's ages stored as ranges only** — PASS.
6. **`database.md` §14: RLS policies mirror the `security.md` authorization matrix** — PASS (Round 1: PARTIAL/FAIL on `verification_status`/`publicado`/`email_verified`/`phone_verified`; closed in Round 2 via triggers layered on top of RLS).
7. **Documented judgment calls (boolean `perfil_completo`, `profiles_role_immutable` trigger + `zonas` idempotency index, nullable `perfil_ninera` fields, deferred re-review trigger)** — PASS.

## Required Changes

None blocking. Optional, non-blocking cleanup: update `README.md`'s migrations paragraph to mention `20260902000007_security_hardening.sql` next time the file is touched (Minor #1).
