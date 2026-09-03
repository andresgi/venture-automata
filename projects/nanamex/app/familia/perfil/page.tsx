import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { listZonas } from "@/lib/zonas/queries";
import { PerfilFamiliarForm } from "@/components/familia/perfil-familiar-form";

/**
 * FAM-01 "Onboarding perfil familiar" (design/UI-SPEC.md FAM-01; design/journeys.md
 * J-FAM-1 step 4; design/screen-inventory.md). Standard short form pattern (same as
 * AUTH-02): centered column, nombre + zona (autocomplete against `zonas`).
 *
 * Reachable both as first-time onboarding (via `/familia`'s FAM-01 gate, see
 * app/familia/page.tsx) and as a re-visitable edit screen afterwards (this page pre-fills
 * from any existing `perfil_familiar` row and upserts on save) — `UI-SPEC.md`/
 * `screen-inventory.md` don't describe a separate edit surface for `perfil_familiar`
 * elsewhere (e.g. FAM-13 "Cuenta" only covers verification status/entitlements/security),
 * so this route doubles as both.
 *
 * Forced dynamic for the same reason as app/verificar/page.tsx: this page reads the
 * caller's own session/profile/perfil_familiar on every request, which must never be
 * attempted during `next build`'s static generation (no real request/cookie context, and
 * NEXT_PUBLIC_SUPABASE_* env vars are intentionally not baked into the build — see
 * engineering/architecture.md §13).
 */
export const dynamic = "force-dynamic";

export default async function FamiliaPerfilPage() {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const db = createServiceRoleClient();

  const [{ data: profile }, { data: perfilFamiliar }, zonas] = await Promise.all([
    db.from("profiles").select("nombre").eq("id", user.id).maybeSingle(),
    db.from("perfil_familiar").select("zona_id").eq("profile_id", user.id).maybeSingle(),
    listZonas(),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg p-4 text-center sm:p-5 lg:p-8">
      <h1 className="text-h1 text-ink-900">Cuéntanos un poco de tu familia</h1>

      <PerfilFamiliarForm
        zonas={zonas}
        defaultNombre={(profile?.nombre as string | undefined) ?? ""}
        defaultZonaId={(perfilFamiliar?.zona_id as string | undefined) ?? null}
      />
    </main>
  );
}
