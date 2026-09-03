import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Integration test for E0-04's acceptance criterion: "A familia account cannot load any
// /ninera/* or /admin/* route (server-side redirect with the neutral banner)". Exercises
// the real proxy.ts entry point end-to-end (session lookup -> role lookup -> routing
// decision -> redirect), mocking only the two Supabase-touching seams (session refresh,
// profile role lookup) so no real network/cookie machinery is required.

let mockUser: { id: string } | null = null;
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(async (request: NextRequest) => ({
    response: NextResponse.next({ request }),
    user: mockUser,
  })),
}));

let mockRole: string | null = null;
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: mockRole ? { role: mockRole } : null })),
        })),
      })),
    })),
  })),
}));

const { proxy } = await import("@/proxy");

beforeEach(() => {
  mockUser = null;
  mockRole = null;
});

function req(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("proxy (role-based route-group gate)", () => {
  it("registration -> role-mismatched route -> redirect + banner: a familia session hitting /ninera is redirected home with the banner", async () => {
    mockUser = { id: "user-1" };
    mockRole = "familia";

    const response = await proxy(req("/ninera"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/familia");
    expect(location.searchParams.get("banner")).toBe("acceso-no-autorizado");
  });

  it("a familia session hitting /admin/* is also redirected home with the banner", async () => {
    mockUser = { id: "user-1" };
    mockRole = "familia";

    const response = await proxy(req("/admin/verificaciones"));

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/familia");
    expect(location.searchParams.get("banner")).toBe("acceso-no-autorizado");
  });

  it("a niñera session may load /ninera/* normally (no redirect)", async () => {
    mockUser = { id: "user-2" };
    mockRole = "ninera";

    const response = await proxy(req("/ninera/perfil"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("an unauthenticated request to a gated route is sent to login, not the banner", async () => {
    const response = await proxy(req("/familia"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("banner")).toBeNull();
  });

  it("does not touch requests outside the gated route groups", async () => {
    mockUser = { id: "user-1" };
    mockRole = "familia";

    const response = await proxy(req("/registro"));

    expect(response.headers.get("location")).toBeNull();
  });
});
