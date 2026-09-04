import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "db/migrations/20260904000015_payment_boundary.sql"), "utf8");

describe("E5-01 payment boundary schema", () => {
  it("allows provider IDs during recovery and constrains the provider/state", () => {
    expect(migration).toContain("alter column provider_payment_id drop not null");
    expect(migration).toContain("payments_provider_stripe_check");
    expect(migration).toContain("payments_provider_session_status_check");
    expect(migration).toContain("provider_session_status in ('not_created', 'open', 'expired', 'complete', 'unknown')");
  });

  it("has durable uniqueness and one pending boundary per family", () => {
    expect(migration).toContain("payments_idempotency_key_idx");
    expect(migration).toContain("payments_one_pending_per_familia_idx");
    expect(migration).toContain("where status = 'pendiente'");
    expect(migration).toContain("checkout_claimed_at");
  });
});
