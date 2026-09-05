import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { getNineraOnboardingState } from "@/lib/auth/ninera-onboarding";
import { UnauthorizedBanner } from "@/components/auth/unauthorized-banner";
import { NineraNavigation } from "@/components/ninera/ninera-navigation";

// NIN-03 "Inicio" (dashboard) placeholder -- full screen is a later BUILD story (E7-04).
//
// NIN-01/02 gate (E7-01), mirroring FAM-01's gate on `/familia`
// (app/familia/page.tsx): a niñera account whose `perfil_ninera` isn't yet
// `perfil_completo` hasn't finished onboarding -- redirected to `/ninera/perfil` first,
// enforcing NIN-01/02's "required to be discoverable" acceptance criterion server-side
// rather than leaving it reachable only via a link a user could skip. Forced dynamic for
// the same reason as app/familia/page.tsx: this check depends on the caller's own session
// on every request.
export const dynamic = "force-dynamic";

export default async function NineraHomePage() {
  const {
    data: { user },
  } = await (await createServerSupabaseClient()).auth.getUser();

  if (user) {
    const onboarding = await getNineraOnboardingState(user.id);
    if (onboarding.isNinera && !onboarding.isOnboarded) {
      redirect("/ninera/perfil");
    }
  }

  return (
    <><NineraNavigation /><main className="flex min-h-screen flex-col gap-4 p-8 lg:ml-[248px]">
      <Suspense fallback={null}>
        <UnauthorizedBanner />
      </Suspense>
      <h1 className="text-2xl font-semibold">Inicio</h1>
      <p className="max-w-md text-sm text-zinc-500">
        Área niñera. Contenido completo llega en una historia de BUILD posterior.
      </p>
    </main></>
  );
}
