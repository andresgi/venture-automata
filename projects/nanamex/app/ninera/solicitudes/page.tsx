import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { getNineraOnboardingState } from "@/lib/auth/ninera-onboarding";
import { NineraNavigation } from "@/components/ninera/ninera-navigation";
import { NineraPlaceholder } from "@/components/ninera/ninera-placeholder";
export const dynamic = "force-dynamic";
export default async function NineraRequestsPage() {
  const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/login");
  const onboarding = await getNineraOnboardingState(user.id);
  if (onboarding.readError) throw new Error("No pudimos validar tu cuenta. Intenta de nuevo.");
  if (!onboarding.isNinera) redirect("/login");
  if (!onboarding.isOnboarded) redirect("/ninera/perfil");
  return <><NineraNavigation /><main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 pb-24 text-ink-900 sm:px-6 lg:ml-[248px] lg:w-[calc(100%-248px)] lg:px-10 lg:py-12"><h1 className="text-h1">Mis solicitudes</h1><NineraPlaceholder title="Mis solicitudes" description="Aquí podrás consultar solicitudes de familias cuando esta sección esté disponible." /></main></>;
}
