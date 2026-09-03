import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "db/migrations/20260903000010_necesidades_drafts.sql"), "utf8");

describe("E2-01 draft migration contract", () => {
  it("uses one RPC transaction and protects draft ownership/state", () => {
    expect(sql).toMatch(/create or replace function public\.save_necesidad_draft/);
    expect(sql).toMatch(/familia_id = p_familia_id and estado = 'borrador'/);
    expect(sql).toMatch(/if v_id is null then raise exception 'draft_not_editable'/);
    expect(sql).toMatch(/delete from public\.necesidad_children[\s\S]*for v_child in/);
    expect(sql).toMatch(/revoke execute on function public\.save_necesidad_draft/);
    expect(sql).toMatch(/grant execute on function public\.save_necesidad_draft[\s\S]*to service_role/);
  });

  it("keeps child replacement inside the function body", () => {
    const body = sql.slice(sql.indexOf("create or replace function"));
    expect(body.indexOf("delete from public.necesidad_children")).toBeGreaterThan(-1);
    expect(body.indexOf("for v_child in")).toBeGreaterThan(body.indexOf("delete from public.necesidad_children"));
    expect(body).toMatch(/on conflict \(id\) do update[\s\S]*updated_at=now\(\)/);
  });
});
