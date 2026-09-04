import { createServiceRoleClient } from "@/lib/supabase/server";

type FamiliaOnboardingProfile = {
  role: string;
  account_status: string;
  email_verified: boolean;
  phone_verified: boolean;
};

/**
 * Reads the server-owned state that determines whether family destinations may be used.
 * Keep this check in one place because service-role reads bypass RLS.
 */
export async function getFamiliaOnboardingState(userId: string) {
  const db = createServiceRoleClient();
  const [profileResult, familiaProfileResult] = await Promise.all([
    db.from("profiles").select("role, account_status, email_verified, phone_verified").eq("id", userId).maybeSingle(),
    db.from("perfil_familiar").select("profile_id").eq("profile_id", userId).maybeSingle(),
  ]);

  if (profileResult.error) {
    console.error("getFamiliaOnboardingState: failed to read profile", { code: profileResult.error.code });
  }
  if (familiaProfileResult.error) {
    console.error("getFamiliaOnboardingState: failed to read family profile", { code: familiaProfileResult.error.code });
  }

  const typedProfile = profileResult.data as FamiliaOnboardingProfile | null;
  return {
    isFamilia: typedProfile?.role === "familia" && typedProfile.account_status === "activa",
    isOnboarded: Boolean(familiaProfileResult.data),
    profile: typedProfile,
  };
}
