"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { mapProfileWriteError } from "@/lib/supabase/db-errors";
import { registerSchema, loginSchema } from "@/lib/auth/validation";
import { ROLE_HOME_PATH, type AppRole } from "@/lib/auth/roles";

// AUTH-02's specified duplicate-account response: "inline error with a 'Iniciar sesión'
// link, not a dead-end message" (design/UX-spec.md AUTH-02). The form component renders
// the link; this action only signals that the case occurred plus a plain-text message.
const DUPLICATE_ACCOUNT_MESSAGE = "Ya existe una cuenta con este correo o teléfono.";
const GENERIC_REGISTER_ERROR = "Ocurrió un error al crear tu cuenta. Intenta de nuevo.";
const GENERIC_LOGIN_ERROR = "Correo o contraseña incorrectos.";

// AUTH-04's amended login error state (design/UX-spec.md, added 2026-09-02 alongside the
// correo hard-gate decision — see agent/DECISIONS.md): a login attempt on an account whose
// correo is not yet confirmed must show this distinct message plus a "reenviar correo"
// action, not the generic invalid-credentials error above — this is now the only place a
// user can discover they're blocked pre-confirmation (journeys.md J-FAM-1).
const EMAIL_NOT_CONFIRMED_MESSAGE = "Confirma tu correo para iniciar sesión.";

// GoTrue's stable machine-readable error codes (see
// @supabase/auth-js's `ErrorCode` union) — preferred over message-substring matching since
// wording can change across Supabase versions/locales; message matching is kept only as a
// defensive fallback for SDK/config variations that might not populate `code`.
const DUPLICATE_EMAIL_ERROR_CODES = new Set(["user_already_exists", "email_exists"]);
const EMAIL_NOT_CONFIRMED_ERROR_CODE = "email_not_confirmed";

function isDuplicateEmailError(error: { code?: string; message: string }): boolean {
  if (error.code && DUPLICATE_EMAIL_ERROR_CODES.has(error.code)) {
    return true;
  }
  const message = error.message.toLowerCase();
  return message.includes("already registered") || message.includes("already exists");
}

function isEmailNotConfirmedError(error: { code?: string; message: string }): boolean {
  if (error.code === EMAIL_NOT_CONFIRMED_ERROR_CODE) {
    return true;
  }
  return error.message.toLowerCase().includes("email not confirmed");
}

export interface RegisterActionState {
  status: "idle" | "error";
  message?: string;
  duplicate?: boolean;
  fieldErrors?: Record<string, string>;
}


