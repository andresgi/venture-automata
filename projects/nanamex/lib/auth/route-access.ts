import {
  ROLE_HOME_PATH,
  ROLE_ROUTE_PREFIXES,
  UNAUTHORIZED_BANNER_PARAM,
  UNAUTHORIZED_BANNER_VALUE,
  type AppRole,
} from "@/lib/auth/roles";

/**
 * Pure decision function for `middleware.ts`'s role-based route-group gate
 * (`/familia/*`, `/ninera/*`, `/admin/*` — engineering/architecture.md §6). Kept separate
 * from the Supabase/session plumbing so it's directly unit-testable without mocking
 * cookies/network.
 */
export type RouteAccessDecision =
  | { kind: "allow" }
  | { kind: "not-gated" }
  | { kind: "redirect-login"; loginPath: string }
  | { kind: "redirect-unauthorized"; homePath: string };

/** `/admin/login` is a public entry point (information-architecture.md §3) — never gated,
 * even though it lives under the `/admin` prefix. */
const UNGATED_EXACT_PATHS = new Set(["/admin/login"]);

function matchGatedPrefix(pathname: string): { prefix: string; role: AppRole } | null {
  for (const [prefix, role] of Object.entries(ROLE_ROUTE_PREFIXES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return { prefix, role };
    }
  }
  return null;
}

export function resolveRouteAccess(
  pathname: string,
  currentRole: AppRole | null
): RouteAccessDecision {
  if (UNGATED_EXACT_PATHS.has(pathname)) {
    return { kind: "not-gated" };
  }

  const match = matchGatedPrefix(pathname);
  if (!match) {
    return { kind: "not-gated" };
  }

  if (!currentRole) {
    const loginPath = match.role === "admin" ? "/admin/login" : "/login";
    return { kind: "redirect-login", loginPath };
  }

  if (currentRole !== match.role) {
    return { kind: "redirect-unauthorized", homePath: ROLE_HOME_PATH[currentRole] };
  }

  return { kind: "allow" };
}

/** Builds the redirect URL for the `redirect-unauthorized` case, appending the neutral
 * banner query param the destination's layout reads to render the "Acceso no autorizado"
 * message (UX-spec.md Part C / UI-SPEC.md). */
export function buildUnauthorizedRedirectUrl(homePath: string, requestUrl: string): URL {
  const url = new URL(homePath, requestUrl);
  url.searchParams.set(UNAUTHORIZED_BANNER_PARAM, UNAUTHORIZED_BANNER_VALUE);
  return url;
}

/** Builds the redirect URL for the `redirect-login` case, preserving the originally
 * requested path so the login flow can return the user there afterwards (SYS-02 session-
 * expiry pattern, UX-spec.md Part C). */
export function buildLoginRedirectUrl(loginPath: string, pathname: string, requestUrl: string): URL {
  const url = new URL(loginPath, requestUrl);
  url.searchParams.set("next", pathname);
  return url;
}
