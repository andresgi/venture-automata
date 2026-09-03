"use server";

import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { phoneOtpCodeSchema } from "@/lib/auth/validation";
import { sendVerificationCode, checkVerificationCode, TwilioVerifyError } from "@/lib/twilio/verify";

/**
 * AUTH-03 teléfono OTP send/confirm (design/UX-spec.md AUTH-03; PRD §5 "Verificación de
 * teléfono"; engineering/architecture.md §6). Phone verification is a soft gate on an
 * already-logged-in session (correo is the hard login gate, per the E0-04 gating
 * redefinition -- agent/DECISIONS.md, 2026-09-02) -- both actions below require a real
 * session (via the cookie-aware `createServerSupabaseClient`) and write only
 * phone-related columns via the service-role client (never `email_verified`), so a wrong/
 * expired code can never disturb the correo verification state (this story's acceptance
 * criterion).
 */

const GENERIC_SEND_ERROR = "No se pudo enviar el código. Intenta de nuevo.";
const SEND_RATE_LIMITED_MESSAGE =
  "Alcanzaste el límite de envíos de Twilio. Espera unos minutos antes de volver a intentar.";
const INVALID_PHONE_MESSAGE = "No se pudo enviar el código a este número de teléfono.";
const GENERIC_CONFIRM_ERROR = "No se pudo verificar el código. Intenta de nuevo.";
const CHECK_RATE_LIMITED_MESSAGE = "Alcanzaste el límite de intentos. Solicita un nuevo código.";
const INVALID_CODE_MESSAGE = "El código es incorrecto o ya expiró.";
const INVALID_CODE_FORMAT_MESSAGE = "Ingresa el código de 6 dígitos.";

/** AUTH-03's "Reenviar código ... e.g. 60s" (design/UX-spec.md). App-layer defense-in-depth
 * on top of (not instead of) Twilio Verify's own native rate limiting/lockout, per
 * engineering/security.md's OTP-brute-force row. */
const RESEND_COOLDOWN_SECONDS = 60;

export interface SendPhoneOtpActionState {
  status: "idle" | "sent" | "cooldown" | "error";
  message?: string;
  /** Only set on `status: "cooldown"` -- lets the UI resume a live countdown after a page
   * reload without a second server round trip. */
  cooldownSecondsRemaining?: number;
}


async function getCurrentUserId(): Promise<string | null> {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  return user?.id ?? null;
}

/**
 * Sends (or resends) the teléfono OTP for the logged-in user's own phone number. Enforces
 * the app-layer resend cooldown before ever calling Twilio; on an actual Twilio send, stamps
 * `profiles.phone_otp_last_sent_at` (service-role write -- this column, like
 * `phone_verified`, is blocked from non-privileged client writes by
 * `profiles_protect_system_fields`, db/migrations/20260902000009_profiles_phone_otp_cooldown.sql).
 */
// useActionState requires the (prevState, formData) signature; this action has no per-call
// form input (it always acts on the logged-in user's own phone number), hence both unused.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function sendPhoneOtpAction(_prevState: SendPhoneOtpActionState, _formData: FormData): Promise<SendPhoneOtpActionState> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { status: "error", message: GENERIC_SEND_ERROR };
  }

  const db = createServiceRoleClient();
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("phone, phone_verified, phone_otp_last_sent_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile?.phone) {
    return { status: "error", message: GENERIC_SEND_ERROR };
  }

  // Already verified -- nothing to send. Treated as a quiet success (not an error) so a
  // stale/duplicate form submission (e.g. double-click, back-button resubmit) never surfaces
  // a confusing message once teléfono is already confirmed.
  if (profile.phone_verified) {
    return { status: "sent" };
  }

  if (profile.phone_otp_last_sent_at) {
    const elapsedSeconds =
      (Date.now() - new Date(profile.phone_otp_last_sent_at as string).getTime()) / 1000;
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      return {
        status: "cooldown",
        cooldownSecondsRemaining: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds),
        message: "Espera antes de solicitar otro código.",
      };
    }
  }

  try {
    await sendVerificationCode(profile.phone as string);
  } catch (error) {
    if (error instanceof TwilioVerifyError) {
      if (error.reason === "rate_limited") {
        return { status: "error", message: SEND_RATE_LIMITED_MESSAGE };
      }
      if (error.reason === "invalid_phone") {
        return { status: "error", message: INVALID_PHONE_MESSAGE };
      }
    }
    return { status: "error", message: GENERIC_SEND_ERROR };
  }

  // Only ever touches phone_otp_last_sent_at -- never email_verified/phone_verified here.
  await db
    .from("profiles")
    .update({ phone_otp_last_sent_at: new Date().toISOString() })
    .eq("id", userId);

  return { status: "sent" };
}

export interface ConfirmPhoneOtpActionState {
  status: "idle" | "verified" | "error";
  message?: string;
}


/**
 * Confirms a submitted teléfono OTP code. On a correct, unexpired code, sets
 * `profiles.phone_verified = true` via the service-role client (same privileged write path
 * as `app/auth/confirm/route.ts`'s `email_verified` write -- required by
 * `profiles_protect_system_fields`). On an invalid/expired code, returns an inline error and
 * never touches any other column -- `email_verified` is structurally untouched by this
 * action (this story's acceptance criterion).
 */
export async function confirmPhoneOtpAction(
  _prevState: ConfirmPhoneOtpActionState,
  formData: FormData
): Promise<ConfirmPhoneOtpActionState> {
  const parsed = phoneOtpCodeSchema.safeParse(formData.get("code"));
  if (!parsed.success) {
    return { status: "error", message: INVALID_CODE_FORMAT_MESSAGE };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { status: "error", message: GENERIC_CONFIRM_ERROR };
  }

  const db = createServiceRoleClient();
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("phone, phone_verified")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile?.phone) {
    return { status: "error", message: GENERIC_CONFIRM_ERROR };
  }

  if (profile.phone_verified) {
    return { status: "verified" };
  }

  let approved: boolean;
  try {
    approved = await checkVerificationCode(profile.phone as string, parsed.data);
  } catch (error) {
    if (error instanceof TwilioVerifyError && error.reason === "rate_limited") {
      return { status: "error", message: CHECK_RATE_LIMITED_MESSAGE };
    }
    return { status: "error", message: GENERIC_CONFIRM_ERROR };
  }

  if (!approved) {
    return { status: "error", message: INVALID_CODE_MESSAGE };
  }

  const { error: updateError } = await db
    .from("profiles")
    .update({ phone_verified: true })
    .eq("id", userId);

  if (updateError) {
    return { status: "error", message: GENERIC_CONFIRM_ERROR };
  }

  return { status: "verified" };
}
