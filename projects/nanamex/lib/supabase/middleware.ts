import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

/**
 * Refreshes the Supabase Auth session (if any) for the current request/response pair and
 * returns the authenticated user, if there is one.
 *
 * Per engineering/architecture.md §6 / engineering/security.md §1: "Session: Supabase-
 * issued JWT, verified server-side on every request by Next.js middleware." This is the
 * standard `@supabase/ssr` middleware pattern — `supabase.auth.getUser()` re-validates the
 * JWT against Supabase Auth (unlike `getSession()`, which only decodes the locally-stored
 * token without a round trip), and any refreshed token is written back onto the response's
 * cookies so the browser and subsequent requests stay in sync.
 */
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment " +
        "variable — see .env.example."
    );
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
