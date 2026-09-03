import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ROLE_HOME_PATH, type AppRole } from "@/lib/auth/roles";
import { PhoneVerificationForm } from "@/components/auth/phone-verification-form";

/**
 * AUTH-03 "Verificación de correo/teléfono" (design/UX-spec.md AUTH-03). Correo is confirmed
 * out-of-band before any session can exist at all (the E0-04 hard-gate redefinition,
 * agent/DECISIONS.md 2026-09-02) -- reaching this page at all means correo is already
 * verified, so this screen only has one real checklist item left to complete: teléfono
 * (E0-05, Twilio Verify OTP).
 *
 * Forced dynamic: this page reads the caller's own session/profile on every request (whether
 * teléfono is already verified determines whether it redirects away at all) -- it must never
 * be attempted as part of `next build`'s static generation, which runs without a real
 * request/cookie context and would otherwise fail the build the moment
 * NEXT_PUBLIC_SUPABASE_* env vars aren't set at build time (they're intentionally *not*
 * baked into the build in this project -- see engineering/architecture.md §13, per-
 * environment Vercel env vars).
 */
export const dynamic = "force-dynamic";

export default async function VerificarPage() {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const db = createServiceRoleClient();
  const { data: profile } = await db
    .from("profiles")
    .select("role, phone_verified")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role as AppRole | undefined;

  // Teléfono is a soft gate (design/UX-spec.md AUTH-03 gating note) -- once verified, there
  // is nothing left to do on this screen; proceed straight to the role's own home.
  if (profile?.phone_verified) {
    redirect(role ? ROLE_HOME_PATH[role] : "/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-semibold">Verifica tu cuenta</h1>

      <div className="flex w-full max-w-sm flex-col gap-6 text-left">
        <section className="flex items-center gap-2 text-sm text-emerald-700" aria-label="Correo">
          <span aria-hidden>✓</span>
          <span>Correo verificado</span>
        </section>

        <section aria-label="Teléfono">
          <h2 className="mb-1 text-sm font-medium">Teléfono</h2>
          <p className="mb-3 text-sm text-zinc-500">
            Te enviaremos un código de 6 dígitos por SMS para confirmar tu número.
          </p>
          <PhoneVerificationForm />
        </section>

        {/*
         * AUTH-03's real "Continuar" primary action (design/UI-SPEC.md AUTH-03: "enabled
         * even with one row pending (soft gate per UX Decision)"). Distinct from the OTP
         * checklist row's own "Verificar" submit button above -- this one always proceeds
         * to the role's home regardless of teléfono state, since teléfono is a soft gate
         * (design/journeys.md J-FAM-1, design/UX-spec.md AUTH-03 gating note). A plain link
         * is sufficient here (no mutation, just navigation), so this stays a Server
         * Component with no client-side form/state needed.
         */}
        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-6">
          <a
            href={role ? ROLE_HOME_PATH[role] : "/"}
            className="flex h-11 items-center justify-center bg-zinc-900 text-sm font-medium text-white"
          >
            Continuar
          </a>
          <p className="text-center text-sm text-zinc-500">
            Podrás usar Clin ahora; necesitarás verificar ambos antes de contactar a una
            candidata.
          </p>
        </div>
      </div>
    </main>
  );
}
