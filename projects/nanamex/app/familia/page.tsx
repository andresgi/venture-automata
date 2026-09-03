import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { UnauthorizedBanner } from "@/components/auth/unauthorized-banner";

// FAM-02 "Mis necesidades" (dashboard) placeholder. E0-04 only needs a real destination for
// a familia-role session to land on (registration success, login, and the middleware's own
// redirect target) -- the full screen is a later BUILD story (Epic 1+) per
// engineering/implementation-plan.md.
//
// FAM-01 gate (E1-03): a familia account with no `perfil_familiar` row yet hasn't completed
// FAM-01 "Onboarding perfil familiar" -- redirected there first, enforcing FAM-01's
// "required to proceed" acceptance criterion server-side rather than leaving it reachable
// only by a link a user could otherwise skip by navigating straight here (e.g. the
// /verificar "Continuar" action, or a bookmarked URL). Forced dynamic for the same reason as
// app/verificar/page.tsx: this check depends on the caller's own session on every request.
export const dynamic = "force-dynamic";

export default async function FamiliaHomePage() {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (user) {
    const db = createServiceRoleClient();
    const { data: perfilFamiliar } = await db
      .from("perfil_familiar")
      .select("profile_id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!perfilFamiliar) {
      redirect("/familia/perfil");
    }
    const { data: drafts } = await db.from("necesidades").select("id, updated_at").eq("familia_id", user.id).eq("estado", "borrador").order("updated_at", { ascending: false });
    return <FamiliaDashboard drafts={(drafts ?? []) as { id: string; updated_at: string }[]} />;
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 p-8">
      <Suspense fallback={null}>
        <UnauthorizedBanner />
      </Suspense>
      <h1 className="text-2xl font-semibold">Mis necesidades</h1>
       <a href="/familia/necesidad" className="rounded-sm bg-primary-600 px-4 py-3 text-button text-white">Crear necesidad</a>
    </main>
  );
}

function FamiliaDashboard({ drafts }: { drafts: { id: string; updated_at: string }[] }) {
  return <main className="flex min-h-screen flex-col gap-4 p-8"><Suspense fallback={null}><UnauthorizedBanner /></Suspense><h1 className="text-2xl font-semibold">Mis necesidades</h1><a href="/familia/necesidad" className="w-fit rounded-sm bg-primary-600 px-4 py-3 text-button text-white">Crear necesidad</a>{drafts.map((draft) => <article key={draft.id} className="border border-border p-4"><p className="text-body">Borrador de necesidad</p><a href={`/familia/necesidad?draft=${draft.id}`} className="text-body-sm text-primary-700">Continuar borrador</a></article>)}</main>;
}
