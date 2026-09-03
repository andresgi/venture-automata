/**
 * Maps known Postgres/PostgREST error shapes to safe, user-facing messages instead of
 * letting them bubble up as an unhandled 500.
 *
 * Defense-in-depth per E0-04's acceptance criteria: `profiles.role` is immutable — no
 * application code path in this project attempts to change it after creation — but the
 * `profiles_role_immutable` trigger (db/migrations/20260902000004_profiles.sql) exists
 * precisely so a future bug can't silently succeed. If that trigger's `raise exception`
 * were ever hit (a bug, not a reachable code path today), this turns it into a graceful,
 * generic error rather than a raw database error/500 — the same pattern used below for the
 * `profiles.phone` unique-index violation (E0-04's duplicate-phone acceptance criterion).
 */

const ROLE_IMMUTABLE_MESSAGE_FRAGMENT = "profiles.role is immutable after creation";

export type MappedDbError =
  | { kind: "duplicate_profile" }
  | { kind: "role_immutable" }
  | { kind: "unknown"; message: string };

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
}

export function mapProfileWriteError(error: PostgrestLikeError): MappedDbError {
  const message = error.message ?? "";

  if (message.includes(ROLE_IMMUTABLE_MESSAGE_FRAGMENT)) {
    return { kind: "role_immutable" };
  }

  // Postgres unique_violation. On `profiles`, the only two unique constraints are the
  // primary key (`id`, i.e. a repeat insert for the same auth.users id -- e.g. a second
  // registration attempt on a not-yet-confirmed email, which GoTrue allows to "succeed"
  // again while resending the confirmation) and `profiles_phone_unique_idx` (phone). Both
  // mean the same thing from the registration flow's point of view: "an account already
  // exists" -- named `duplicate_profile` (not `duplicate_phone`) precisely because it
  // covers both cases, not just the phone column specifically.
  if (error.code === "23505") {
    return { kind: "duplicate_profile" };
  }

  return { kind: "unknown", message: message || "Unknown database error." };
}
