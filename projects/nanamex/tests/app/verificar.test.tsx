import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// E1-02 integration test: AUTH-03's soft-gate behavior per design/journeys.md J-FAM-1
// (post E0-04's correo-hard-gate/teléfono-soft-gate redefinition, agent/DECISIONS.md
// 2026-09-02) and design/UI-SPEC.md AUTH-03 ("Continuar" primary button, "enabled even
// with one row pending"). Exercises the real `/verificar` Server Component end-to-end
// (session lookup -> profile lookup -> render/redirect decision), mocking only the two
// Supabase-touching seams (auth session, profile row) -- same pattern as
// tests/proxy.test.ts and tests/actions/auth.test.ts.
//
// What this test can and cannot prove, per this story's scope note: it proves a familia
// user with teléfono unverified is not blocked from proceeding into the app (the
// `/verificar` screen itself offers a working "Continuar" path to `/familia`, and
// separately, tests/proxy.test.ts + lib/auth/route-access.ts already establish that the
// role-based route gate never even checks `phone_verified`). It does NOT and cannot test
// FAM-01 (not built yet, E1-03) or a server-side `Contactar`/entitlement block (not built
// yet, E5-01) -- those are out of reach until their owning stories exist.

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

let mockUser: { id: string } | null = { id: "user-1" };
const getUserMock = vi.fn(async () => ({ data: { user: mockUser } }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: getUserMock } })),
}));

let mockProfile: { role: string; phone_verified: boolean } | null = null;
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: mockProfile })),
        })),
      })),
    })),
  })),
}));

const { default: VerificarPage } = await import("@/app/verificar/page");

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  });
  mockUser = { id: "user-1" };
  mockProfile = null;
});

describe("VerificarPage (AUTH-03 soft-gate)", () => {
  it("a familia user with teléfono NOT verified is not redirected away, and can reach /familia via a working 'Continuar' action", async () => {
    mockProfile = { role: "familia", phone_verified: false };

    const jsx = await VerificarPage();
    render(jsx);

    // The core soft-gate acceptance criterion: no server-side redirect fires just because
    // teléfono is unverified -- the family may proceed into the app.
    expect(redirectMock).not.toHaveBeenCalled();

    const continueLink = screen.getByRole("link", { name: "Continuar" });
    expect(continueLink).toHaveAttribute("href", "/familia");

    // Per UI-SPEC AUTH-03: the button must be genuinely enabled/unconditional, with a note
    // explaining both channels are still required before contacting a candidate later.
    expect(
      screen.getByText(/Podrás usar Clin ahora.*antes de contactar a una candidata/)
    ).toBeInTheDocument();
  });

  it("does not block the teléfono OTP checklist item behind the soft-gate fix -- 'Verificar' remains its own distinct action", async () => {
    mockProfile = { role: "familia", phone_verified: false };

    const jsx = await VerificarPage();
    render(jsx);

    // Confirms the OTP-confirm submit button was relabeled away from "Continuar" (which
    // now refers exclusively to the always-enabled soft-gate action above), so the two
    // affordances are not confusable.
    expect(screen.getByRole("button", { name: "Verificar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continuar" })).not.toBeInTheDocument();
  });

  it("a niñera user with teléfono unverified gets a 'Continuar' pointing at /ninera, not /familia", async () => {
    mockProfile = { role: "ninera", phone_verified: false };

    const jsx = await VerificarPage();
    render(jsx);

    expect(screen.getByRole("link", { name: "Continuar" })).toHaveAttribute("href", "/ninera");
  });

  it("still redirects straight to the role home once teléfono is verified (nothing left to do here)", async () => {
    mockProfile = { role: "familia", phone_verified: true };

    await expect(VerificarPage()).rejects.toThrow("REDIRECT:/familia");
  });

  it("redirects to /login with no session at all (correo hard gate keeps this screen unreachable pre-login)", async () => {
    mockUser = null;

    await expect(VerificarPage()).rejects.toThrow("REDIRECT:/login");
  });
});
