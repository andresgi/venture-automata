import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "db/migrations/20260904000018_pipeline_state_transitions.sql"), "utf8");

describe("E6-01 advance_pipeline_state authorization", () => {
  it("rejects contactada and nueva as a manual target before any pipeline lookup", () => {
    const guard = migration.indexOf("if p_new_estado = 'contactada' or p_new_estado = 'nueva' then");
    const lookup = migration.indexOf("select pl.* into v_pipeline");
    expect(guard).toBeGreaterThan(-1);
    expect(lookup).toBeGreaterThan(guard);
    expect(migration).toContain("raise exception 'transition_not_allowed';");
  });

  it("scopes the pipeline lock to the caller's own necesidad", () => {
    expect(migration).toContain("join public.necesidades n on n.id = pl.necesidad_id");
    expect(migration).toContain("where pl.id = p_pipeline_id and n.familia_id = p_familia_id");
  });

  it("only allows the documented forward path (contactada -> entrevista -> contratada)", () => {
    expect(migration).toContain("if v_from_estado <> 'contactada' then raise exception 'transition_not_allowed'; end if;");
    expect(migration).toContain("if v_from_estado <> 'entrevista' then raise exception 'transition_not_allowed'; end if;");
  });

  it("allows descartada from any state and treats a repeat discard as an idempotent no-op", () => {
    expect(migration).toContain("if v_from_estado = 'descartada' then\n      return v_pipeline;");
  });

  it("records the pipeline_state_advanced analytics event per engineering/analytics.md", () => {
    expect(migration).toContain("'pipeline_state_advanced'");
    expect(migration).toContain("'from_estado', v_from_estado, 'to_estado', p_new_estado");
  });

  it("restricts execution to the service role, matching the other pipeline-mutating RPCs", () => {
    expect(migration).toContain(
      "revoke execute on function public.advance_pipeline_state(uuid, uuid, public.pipeline_estado) from public, anon, authenticated;",
    );
    expect(migration).toContain("grant execute on function public.advance_pipeline_state(uuid, uuid, public.pipeline_estado) to service_role;");
  });
});
