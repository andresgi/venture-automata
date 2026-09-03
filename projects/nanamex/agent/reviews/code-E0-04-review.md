# Code Review

Story: E0-04 — Auth wiring: Supabase Auth + role-based middleware
Branch reviewed: `nanamex/e0-04-auth-wiring` vs. base `nanamex/e0-03-core-schema-migration`
(diff was working-tree/untracked changes on top of the shared `4b2d889` commit — no new
commits on the branch yet).

This review includes one revision cycle: the initial pass (below, superseded) returned
REVISE for a missing AUTH-04 login error state; the Developer addressed it and this
document was updated after independently re-verifying the fix.

## Verdict

PASS_WITH_MINOR_ISSUES

The originally-blocking gap (AUTH-04's "confirma tu correo" / "reenviar correo" login
error state) has been implemented and independently verified — both the error
classification in `actions/auth.ts` and the UI in `components/auth/login-form.tsx` are
genuinely wired, not superficial. All four acceptance criteria pass. Two of three prior
minor issues were also addressed (duplicate-email detection now prefers `error.code`;
`duplicate_phone` renamed to `duplicate_profile` for accuracy). One minor issue remains,
deliberately left as a tracked, non-blocking item (see Minor Issues #1). Full independent
validation (lint, typecheck, build, secret scan, `npm ci --dry-run`/lockfile consistency,
full test suite) all pass on the current state of the branch.

## Critical Issues

None.

## Important Issues

None remaining. (The previously-blocking issue — AUTH-04's login error state — is resolved;
see "Resolution of Prior Important Issue" below.)

## Minor Issues

1. **Orphaned `auth.users` row if `deleteUser` cleanup itself fails.**
   `actions/auth.ts` lines 148–165: if `profiles` insert fails for a reason other than the
   phone/PK unique violation (e.g. a transient DB error) and the subsequent
   `auth.admin.deleteUser` best-effort cleanup also fails, the user is left with an
   `auth.users` row and no `profiles` row — a future registration attempt with the same
   email is rejected as "already exists" with no way to complete registration or log in
   (no profile ⇒ `loginAction`'s role lookup returns `undefined` ⇒ redirects to `/` with no
   explanation). Low-probability edge case; left as-is by the Developer per this review's
   own prior framing that it's track-only, not blocking. Still worth a backlog note (e.g.
   an admin recovery path or reconciliation job) so it isn't forgotten entirely.
2. `tests/actions/auth.test.ts` — the previously-flagged unused-`_row`-parameter ESLint
   warning is fixed (the mock now consumes the parameter via `void row`); `npm run lint` is
   fully clean. No outstanding lint issues.

## Resolution of Prior Important Issue — AUTH-04 login error state

Re-read `actions/auth.ts` and `components/auth/login-form.tsx` in full after the
Developer's fix and independently verified the wiring is real, not cosmetic:

- `actions/auth.ts` lines 39–44: `isEmailNotConfirmedError` checks
  `error.code === "email_not_confirmed"` first (GoTrue's actual stable error code for this
  case), falling back to a message-text check only as a defensive secondary path — correct
  priority order.
- `actions/auth.ts` lines 204–218 (`loginAction`): on a `signInWithPassword` failure, now
  branches specifically on `isEmailNotConfirmedError(error)` and returns
  `{ status: "error", message: EMAIL_NOT_CONFIRMED_MESSAGE, unconfirmedEmail: parsed.data.correo }`
  instead of falling through to the generic invalid-credentials message. All other errors
  still correctly fall through to `GENERIC_LOGIN_ERROR` (verified via the "returns a generic
  error on invalid credentials" test still passing unchanged).
- `actions/auth.ts` lines 252–270: new `resendConfirmationEmailAction` guards against an
  empty/missing `correo` before touching the network, then calls
  `supabaseAuth.auth.resend({ type: "signup", email: correo })` — the correct GoTrue API for
  re-sending a signup confirmation, reusing the existing cookie-aware
  `createServerSupabaseClient` seam (consistent with the rest of the file's server-side-only
  pattern). Errors are mapped to a generic, non-leaking message (`"No se pudo reenviar el
  correo. Intenta de nuevo."`), not a raw exception.
- `components/auth/login-form.tsx` lines 16–41: a genuinely separate `ResendConfirmationEmail`
  subcomponent with its own `useActionState`, rendered conditionally
  (`state.unconfirmedEmail ? <ResendConfirmationEmail .../> : null`, lines 80–82) — correctly
  avoids the "conditional hook call" bug a naive inline implementation could have introduced.
  The hidden `correo` field is pre-filled from `state.unconfirmedEmail` (the value the user
  already submitted), so the resend action doesn't require retyping the email. Button states
  (default "Reenviar correo" / pending "Reenviando…" / sent "Correo reenviado", disabled once
  sent) are sensible and match the "Reenviar código... con cooldown" *pattern* already
  established for the teléfono OTP leg elsewhere in AUTH-03, though no explicit cooldown
  timer is implemented here — acceptable for V1 given Supabase's own resend endpoint applies
  its own rate limiting server-side; a client-side cooldown display would be a nice-to-have,
  not a spec requirement (design/UX-spec.md AUTH-04 only specifies the *message* + *action*,
  not a cooldown UI, for this specific error state).
- No email-enumeration regression introduced: the resend action is only reachable after a
  login attempt already told the user (via GoTrue) that this exact email exists but is
  unconfirmed, so surfacing a resend action here reveals nothing new; a failed resend returns
  a generic error, not an existence signal.
- `lib/supabase/db-errors.ts`: `duplicate_phone` → `duplicate_profile` rename is applied
  consistently everywhere it's referenced (`actions/auth.ts` line 156's check updated to
  match; no stale references to the old name remain — verified via re-read of both files).
