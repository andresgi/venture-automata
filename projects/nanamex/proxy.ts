import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  buildLoginRedirectUrl,
  buildUnauthorizedRedirectUrl,
  resolveRouteAccess,
} from "@/lib/auth/route-access";
import type { AppRole } from "@/lib/auth/roles";

/**
 * Role-based route-group gate for `/familia/*`, `/ninera/*`, `/admin/*`
 * (engineering/architecture.md §6, engineering/security.md §1, E0-04 acceptance
 * criteria). Session refresh (`updateSession`) always runs first per the standard
 * `@supabase/ssr` middleware pattern, even on ungated routes, so refreshed auth cookies
 * stay in sync everywhere.
 *
 * Named/filed as `proxy.ts` (not `middleware.ts`) per Next.js 16's renamed file
 * convention — "middleware" is deprecated as of v16.0.0 in favor of "proxy", which also
 * now defaults to the Node.js runtime (previously Edge), so the service-role Supabase
 * client used below runs in the same runtime as the rest of the app.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  let currentRole: AppRole | null = null;
  if (user) {
    // Data read via the service-role client, per architecture.md §3's "server components
    // read directly via server-side Supabase client (service role)" pattern — kept
    // consistent with every other data read in this app rather than relying on the
    // session-bound anon client's RLS "select own" policy for this specific lookup.
    const db = createServiceRoleClient();
    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    currentRole = (profile?.role as AppRole | undefined) ?? null;
  }

  const decision = resolveRouteAccess(pathname, currentRole);

  switch (decision.kind) {
    case "not-gated":
    case "allow":
      return response;
    case "redirect-login": {
      const url = buildLoginRedirectUrl(decision.loginPath, pathname, request.url);
      return NextResponse.redirect(url);
    }
    case "redirect-unauthorized": {
      const url = buildUnauthorizedRedirectUrl(decision.homePath, request.url);
      return NextResponse.redirect(url);
    }
  }
}

export const config = {
  matcher: ["/familia/:path*", "/ninera/:path*", "/admin/:path*"],
};
