import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ROLE_HOME_PATH, type AppRole } from "@/lib/auth/roles";

/**
 * AUTH-03's correo leg: the landing target of the confirmation email link
 * (supabase/templates/confirmation.html), using Supabase's token-hash flow —
 * `supabase.auth.verifyOtp` establishes a real session server-side (cookies set via
 * lib/supabase/auth-server.ts's cookie-aware client), matching this project's "no client-
 * side direct-to-Supabase" pattern (architecture.md §3) since a fragment-based redirect
 * (Supabase's default template) would otherwise require a client-side Supabase client just
 * to read `location.hash`.
 *
 * `profiles.email_verified` is set here (system-driven, not by any user-facing form input
 * — see db/migrations/20260902000007_security_hardening.sql, which blocks a non-privileged
 * client from setting this column directly) via the service-role client.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/verificar";

  if (tokenHash && type) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error && data.user) {
      const db = createServiceRoleClient();
      await db.from("profiles").update({ email_verified: true }).eq("id", data.user.id);

      const { data: profile } = await db
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      const role = profile?.role as AppRole | undefined;
      redirect(role ? ROLE_HOME_PATH[role] : next);
    }
  }

  redirect("/login?error=confirmacion_invalida");
}
