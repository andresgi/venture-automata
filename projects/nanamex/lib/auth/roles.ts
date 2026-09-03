/**
 * Role/route-group mapping shared by middleware.ts and the auth server actions.
 *
 * `profiles.role` (public.user_role enum, db/migrations/20260902000002_core_enums.sql) is
 * the single source of truth for a role — this module only maps that value onto the
 * corresponding `/familia`, `/ninera`, `/admin` route-group prefixes (information-
 * architecture.md §3).
 */
export type AppRole = "familia" | "ninera" | "admin";

export const APP_ROLES: readonly AppRole[] = ["familia", "ninera", "admin"];

/** Roles a user may self-select at registration (AUTH-02). Admin is never self-registered
 * — manually provisioned only (architecture.md §6, security.md §1). */
export type SelfRegisterableRole = "familia" | "ninera";

export function isSelfRegisterableRole(value: unknown): value is SelfRegisterableRole {
  return value === "familia" || value === "ninera";
}

/** Route-group prefix each role's own "home" lives under — also the redirect target used
 * by middleware when a role-mismatched route is requested (UX-spec.md Part C: "redirect to
 * that account's own home with a neutral message"). */
export const ROLE_HOME_PATH: Record<AppRole, string> = {
  familia: "/familia",
  ninera: "/ninera",
  admin: "/admin",
};

/** Route-group prefixes middleware.ts gates by role. Order doesn't matter; matched by
 * exact-or-prefix against the request pathname. */
export const ROLE_ROUTE_PREFIXES: Record<string, AppRole> = {
  "/familia": "familia",
  "/ninera": "ninera",
  "/admin": "admin",
};

/** Query param middleware.ts appends to the redirect target so the destination page can
 * render the neutral "Acceso no autorizado" banner (UX-spec.md Part C / UI-SPEC.md). */
export const UNAUTHORIZED_BANNER_PARAM = "banner";
export const UNAUTHORIZED_BANNER_VALUE = "acceso-no-autorizado";
