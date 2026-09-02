import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client, authenticated with the service-role key.
 *
 * Per engineering/architecture.md §3/§11 and engineering/security.md §5, all data access
 * in this application goes through server-side code (server actions / route handlers) —
 * there is no client-side, direct-to-Supabase query path, and the service-role key must
 * never be exposed to the browser (never a `NEXT_PUBLIC_*` env var).
 *
 * The `server-only` import above turns that into a build-time guarantee rather than just
 * a convention: if this module is ever imported (even transitively) from a Client
 * Component, the Next.js build fails instead of silently bundling the service-role key
 * into client JavaScript.
 *
 * Required env vars (server-side only — see .env.example):
 * - `SUPABASE_URL`
 * - `SUPABASE_SERVICE_ROLE_KEY`
 */
let cachedClient: SupabaseClient | null = null;

export function createServiceRoleClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable. Both must " +
        "be set as server-side env vars (never NEXT_PUBLIC_*) — see .env.example."
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}
