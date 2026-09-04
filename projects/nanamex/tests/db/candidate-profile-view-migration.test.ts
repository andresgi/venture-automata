import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "db/migrations/20260903000012_candidate_profile_view.sql"),
  "utf8",
);

describe("E4-03 candidate profile view persistence", () => {
  it("makes compatible_match_found idempotent per necesidad/candidate pair", () => {
    expect(migration).toContain("analytics_compatible_match_once");
    expect(migration).toContain("where event_name = 'compatible_match_found'");
    expect(migration).toContain("on conflict (event_name, necesidad_id, ninera_id)");
  });

  it("records every profile view but only qualifies scores at the 60 threshold", () => {
    expect(migration).toContain("values ('candidate_profile_viewed'");
    expect(migration).toContain("v_compatible_threshold constant integer := 60");
    expect(migration).toContain("if p_match_score >= v_compatible_threshold then");
    expect(migration).toContain("jsonb_build_object('match_score', p_match_score");
  });

  it("enforces family ownership and current candidate eligibility in the database", () => {
    expect(migration).toContain("familia_id = p_familia_id and estado = 'activa'");
    expect(migration).toContain("pn.publicado = true");
    expect(migration).toContain("pn.perfil_completo = true");
    expect(migration).toContain("p.account_status = 'activa'");
  });
});
