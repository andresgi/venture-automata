import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "db/migrations/20260903000013_candidate_favorites.sql"),
  "utf8",
);

// This file is a structural sanity check on the migration's *source text* -- it cannot
// exercise real Postgres behavior (that's `scripts/test-e4-04-favorites.sql`, run against a
// live database via `npm run test:db`, which is where the actual behavioral coverage for
// these same claims lives). Assertions below use targeted regexes over the function body
// rather than plain substring matches, so they fail if the *structure* they claim to check
// changes (e.g. a snapshot column leaking into the `on conflict` update, or the ownership
// check moving inside a branch) rather than only failing on unrelated formatting/whitespace
// edits -- per Code Review's E4-04 Minor Issue #2 (strengthen or drop the string-matching).
const functionBodyMatch = migration.match(
  /create or replace function public\.set_candidate_favorite[\s\S]*?\$\$;/,
);
if (!functionBodyMatch) {
  throw new Error("set_candidate_favorite function body not found in migration file");
}
const functionBody = functionBodyMatch[0];

describe("E4-04 candidate favorites persistence", () => {
  it("adds a non-destructive es_favorita flag rather than deleting pipeline rows on unfavorite", () => {
    expect(migration).toMatch(/add column es_favorita boolean not null default false/);
    expect(functionBody).toMatch(/update public\.pipeline set es_favorita = false, updated_at = now\(\)\s*\n\s*where necesidad_id = p_necesidad_id and ninera_id = p_ninera_id;/);
    expect(functionBody).not.toMatch(/delete\s+from\s+public\.pipeline/i);
  });

  it("checks family ownership + necesidad activity unconditionally, before branching on favorite/unfavorite", () => {
    // The ownership/activity check must appear before the `if p_favorite then` branch, so
    // it structurally applies to both the favorite and unfavorite directions -- not just
    // whichever branch happens to mention `estado = 'activa'` textually.
    const ownershipCheckIndex = functionBody.search(/familia_id = p_familia_id and estado = 'activa'/);
    const branchIndex = functionBody.search(/if p_favorite then/);
    expect(ownershipCheckIndex).toBeGreaterThan(-1);
    expect(branchIndex).toBeGreaterThan(-1);
    expect(ownershipCheckIndex).toBeLessThan(branchIndex);
  });

  it("only re-validates candidate eligibility (publicado/perfil_completo/account_status) on the favorite branch", () => {
    const favoriteBranch = functionBody.slice(functionBody.indexOf("if p_favorite then"), functionBody.indexOf("else"));
    expect(favoriteBranch).toMatch(/pn\.publicado = true/);
    expect(favoriteBranch).toMatch(/pn\.perfil_completo = true/);
    expect(favoriteBranch).toMatch(/p\.account_status = 'activa'/);
  });

  it("never re-freezes an existing pipeline row's snapshot on a later favorite (on conflict update excludes snapshot columns)", () => {
    const onConflictMatch = functionBody.match(/on conflict \(necesidad_id, ninera_id\) do update set ([^;]+);/);
    expect(onConflictMatch).not.toBeNull();
    const setClause = onConflictMatch![1];
    expect(setClause).toMatch(/es_favorita = true/);
    expect(setClause).not.toMatch(/match_score_snapshot/);
    expect(setClause).not.toMatch(/match_checklist_snapshot/);
  });

  it("restricts execution to service_role only, same as the E4-03 RPC", () => {
    expect(migration).toMatch(
      /revoke execute on function public\.set_candidate_favorite\(uuid, uuid, uuid, boolean, integer, jsonb\)\s*\n\s*from public, anon, authenticated;/,
    );
    expect(migration).toMatch(
      /grant execute on function public\.set_candidate_favorite\(uuid, uuid, uuid, boolean, integer, jsonb\)\s*\n\s*to service_role;/,
    );
  });
});
