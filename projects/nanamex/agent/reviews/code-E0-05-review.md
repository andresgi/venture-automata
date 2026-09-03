# Code Review

Story: E0-05 — Twilio Verify integration (phone OTP)
Branch reviewed: `nanamex/e0-05-twilio-verify` (diff vs. `main`, which has E0-01–E0-04 merged)

## Verdict

PASS_WITH_MINOR_ISSUES

## Critical Issues

None.

## Important Issues

None. The implementation is correct on every acceptance-criterion axis I could verify without live Twilio credentials, and the Twilio SDK usage matches the installed package's actual type definitions (verified against `node_modules/twilio`, not just the mocks — see Correctness below).

## Minor Issues

1. **Resend-cooldown race on concurrent send requests** — `actions/phone-verification.ts:85-115` (`sendPhoneOtpAction`). The cooldown check-then-set (`select phone_otp_last_sent_at` → compare → `update`) is not atomic. Two near-simultaneous submissions (double-click before the button's `disabled={isSending}` takes effect, or two browser tabs) can both read the same stale `phone_otp_last_sent_at`, both pass the cooldown check, and both call Twilio. Low severity: Twilio Verify's own native rate limiting (the documented defense-in-depth layer per `security.md`'s OTP-brute-force row) still caps the actual abuse potential, and the UI already disables the button during `isSending`. Worth a follow-up (e.g. a conditional `update ... where phone_otp_last_sent_at is null or phone_otp_last_sent_at < now() - interval '60 seconds'` with an affected-rows check) if this becomes a real-world issue, but not a blocker for an MVP soft-gate feature.

2. **Failed Twilio send doesn't debounce the retry** — `actions/phone-verification.ts:97-109`. When `sendVerificationCode` throws (including `rate_limited`), `phone_otp_last_sent_at` is intentionally left untouched, so the very next submission skips the app-layer cooldown and immediately re-hits Twilio. This is a reasonable UX tradeoff (don't penalize the user for a transient failure) but means the app-layer cooldown provides no protection against a user who keeps retrying after repeated `rate_limited` responses — Twilio's own lockout is the only backstop in that specific path. Worth a one-line comment acknowledging this is intentional, or consider stamping the timestamp even on a `rate_limited` failure specifically (since Twilio already told you to back off).

3. **First-send-vs-resend UX interpretation is a flagged assumption, not a spec gap in this story** — `components/auth/phone-verification-form.tsx:18-31`. The developer correctly flagged that AUTH-03 only documents "Reenviar código" and inferred a manual "Enviar código" first-send button. This is reasonable and doesn't block E0-05, but agree with the developer's note: a later screen-level UX story should clarify whether the first code should auto-send on page load vs. require an explicit click, since the current behavior means a user who never clicks "Enviar código" never receives the first OTP at all despite AUTH-03's framing ("a code is already in flight by the time this screen renders").

## Security Observations

- Both server actions require a real session via `createServerSupabaseClient().auth.getUser()` before touching anything (`actions/phone-verification.ts:43-49`, called from both `sendPhoneOtpAction:62` and `confirmPhoneOtpAction:144`) — server-side, cookie-based, not a client-supplied identifier. No authorization bypass found.
- `phone_verified` and `phone_otp_last_sent_at` are written only through `createServiceRoleClient()` (`actions/phone-verification.ts:67, 112-115, 149, 178-181`), and the new migration (`db/migrations/20260902000009_profiles_phone_otp_cooldown.sql:22-54`) correctly extends the existing `profiles_protect_system_fields` trigger (originally defined in `20260902000007_security_hardening.sql:63-97`) via `create or replace function` — same function name, same already-attached trigger, so no duplicate/conflicting trigger and no need to re-create the trigger itself. This is the correct, minimal way to extend that guard. Confirmed the trigger's `is distinct from` comparisons correctly handle the new nullable column (NULL vs. NULL is not "distinct," so a no-op default insert doesn't spuriously fail).
- No secrets in source; `.env.example:31-34` documents `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_VERIFY_SERVICE_SID` as empty placeholders, consistent with "no real credentials yet."
- `lib/twilio/verify.ts` never leaks raw Twilio exception text to the end user — server actions only ever expose one of a small set of pre-written Spanish messages (`GENERIC_SEND_ERROR`, `SEND_RATE_LIMITED_MESSAGE`, etc.), never `error.message` from Twilio directly. Good practice per `security.md`'s "rate-limit/error passthrough ... mapped to a safe user-facing message" requirement.
- No PII (phone number, OTP code) is logged anywhere in the reviewed diff.

### Twilio SDK usage vs. real package API (not just internally-consistent mocks)

Checked against the installed `twilio` npm package's actual type definitions (`node_modules/twilio/lib/rest/verify/v2/service/verification.d.ts`, `.../verificationCheck.d.ts`, `node_modules/twilio/lib/base/RestException.d.ts`):

