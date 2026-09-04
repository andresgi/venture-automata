import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let onboarded = false;
vi.mock("next/navigation", () => ({ usePathname: () => "/familia/perfil" }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: "family-1" } } }) } })),
}));
vi.mock("@/lib/auth/familia-onboarding", () => ({
  getFamiliaOnboardingState: vi.fn(async () => ({ isFamilia: true, isOnboarded: onboarded, profile: null })),
}));

const { default: FamiliaLayout } = await import("@/app/familia/layout");

describe("FamiliaLayout onboarding shell", () => {
  beforeEach(() => { onboarded = false; });

  it("does not expose persistent family destinations from the onboarding route", async () => {
    render(await FamiliaLayout({ children: <div>Perfil familiar</div> }));
    expect(screen.getByText("Perfil familiar")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cuenta" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Favoritas" })).not.toBeInTheDocument();
  });

  it("restores the approved persistent navigation after onboarding", async () => {
    onboarded = true;
    render(await FamiliaLayout({ children: <div>Perfil familiar</div> }));
    expect(screen.getAllByRole("link", { name: "Cuenta" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Favoritas" })).toHaveLength(2);
  });
});
