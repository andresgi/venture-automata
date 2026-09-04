import { beforeEach, describe, expect, it, vi } from "vitest";

const profileResult = { data: null as unknown, error: null as { code: string } | null };
const familiaProfileResult = { data: null as unknown, error: null as { code: string } | null };

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => table === "profiles" ? profileResult : familiaProfileResult }),
      }),
    }),
  }),
}));

const { getFamiliaOnboardingState } = await import("@/lib/auth/familia-onboarding");

describe("getFamiliaOnboardingState", () => {
  beforeEach(() => {
    profileResult.data = { role: "familia", account_status: "activa", email_verified: true, phone_verified: false };
    profileResult.error = null;
    familiaProfileResult.data = { profile_id: "family-1" };
    familiaProfileResult.error = null;
    vi.restoreAllMocks();
  });

  it.each([
    ["non-family", { role: "ninera", account_status: "activa" }],
    ["inactive family", { role: "familia", account_status: "inactiva" }],
  ])("fails closed for %s accounts", async (_, profile) => {
    profileResult.data = profile;
    await expect(getFamiliaOnboardingState("user-1")).resolves.toMatchObject({ isFamilia: false, isOnboarded: true });
  });

  it("fails closed and reports profile query failures without logging the user ID", async () => {
    profileResult.data = null;
    profileResult.error = { code: "profile_unavailable" };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(getFamiliaOnboardingState("secret-user-id")).resolves.toMatchObject({ isFamilia: false, isOnboarded: true });
    expect(errorSpy).toHaveBeenCalledWith("getFamiliaOnboardingState: failed to read profile", { code: "profile_unavailable" });
    expect(errorSpy.mock.calls.flat()).not.toContain("secret-user-id");
  });

  it("fails closed and reports family-profile query failures", async () => {
    familiaProfileResult.data = null;
    familiaProfileResult.error = { code: "family_profile_unavailable" };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(getFamiliaOnboardingState("user-1")).resolves.toMatchObject({ isFamilia: true, isOnboarded: false });
    expect(errorSpy).toHaveBeenCalledWith("getFamiliaOnboardingState: failed to read family profile", { code: "family_profile_unavailable" });
  });
});
