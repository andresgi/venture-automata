import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); });
vi.mock("next/navigation", () => ({ redirect: redirectMock, useRouter: vi.fn() }));
let user: { id: string } | null = { id: "family-a" };
let onboarded = true;
let accessProfile = { role: "familia", account_status: "activa" };
const getUser = vi.fn(async () => ({ data: { user } }));
vi.mock("@/lib/supabase/auth-server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })) }));
vi.mock("@/lib/auth/familia-onboarding", () => ({ getFamiliaOnboardingState: vi.fn(async () => ({ isFamilia: accessProfile.role === "familia" && accessProfile.account_status === "activa", isOnboarded: onboarded, profile: { ...accessProfile, email_verified: true, phone_verified: false } })) }));

let profile: Record<string, unknown> | null;
let entitlement: Record<string, unknown> | null;
let payments: Record<string, unknown>[];
let queryError = false;
const accountQueryIds: Array<{ table: string; column: string; value: unknown }> = [];
type MockQuery = {
  select: (...args: unknown[]) => MockQuery;
  eq: (...args: unknown[]) => MockQuery;
  order: (...args: unknown[]) => MockQuery;
  limit: (...args: unknown[]) => MockQuery;
  maybeSingle: () => Promise<unknown>;
  then?: (resolve: (value: unknown) => unknown) => Promise<unknown>;
};
vi.mock("@/lib/supabase/server", () => ({
   createServiceRoleClient: vi.fn(() => ({ from: vi.fn((table: string) => {
    const result = (data: unknown) => ({ data: queryError ? null : data, error: queryError ? { code: "db_error" } : null });
    const base = {} as MockQuery;
    base.select = vi.fn(() => base);
     base.eq = vi.fn((column: unknown, value: unknown) => { accountQueryIds.push({ table, column: String(column), value }); return base; });
    base.order = vi.fn(() => base);
    base.limit = vi.fn(() => base);
    base.maybeSingle = vi.fn(async () => result(table === "profiles" ? profile : entitlement));
    base.then = undefined;
    // The page awaits the query builder for the payments list; make this chainable promise.
    if (table === "payments") base.order = vi.fn(() => ({ ...base, then: (resolve: (v: unknown) => unknown) => Promise.resolve(result(payments)).then(resolve) }));
    return base;
  }) })),
}));

const { default: FamiliaCuentaPage, daysRemaining, formatAccountDate } = await import("@/app/familia/cuenta/page");

beforeEach(() => { vi.clearAllMocks(); accountQueryIds.length = 0; user = { id: "family-a" }; accessProfile = { role: "familia", account_status: "activa" }; onboarded = true; queryError = false; profile = { role: "familia", account_status: "activa", email_verified: true, phone_verified: false }; entitlement = null; payments = []; });

describe("FamiliaCuentaPage (FAM-13)", () => {
  it("requires a session", async () => { user = null; await expect(FamiliaCuentaPage()).rejects.toThrow("REDIRECT:/login"); });
  it("uses the authenticated user ID for every account query", async () => {
    render(await FamiliaCuentaPage());
    expect(accountQueryIds).toEqual([
       { table: "entitlements", column: "familia_id", value: "family-a" },
      { table: "payments", column: "familia_id", value: "family-a" },
    ]);
  });
  it.each([
    ["expired", -1, 0],
    ["just under one day", 86_400_000 - 1, 1],
    ["exactly one day", 86_400_000, 1],
  ])("calculates %s entitlement time correctly", (_, difference, expected) => {
    const now = Date.parse("2026-09-04T12:00:00.000Z");
    expect(daysRemaining(new Date(now + difference).toISOString(), now)).toBe(expected);
  });
  it("formats dates in the Monterrey product timezone", () => {
    expect(formatAccountDate("2026-01-01T05:30:00.000Z")).toContain("31 dic 2025");
  });
  it("redirects a family without perfil_familiar to onboarding", async () => {
    onboarded = false;
    await expect(FamiliaCuentaPage()).rejects.toThrow("REDIRECT:/familia/perfil");
    expect(accountQueryIds).toEqual([]);
    expect(screen.queryByText("Cuenta")).not.toBeInTheDocument();
  });
  it.each([
    ["non-family", { role: "ninera", account_status: "activa" }],
    ["inactive family", { role: "familia", account_status: "inactiva" }],
  ])("redirects %s accounts before account reads", async (_, account) => {
    accessProfile = account;
    await expect(FamiliaCuentaPage()).rejects.toThrow("REDIRECT:/familia");
    expect(accountQueryIds).toEqual([]);
  });
  it("renders contact states and an empty payment history", async () => { render(await FamiliaCuentaPage()); expect(screen.getByRole("heading", { name: "Cuenta" })).toBeInTheDocument(); expect(screen.getByText("Correo").parentElement).toHaveTextContent("Verificado"); expect(screen.getByText("Teléfono").parentElement).toHaveTextContent("Pendiente"); expect(screen.getByText("Aún no tienes pagos.")).toBeInTheDocument(); });
  it("renders the active entitlement and payment rows owned by the session", async () => { entitlement = { activated_at: "2026-09-01T00:00:00.000Z", expires_at: new Date(Date.now() + 3 * 86_400_000).toISOString() }; payments = [{ id: "p1", amount: 29900, status: "exitoso", created_at: "2026-09-01T00:00:00.000Z" }]; render(await FamiliaCuentaPage()); expect(screen.getByText("Activo")).toBeInTheDocument(); expect(screen.getByText(/días restantes/)).toBeInTheDocument(); expect(screen.getAllByText("$299.00")).toHaveLength(2); });
  it("shows an expired entitlement with zero days remaining", async () => { entitlement = { activated_at: "2026-08-01T00:00:00.000Z", expires_at: new Date(Date.now() - 86_400_000).toISOString() }; render(await FamiliaCuentaPage()); expect(screen.getByText("Expirado")).toBeInTheDocument(); expect(screen.getByText(/0 días restantes/)).toBeInTheDocument(); });
  it("fails with a retry state when account data cannot load", async () => { queryError = true; render(await FamiliaCuentaPage()); expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar tu cuenta"); expect(screen.getByRole("button", { name: "Reintentar" })).toHaveClass("min-h-11"); });
});
