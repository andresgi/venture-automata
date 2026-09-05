import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: redirectMock, usePathname: () => "/ninera/oportunidades/recibidas" }));

let user: { id: string } | null = { id: "ninera-1" };
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } })),
}));

let authorized = true;
let onboarded = true;
vi.mock("@/lib/auth/ninera-onboarding", () => ({
  getNineraOnboardingState: vi.fn(async () => ({ isNinera: authorized, isOnboarded: onboarded, readError: false })),
}));

let pipelineResult: { data: unknown; error: unknown } = { data: [], error: null };
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
          Promise.resolve(pipelineResult).then(resolve, reject),
      };
      return builder;
    }),
  })),
}));

const { default: ReceivedOpportunitiesPage } = await import("@/app/ninera/oportunidades/recibidas/page");

describe("NIN-04 oportunidades recibidas -- auth ordering and empty state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    user = { id: "ninera-1" };
    authorized = true;
    onboarded = true;
    pipelineResult = { data: [], error: null };
  });

  it("redirects to /login when there is no session, before any pipeline read", async () => {
    user = null;
    await expect(ReceivedOpportunitiesPage()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /login when the session is not a niñera", async () => {
    authorized = false;
    await expect(ReceivedOpportunitiesPage()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /ninera/perfil when onboarding is incomplete", async () => {
    onboarded = false;
    await expect(ReceivedOpportunitiesPage()).rejects.toThrow("REDIRECT:/ninera/perfil");
  });

  it("throws a retryable error when the pipeline read fails", async () => {
    pipelineResult = { data: null, error: { message: "database unavailable" } };
    await expect(ReceivedOpportunitiesPage()).rejects.toThrow("No pudimos cargar tus oportunidades");
  });

  it("renders the shared empty-state template with a link to explore vacantes", async () => {
    render(await ReceivedOpportunitiesPage());
    expect(screen.getByRole("heading", { name: "Oportunidades recibidas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Aún no tienes oportunidades" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorar vacantes" })).toHaveAttribute("href", "/ninera/oportunidades");
  });
});
