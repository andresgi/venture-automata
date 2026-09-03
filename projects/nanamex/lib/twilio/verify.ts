import "server-only";
import twilio from "twilio";

/**
 * Twilio Verify wrapper (E0-05; engineering/architecture.md §6, §14; engineering/security.md
 * §1's OTP-brute-force row). Phone verification is a trust attribute of `profiles`, not a
 * second login method -- Twilio Verify owns OTP generation/expiry/resend-cooldown/rate-
 * limiting natively; this module only wraps its Verify V2 API and never re-implements that
 * lifecycle itself (architecture.md §6).
 *
 * Client construction is intentionally lazy (only happens inside `getClient()`, called from
 * `sendVerificationCode`/`checkVerificationCode`) rather than at module load time, so this
 * module can be safely imported in any environment (tests, local dev without Twilio
 * credentials configured yet -- see .env.example, still empty as of E0-05) without crashing
 * at import time. It still fails loudly -- an explicit thrown `Error`, not a silent no-op --
 * the moment someone actually tries to send/check an OTP with missing credentials, so a real
 * production misconfiguration is never hidden.
 */

let cachedClient: ReturnType<typeof twilio> | null = null;
let cachedServiceSid: string | null = null;

function getClient(): { client: ReturnType<typeof twilio>; serviceSid: string } {
  if (cachedClient && cachedServiceSid) {
    return { client: cachedClient, serviceSid: cachedServiceSid };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    throw new Error(
      "Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_VERIFY_SERVICE_SID " +
        "environment variable -- see .env.example. Twilio Verify cannot send or check an " +
        "OTP without all three configured."
    );
  }

  cachedClient = twilio(accountSid, authToken);
  cachedServiceSid = serviceSid;
  return { client: cachedClient, serviceSid };
}

/**
 * Reasons a Twilio Verify call failed, coarse enough for the calling server action to pick a
 * safe user-facing message (engineering/security.md: "rate-limit/error passthrough from
 * Twilio is mapped to a safe user-facing message not a raw exception") without leaking raw
 * Twilio error text.
 *
 * ASSUMPTION FLAGGED FOR REVIEWER ATTENTION: the exact HTTP status / Twilio error `code`
 * values below (60200-series for send/check limits, 21211/60205 for a rejected phone number,
 * 404/20404 for a check against an expired/already-resolved verification) are Twilio's
 * documented Verify V2 API behavior, but this project has no real Twilio credentials yet
 * (.env.example's TWILIO_* vars are still empty -- see agent/STATE.md) and this could not be
 * empirically verified against the live API. All tests mock the Twilio SDK per this story's
 * own validation note ("mock Twilio in tests (no real SMS sent in CI)"). A manual smoke test
 * against Twilio's test credentials, called for by this story's Validation section, should
 * confirm these mappings before first prod use.
 */
export type TwilioVerifyErrorReason = "rate_limited" | "invalid_phone" | "unknown";

export class TwilioVerifyError extends Error {
  readonly reason: TwilioVerifyErrorReason;

  constructor(message: string, reason: TwilioVerifyErrorReason) {
    super(message);
    this.name = "TwilioVerifyError";
    this.reason = reason;
  }
}

// Twilio Verify error codes documented as attempt/rate limits on the send or check side
// (max send attempts, max check attempts, too many concurrent requests). See the flagged
// assumption above.
const RATE_LIMIT_ERROR_CODES = new Set([60202, 60203, 60212, 60223]);
// Documented as "invalid/unreachable phone number for this channel" (invalid parameter,
// landline can't receive SMS).
const INVALID_PHONE_ERROR_CODES = new Set([60200, 60205, 21211]);

function extractTwilioField(error: unknown, field: "code" | "status"): number | undefined {
  if (error && typeof error === "object" && field in error) {
    const value = (error as Record<string, unknown>)[field];
    return typeof value === "number" ? value : undefined;
  }
  return undefined;
}

function toTwilioVerifyError(error: unknown): TwilioVerifyError {
  const code = extractTwilioField(error, "code");
  const status = extractTwilioField(error, "status");

  if ((code && RATE_LIMIT_ERROR_CODES.has(code)) || status === 429) {
    return new TwilioVerifyError("Twilio Verify rate limit or lockout reached.", "rate_limited");
  }

  if (code && INVALID_PHONE_ERROR_CODES.has(code)) {
    return new TwilioVerifyError("Twilio Verify rejected the phone number.", "invalid_phone");
  }

  const message = error instanceof Error ? error.message : "Unknown Twilio Verify error.";
  return new TwilioVerifyError(message, "unknown");
}

/**
 * Sends (or re-sends) an OTP via SMS to `phoneE164`. Throws `TwilioVerifyError` on failure --
 * never a raw Twilio SDK exception -- so callers can pattern-match `.reason` for a safe
 * message. Does not implement its own resend cooldown; that is this project's own
 * defense-in-depth layer (per security.md), enforced by the caller (actions/
 * phone-verification.ts), in addition to (not instead of) Twilio's own native throttling.
 */
export async function sendVerificationCode(phoneE164: string): Promise<void> {
  const { client, serviceSid } = getClient();

  try {
    await client.verify.v2.services(serviceSid).verifications.create({
      to: phoneE164,
      channel: "sms",
    });
  } catch (error) {
    throw toTwilioVerifyError(error);
  }
}

/**
 * Checks a submitted OTP code for `phoneE164`. Resolves `true` only when Twilio reports the
 * verification as `approved`. Resolves `false` (not a throw) for a wrong code with attempts
 * remaining (Twilio Verify's documented behavior: HTTP 200, `status: "pending"`) *and* for a
 * check against an already-expired/already-resolved verification (documented as an HTTP 404
 * "not found" from Twilio) -- design/UX-spec.md AUTH-03 only needs a single "invalid/expired"
 * inline message either way, not a distinction between the two. Throws `TwilioVerifyError`
 * only for genuine failures (rate limit/lockout, transport/auth errors).
 */
export async function checkVerificationCode(
  phoneE164: string,
  code: string
): Promise<boolean> {
  const { client, serviceSid } = getClient();

  try {
    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phoneE164, code });
    return check.status === "approved";
  } catch (error) {
    if (extractTwilioField(error, "status") === 404) {
      return false;
    }
    throw toTwilioVerifyError(error);
  }
}
