import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "db/migrations/20260905000025_pipeline_origin.sql"), "utf8");

describe("pipeline provenance migration", () => {
  it("defines a safe legacy default and all supported origins", () => {
    expect(migration).toContain("create type public.pipeline_origin");
    expect(migration).toContain("'pushed', 'family_view', 'family_favorite', 'unknown'");
    expect(migration).toContain("source public.pipeline_origin not null default 'unknown'");
  });

  it("writes provenance at each authoritative creation boundary", () => {
    expect(migration).toMatch(/match_checklist_snapshot, source\)[\s\S]*'pushed'/);
    expect(migration).toMatch(/match_checklist_snapshot, source\) values[\s\S]*'family_view'/);
    expect(migration).toMatch(/es_favorita, source\) values[\s\S]*'family_favorite'/);
  });

  it("preserves unknown as the explicit legacy-safe fallback", () => {
    expect(migration).toContain("Existing rows cannot be reconstructed safely");
    expect(migration).toContain("default 'unknown'");
  });
});
