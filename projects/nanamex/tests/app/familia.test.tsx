import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// FAM-01 gate on /familia (E1-03): a familia session with no perfil_familiar row yet is
// redirected to /familia/perfil before the dashboard placeholder renders. Same mocking
// pattern as tests/app/verificar.test.tsx / tests/app/familia-perfil.test.tsx.

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

// The rendered tree includes <UnauthorizedBanner /> (a client component using
// useSearchParams), so next/navigation needs both `redirect` and `useSearchParams` mocked --
// not just `redirect` alone.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    redirect: redirectMock,
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({ replace: vi.fn() }),
  };
});

let mockUser: { id: string } | null = { id: "user-1" };
const getUserMock = vi.fn(async () => ({ data: { user: mockUser } }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: getUserMock } })),
}));

let mockPerfilFamiliar: { profile_id: string } | null = null;
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table !== "perfil_familiar") throw new Error(`Unexpected table: ${table}`);
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: mockPerfilFamiliar })),
          })),
        })),
      };
    }),
  })),
}));

const { default: FamiliaHomePage } = await import("@/app/familia/page");

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  });
  mockUser = { id: "user-1" };
  mockPerfilFamiliar = null;
});

describe("FamiliaHomePage (FAM-02 placeholder, FAM-01 gate)", () => {
  it("redirects to /familia/perfil when no perfil_familiar row exists yet", async () => {
    mockPerfilFamiliar = null;

    await expect(FamiliaHomePage()).rejects.toThrow("REDIRECT:/familia/perfil");
  });

  it("renders the dashboard placeholder without redirecting once perfil_familiar exists", async () => {
    mockPerfilFamiliar = { profile_id: "user-1" };

    const jsx = await FamiliaHomePage();
    render(jsx);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Mis necesidades" })).toBeInTheDocument();
  });

  it("does not attempt the perfil_familiar check (and does not redirect) when there is no session", async () => {
    mockUser = null;

    const jsx = await FamiliaHomePage();
    render(jsx);

    expect(redirectMock).not.toHaveBeenCalled();
  });
});