- `client.verify.v2.services(serviceSid).verifications.create({ to, channel: "sms" })` matches `VerificationListInstanceCreateOptions` (`to: string`, `channel: string`) exactly. ✓
- `client.verify.v2.services(serviceSid).verificationChecks.create({ to, code })` matches `VerificationCheckListInstanceCreateOptions` exactly. ✓
- Reading `check.status === "approved"` (`lib/twilio/verify.ts:144`) is correct — `VerificationCheckInstance.status: string`, documented values include `approved`/`pending`. ✓
- `import twilio from "twilio"` (`lib/twilio/verify.ts:2`) — the package's actual export is `module.exports = TwilioSDK` (a callable function), and `tsconfig.json:9` has `esModuleInterop: true`, so this default-import + `twilio(accountSid, authToken)` call pattern (`lib/twilio/verify.ts:40`) is correct against the real package, not just the test's own mock shape. ✓
- `error.code` / `error.status` field access (`extractTwilioField`, `lib/twilio/verify.ts:81-87`) matches the real `RestException` shape (`status: number` = HTTP status code, `code?: number` = Twilio's own numeric error code) — confirmed in `node_modules/twilio/lib/base/RestException.js:10-14`. Not a guess; this is the actual shape a real Twilio SDK rejection would have. ✓
- The specific numeric error-code-to-reason mappings (60202/60203/60212/60223 → rate limit, 60200/60205/21211 → invalid phone, HTTP 404 → treated as "not approved") are Twilio's documented Verify V2 behavior per the developer's own flagged assumption, and could not be empirically verified without live credentials — consistent with this story's explicit "manual smoke test before first prod use" validation note. Not a blocking concern per the task's own scope.

## Test Coverage Observations

29 new tests across `tests/lib/twilio/verify.test.ts` (14) and `tests/actions/phone-verification.test.ts` (15); full suite 83/83 passing (independently re-run, confirmed). Coverage of the negative paths called out in the review brief:

- Wrong code (Twilio `status: "pending"`) → resolves `false`, not a throw (`verify.test.ts:156-162`); surfaced as `INVALID_CODE_MESSAGE` with zero DB writes (`phone-verification.test.ts:282-297` — explicitly asserts `profilesTable.update` was never called, directly covering this story's core acceptance criterion).
- Expired/already-resolved verification (Twilio 404) → resolves `false` (`verify.test.ts:164-170`).
- Rate-limited send and check (60203/60202) → mapped to `TwilioVerifyError(reason: "rate_limited")` and then to safe user messages at the action layer (`verify.test.ts:96-110, 172-184`; `phone-verification.test.ts:177-195, 299-312`).
- Cooldown violation → `status: "cooldown"` with no Twilio call (`phone-verification.test.ts:115-133`), and the inverse (cooldown elapsed → Twilio called, only `phone_otp_last_sent_at` touched, `phone_verified`/`email_verified` explicitly asserted absent from the update payload) at `phone-verification.test.ts:135-158`.
- No-session and malformed-code paths short-circuit before touching Twilio or the DB (`phone-verification.test.ts:79-87, 236-251`).
- Already-verified idempotency (both send and confirm) covered (`phone-verification.test.ts:101-113, 253-263`).

No test explicitly exercises the concurrent-double-send race flagged in Minor Issue #1 — reasonable, since it's a known/accepted low-severity gap rather than a regression risk, and would require faking two overlapping async calls against the same mutable mock state (low value for the risk level).

## Acceptance Criterion Assessment

| Criterion | Verdict |
|---|---|
| OTP send has resend cooldown (per UX spec, e.g. 60s) | PASS — enforced app-side in `sendPhoneOtpAction` (`actions/phone-verification.ts:85-95`) strictly *before* any Twilio call, confirmed by both code inspection and `phone-verification.test.ts:115-133` (asserts `sendVerificationCodeMock` not called during cooldown). |
| Invalid/expired code shows inline error without losing correo verification state | PASS — `confirmPhoneOtpAction`'s failure path (`actions/phone-verification.ts:174-176`) performs zero database writes (only the earlier `select` executes), never touches `email_verified` or any other column, explicitly asserted by `phone-verification.test.ts:282-297`. `email_verified` is structurally unreachable from this file (never imported/referenced). |
| Success sets `profiles.phone_verified = true` | PASS — `actions/phone-verification.ts:178-181`, service-role write only, protected from non-privileged writes by the extended `profiles_protect_system_fields` trigger; covered by `phone-verification.test.ts:265-280`. |
| Mock Twilio in tests (no real SMS sent in CI) | PASS — `tests/lib/twilio/verify.test.ts:17` mocks the `twilio` module entirely; `tests/actions/phone-verification.test.ts:20-24` mocks `lib/twilio/verify` entirely. No live network calls possible in CI. |
| Manual smoke test against Twilio's test credentials before first prod use | UNCERTAIN (not yet performed — correctly out of scope for this story per its own validation note; no real Twilio credentials exist yet). Flag this as a pre-RELEASE_GATE / first-prod-use checklist item, not a gap in this review. |

## Required Changes

None required to merge. Optional follow-ups (non-blocking, can be deferred or taken as fast follow-ups):

1. Consider making the resend-cooldown check-and-stamp atomic (conditional update with an affected-rows check) to close the double-submission race in Minor Issue #1, if abuse is observed.
2. Consider whether a `rate_limited` Twilio send failure should still stamp `phone_otp_last_sent_at` so the app-layer cooldown backs off in step with Twilio's own signal (Minor Issue #2).
3. When a later screen-level UX story revisits AUTH-03, resolve whether the very first OTP should auto-send vs. require the explicit "Enviar código" click introduced here (Minor Issue #3).
4. Track "manual smoke test against Twilio test credentials before first prod use" as a pre-RELEASE_GATE checklist item, since it cannot be done until real Twilio credentials are supplied.
