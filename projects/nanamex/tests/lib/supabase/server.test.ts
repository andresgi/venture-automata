import { afterEach, beforeEach, describe, expect, it } from "vitest";

// E0-02: proves the service-role Supabase client factory (a) requires server-side env
// vars rather than silently working without them, and (b) is importable at all under the
// `server-only` guard (i.e. this test module itself is the proof that importing
// lib/supabase/server.ts outside a Client Component bundle doesn't throw).
describe("createServiceRoleClient", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("throws a clear error when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing", async () => {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");

    expect(() => createServiceRoleClient()).toThrow(
      /SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY/
    );
  });

  it("returns a Supabase client when both env vars are set", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const client = createServiceRoleClient();

    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });
});