- Tests: `tests/actions/auth.test.ts` adds meaningful, non-trivial coverage — an
  `error.code`-based email-not-confirmed test, a message-fallback-only variant (confirms the
  fallback path independently of the primary path), and three `resendConfirmationEmailAction`
  cases (success calls `resend` with the exact expected args, a Supabase-side failure maps to
  a graceful error, and an empty `correo` short-circuits without calling `resend` at all).
  These test the actual behavior change, not just that the function doesn't throw.

This closes the only Important Issue from the prior review pass. Nothing about this fix
regresses any previously-verified behavior — confirmed via full independent re-run below.

## Security Observations

(Unchanged from the prior pass except where noted; re-verified against the current code.)

- **Service-role key isolation** — `server-only` guards remain in place on
  `lib/supabase/server.ts` and `lib/supabase/auth-server.ts`; re-grepped the tree for any
  `"use client"` file referencing `createServiceRoleClient`/`SUPABASE_SERVICE_ROLE_KEY` —
  none found, including in the new `resendConfirmationEmailAction`/`ResendConfirmationEmail`
  code (correctly uses only the cookie-aware anon-key client, never the service-role client).
- **Role gating** (`proxy.ts` + `lib/auth/route-access.ts`), **role immutability**
  (`actions/auth.ts` never updates `profiles.role`; `db-errors.ts` maps the trigger's
  rejection safely), and **`email_verified`/`phone_verified` never settable from user
  input** — all unchanged by this fix and re-verified against the current file contents.
- **No new open-redirect or enumeration surface** introduced by the resend action (see
  "Resolution of Prior Important Issue" above).
- Independently re-ran `npm run check:secrets` — passes, no server-only secret exposed
  client-side.

## Test Coverage Observations

- Full suite independently re-run on the current branch state: **54/54 tests passing
  across 8 files** (up from 48, consistent with the Developer's reported delta of 6 new
  tests: 2 for `email_not_confirmed` detection, 1 for `error.code`-based duplicate-email
  detection, 3 for `resendConfirmationEmailAction`).
- `npm run lint` — clean, no warnings (the prior unused-`_row` warning is fixed).
- `npm run typecheck` — clean (`next typegen && tsc --noEmit`).
- `npm run build` (`next build`) — succeeds; route table unchanged (`/login`, `/admin/login`,
  `/registro`, `/verificar`, `/familia`, `/ninera`, `/admin`, `/auth/confirm`, proxy/
  middleware all present as before).
- `npm ci --dry-run` and a direct comparison of `package.json`'s `dependencies` block
  against `package-lock.json`'s root `packages[""].dependencies` — lockfile is in sync,
  including the previously-added `@supabase/ssr`/`zod` entries; no drift introduced by this
  round's changes.
- All previously-existing tests (`tests/proxy.test.ts`, `tests/lib/auth/route-access.test.ts`,
  `tests/lib/auth/phone.test.ts`, `tests/lib/auth/validation.test.ts`,
  `tests/lib/supabase/db-errors.test.ts`) still pass unchanged — no regression from this
  round's edits.

## Acceptance Criteria Assessment

1. **A familia account cannot load any `/ninera/*` or `/admin/*` route (server-side
   redirect with the neutral banner).** — PASS. Unchanged from prior pass; re-verified
   `proxy.ts`/`lib/auth/route-access.ts` and re-ran `tests/proxy.test.ts` /
   `tests/lib/auth/route-access.test.ts`.

2. **Duplicate email/phone registration is rejected with the specified inline error +
   "Iniciar sesión" link.** — PASS. Duplicate-email detection is now more robust
   (`error.code` preferred over message matching); `components/auth/register-form.tsx`
   still renders the "Iniciar sesión" link when `state.duplicate` is true.

3. **Role is immutable post-registration (no UI or API path to change it).** — PASS.
   Unchanged; no code path updates `profiles.role`; `db-errors.ts`'s renamed
   `duplicate_profile` kind is applied consistently and doesn't affect this guarantee.

4. **Validation: integration test covering registration → role-mismatched route →
   redirect + banner; duplicate-registration test.** — PASS. Both tests remain present and
   meaningful; additional tests now also cover the AUTH-04 login error state and resend
   action, strengthening overall coverage beyond the minimum bar.

## Required Changes

None blocking. Optional follow-up (non-blocking, can be a backlog item rather than a
condition of merging this story): track the orphaned-`auth.users`-row edge case (Minor
Issue #1) for a future reconciliation/admin-recovery mechanism.
