import { describe, expect, it } from "vitest";
import { mapProfileWriteError } from "@/lib/supabase/db-errors";

describe("mapProfileWriteError", () => {
  it("maps a unique_violation (23505) to duplicate_profile regardless of which constraint", () => {
    expect(mapProfileWriteError({ code: "23505", message: "duplicate key value" })).toEqual({
      kind: "duplicate_profile",
    });
    expect(
      mapProfileWriteError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "profiles_pkey"',
      })
    ).toEqual({ kind: "duplicate_profile" });
  });

  it("maps the role-immutable trigger's exception to role_immutable, not a raw error", () => {
    expect(
      mapProfileWriteError({
        message: "profiles.role is immutable after creation (attempted familia -> admin)",
      })
    ).toEqual({ kind: "role_immutable" });
  });

  it("falls back to unknown for anything else, never throwing", () => {
    expect(mapProfileWriteError({ code: "22P02", message: "invalid input syntax" })).toEqual({
      kind: "unknown",
      message: "invalid input syntax",
    });
  });

  it("never leaks an empty/undefined message as a blank user-facing string", () => {
    expect(mapProfileWriteError({})).toEqual({
      kind: "unknown",
      message: "Unknown database error.",
    });
  });
});
