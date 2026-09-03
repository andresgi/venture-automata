import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-aware Supabase client for Server Actions / Route Handlers, used exclusively for
 * **Auth** operations (sign up, sign in, sign out, OTP verification) — never for reading/
 * writing application data tables.
 *
 * Per engineering/architecture.md §3, all *data* access goes through the service-role
 * client (`lib/supabase/server.ts`), which bypasses RLS entirely and keeps 100% of
 * authorization logic in application code. Auth is different: Supabase Auth (GoTrue) is
 * the identity provider itself, and a real user session (JWT in cookies) must exist for
 * `supabase.auth.getUser()`/middleware/session refresh to work at all — that requires the
 * anon-key client wired to read/write the request's cookies, which is exactly what
 * `@supabase/ssr`'s `createServerClient` is for. This is still 100% server-side code (a
 * Server Action or Route Handler) — the browser never talks to Supabase directly, matching
 * architecture.md §3's "no client-side direct-to-Supabase queries" rule.
 *
 * Required env vars (safe to read server-side; also the two documented `NEXT_PUBLIC_*`
 * exceptions per .env.example, since the anon key has no privileges beyond what RLS
 * allows):
 * - `NEXT_PUBLIC_SUPABASE_URL`
 * - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment " +
        "variable — see .env.example."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `cookies().set()` throws when called from a Server Component render (not a
          // Server Action / Route Handler). Safe to ignore here as long as the middleware
          // (lib/supabase/middleware.ts) is also refreshing the session on every request —
          // this is the standard @supabase/ssr Next.js pattern.
        }
      },
    },
  });
}