function fieldErrorsFromZod(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * AUTH-02 registration (design/UX-spec.md AUTH-02; PRD §5 "Registro/login";
 * engineering/architecture.md §6/§20). Role is self-selected at registration (familia/
 * ninera only — admin has no self-registration route, enforced independently by the
 * `profiles_insert_own` RLS policy's `role in ('familia', 'ninera')` check, per
 * db/migrations/20260902000007_security_hardening.sql).
 *
 * Note on immutability: this action only ever *inserts* a profiles row, never updates
 * `role` afterwards — there is no code path here (or anywhere else in this project) that
 * updates `profiles.role`. `mapProfileWriteError` below exists purely as defense-in-depth
 * in case a future bug ever attempts one (E0-04 acceptance criterion).
 */
export async function registerAction(
  _prevState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const parsed = registerSchema.safeParse({
    nombre: formData.get("nombre"),
    correo: formData.get("correo"),
    telefono: formData.get("telefono"),
    contrasena: formData.get("contrasena"),
    confirmarContrasena: formData.get("confirmarContrasena"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const { nombre, correo, telefono, contrasena, role } = parsed.data;
  const db = createServiceRoleClient();

  // Duplicate-phone pre-check (design/UX-spec.md AUTH-02: "duplicate-email/phone check
  // server-side"). Checked before calling signUp so a phone-only duplicate never creates
  // an auth.users row we'd then have to unwind.
  const { data: existingPhoneRow, error: phoneCheckError } = await db
    .from("profiles")
    .select("id")
    .eq("phone", telefono)
    .maybeSingle();

  if (phoneCheckError) {
    return { status: "error", message: GENERIC_REGISTER_ERROR };
  }

  if (existingPhoneRow) {
    return { status: "error", duplicate: true, message: DUPLICATE_ACCOUNT_MESSAGE };
  }

  const supabaseAuth = await createServerSupabaseClient();
  const { data: signUpData, error: signUpError } = await supabaseAuth.auth.signUp({
    email: correo,
    password: contrasena,
  });

  if (signUpError) {
    // GoTrue's explicit signal for "this email already has a confirmed account"
    // (empirically verified locally: HTTP 422, error_code "user_already_exists").
    if (isDuplicateEmailError(signUpError)) {
      return { status: "error", duplicate: true, message: DUPLICATE_ACCOUNT_MESSAGE };
    }
    return { status: "error", message: GENERIC_REGISTER_ERROR };
  }

  const user = signUpData.user;

  // Defensive fallback: some Supabase configurations signal "already registered" by
  // returning a user with an empty `identities` array instead of an explicit error (the
  // historical anti-enumeration behavior). Not observed against this project's local
  // Supabase version during manual testing, but kept as a second detection path since it
  // is Supabase's documented signal in other configurations.
  if (!user || user.identities?.length === 0) {
    return { status: "error", duplicate: true, message: DUPLICATE_ACCOUNT_MESSAGE };
  }

  const { error: profileInsertError } = await db.from("profiles").insert({
    id: user.id,
    role,
    nombre,
    phone: telefono,
  });

  if (profileInsertError) {
    const mapped = mapProfileWriteError(profileInsertError);

    // Clean up the now-orphaned auth.users row rather than leaving a stuck account with no
    // profile row. Best-effort: the DB write already failed, so surfacing a second error
    // here would not help the user recover.
    await db.auth.admin.deleteUser(user.id).catch(() => {});

    if (mapped.kind === "duplicate_profile") {
      return { status: "error", duplicate: true, message: DUPLICATE_ACCOUNT_MESSAGE };
    }

    // `role_immutable` cannot fire on INSERT (the trigger only runs on UPDATE) and
    // "unknown" both fall back to the same generic, non-leaking message — the point of
    // mapProfileWriteError is to guarantee neither case ever reaches the user as a raw
    // database error / unhandled 500.
    return { status: "error", message: GENERIC_REGISTER_ERROR };
  }

  redirect("/verificar");
}

export interface LoginActionState {
  status: "idle" | "error";
  message?: string;
  /** Set only when the login failure is specifically "email not confirmed" (AUTH-04's
   * amended error state, design/UX-spec.md). Carries the submitted correo so the form can
   * offer a "reenviar correo" action without asking the user to retype it. */
  unconfirmedEmail?: string;
}


/** AUTH-04 login (design/screen-inventory.md AUTH-04). Redirects to the account's own role
 * home (`/familia`, `/ninera`, `/admin` — see lib/auth/roles.ts), or back to the originally
 * requested `next` path if it belongs to that same role's route group (SYS-02 session-
 * expiry pattern: return the user where they were headed, per UX-spec.md Part C). */
export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    correo: formData.get("correo"),
    contrasena: formData.get("contrasena"),
  });

  if (!parsed.success) {
    return { status: "error", message: GENERIC_LOGIN_ERROR };
  }

  const supabaseAuth = await createServerSupabaseClient();
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: parsed.data.correo,
    password: parsed.data.contrasena,
  });

  if (error || !data.user) {
    // AUTH-04's one non-standard deviation (design/UX-spec.md, added 2026-09-02 alongside
    // the correo hard-gate decision): correo is a hard login gate under
    // `enable_confirmations = true` (supabase/config.toml), so this is a very common first
    // login attempt, not an edge case — surfacing it distinctly (with a resend action) is
    // the only way a newly-registered user learns why they can't log in yet.
    if (error && isEmailNotConfirmedError(error)) {
      return {
        status: "error",
        message: EMAIL_NOT_CONFIRMED_MESSAGE,
        unconfirmedEmail: parsed.data.correo,
      };
    }
    return { status: "error", message: GENERIC_LOGIN_ERROR };
  }

  const db = createServiceRoleClient();
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const role = profile?.role as AppRole | undefined;
  const home = role ? ROLE_HOME_PATH[role] : "/";

  const nextParam = formData.get("next");
  const target =
    role && typeof nextParam === "string" && nextParam.startsWith(ROLE_HOME_PATH[role])
      ? nextParam
      : home;

  redirect(target);
}

export interface ResendConfirmationActionState {
  status: "idle" | "sent" | "error";
  message?: string;
}


/** AUTH-04's "reenviar correo" action (design/UX-spec.md, added 2026-09-02) — lets a user
 * blocked by the correo hard gate (`EMAIL_NOT_CONFIRMED_MESSAGE` above) re-trigger
 * Supabase's confirmation email (same template/flow as registration,
 * supabase/templates/confirmation.html) without creating a new account. */
export async function resendConfirmationEmailAction(
  _prevState: ResendConfirmationActionState,
  formData: FormData
): Promise<ResendConfirmationActionState> {
  const correo = formData.get("correo");

  if (typeof correo !== "string" || correo.trim().length === 0) {
    return { status: "error", message: "No se pudo reenviar el correo. Intenta de nuevo." };
  }

  const supabaseAuth = await createServerSupabaseClient();
  const { error } = await supabaseAuth.auth.resend({ type: "signup", email: correo });

  if (error) {
    return { status: "error", message: "No se pudo reenviar el correo. Intenta de nuevo." };
  }

  return { status: "sent", message: "Te reenviamos el correo de confirmación." };
}
