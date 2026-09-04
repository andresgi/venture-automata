import { FamiliaNavigation } from "@/components/familia/familia-navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { getFamiliaOnboardingState } from "@/lib/auth/familia-onboarding";

/** Shared FAM shell: the navigation stays available across every family surface. */
export default async function FamiliaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
  const onboarding = user ? await getFamiliaOnboardingState(user.id) : null;

  return (
    <div className="min-h-screen bg-bg">
      <FamiliaNavigation showDestinations={Boolean(onboarding?.isFamilia && onboarding.isOnboarded)} />
      <div className="pb-20 lg:ml-[248px] lg:pb-0">{children}</div>
    </div>
  );
}
