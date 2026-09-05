import { createServiceRoleClient } from "@/lib/supabase/server";

type NineraOnboardingProfile = {
  role: string;
  account_status: string;
};

/**
 * Mirrors `lib/auth/familia-onboarding.ts`'s `getFamiliaOnboardingState` for the niñera
 * side (NIN-01/02 gate on `/ninera`, same pattern as FAM-01's gate on `/familia`). "Onboarded"
 * here means `perfil_completo = true`, not merely "a `perfil_ninera` row exists" -- the
 * row is created progressively as soon as the wizard's first step is saved (nullable
 * columns, see `20260902000006_perfil_ninera.sql`), so its mere existence doesn't mean the
 * required fields are actually set.
 */
export async function getNineraOnboardingState(userId: string) {
  const db = createServiceRoleClient();
  const [profileResult, perfilNineraResult] = await Promise.all([
    db.from("profiles").select("role, account_status").eq("id", userId).maybeSingle(),
    db.from("perfil_ninera").select("perfil_completo").eq("profile_id", userId).maybeSingle(),
  ]);

  if (profileResult.error) {
    console.error("getNineraOnboardingState: failed to read profile", { code: profileResult.error.code });
  }
  if (perfilNineraResult.error) {
    console.error("getNineraOnboardingState: failed to read perfil_ninera", { code: perfilNineraResult.error.code });
  }

  const typedProfile = profileResult.data as NineraOnboardingProfile | null;
  return {
    readError: Boolean(profileResult.error || perfilNineraResult.error),
    isNinera: typedProfile?.role === "ninera" && typedProfile.account_status === "activa",
    isOnboarded: Boolean(perfilNineraResult.data?.perfil_completo),
    profile: typedProfile,
  };
}
