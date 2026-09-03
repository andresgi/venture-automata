import { describe, expect, it } from "vitest";
import {
  buildLoginRedirectUrl,
  buildUnauthorizedRedirectUrl,
  resolveRouteAccess,
} from "@/lib/auth/route-access";

// E0-04 acceptance criterion: "A familia account cannot load any /ninera/* or /admin/*
// route (server-side redirect with the neutral banner)". This is the pure decision
// function proxy.ts delegates to — exercised directly here so the routing rules are
// verified without needing to mock cookies/Supabase network calls.
describe("resolveRouteAccess", () => {
  it("allows a role visiting its own route group", () => {
    expect(resolveRouteAccess("/familia", "familia")).toEqual({ kind: "allow" });
    expect(resolveRouteAccess("/familia/necesidades/nueva", "familia")).toEqual({
      kind: "allow",
    });
    expect(resolveRouteAccess("/ninera", "ninera")).toEqual({ kind: "allow" });
    expect(resolveRouteAccess("/admin/verificaciones", "admin")).toEqual({ kind: "allow" });
  });

  it("redirects a familia account away from /ninera/* (role mismatch)", () => {
    expect(resolveRouteAccess("/ninera", "familia")).toEqual({
      kind: "redirect-unauthorized",
      homePath: "/familia",
    });
  });

  it("redirects a familia account away from /admin/* (role mismatch)", () => {
    expect(resolveRouteAccess("/admin/verificaciones", "familia")).toEqual({
      kind: "redirect-unauthorized",
      homePath: "/familia",
    });
  });

  it("redirects a niñera account away from /familia/*", () => {
    expect(resolveRouteAccess("/familia/cuenta", "ninera")).toEqual({
      kind: "redirect-unauthorized",
      homePath: "/ninera",
    });
  });

  it("sends an unauthenticated request to the role-appropriate login page", () => {
    expect(resolveRouteAccess("/familia", null)).toEqual({
      kind: "redirect-login",
      loginPath: "/login",
    });
    expect(resolveRouteAccess("/ninera/perfil", null)).toEqual({
      kind: "redirect-login",
      loginPath: "/login",
    });
    expect(resolveRouteAccess("/admin/reportes", null)).toEqual({
      kind: "redirect-login",
      loginPath: "/admin/login",
    });
  });

  it("never gates /admin/login even though it is under the /admin prefix", () => {
    expect(resolveRouteAccess("/admin/login", null)).toEqual({ kind: "not-gated" });
    expect(resolveRouteAccess("/admin/login", "familia")).toEqual({ kind: "not-gated" });
  });

  it("leaves public routes ungated", () => {
    expect(resolveRouteAccess("/", null)).toEqual({ kind: "not-gated" });
    expect(resolveRouteAccess("/registro", "familia")).toEqual({ kind: "not-gated" });
    expect(resolveRouteAccess("/login", null)).toEqual({ kind: "not-gated" });
  });
});

describe("buildUnauthorizedRedirectUrl", () => {
  it("appends the neutral banner query param to the account's own home", () => {
    const url = buildUnauthorizedRedirectUrl("/familia", "http://localhost:3000/ninera");
    expect(url.pathname).toBe("/familia");
    expect(url.searchParams.get("banner")).toBe("acceso-no-autorizado");
  });
});

describe("buildLoginRedirectUrl", () => {
  it("preserves the originally requested path as `next`", () => {
    const url = buildLoginRedirectUrl("/login", "/familia/cuenta", "http://localhost:3000/familia/cuenta");
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe("/familia/cuenta");
  });
});
