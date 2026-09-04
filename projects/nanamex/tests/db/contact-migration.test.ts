import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "db/migrations/20260904000017_confirm_contact.sql"), "utf8");

describe("E5-04 contact lifecycle authorization", () => {
  it("locks an owned pipeline across necesidad lifecycle states before checking contact", () => {
    expect(migration).toContain("and n.familia_id = p_familia_id\n  for update;");
    expect(migration).toContain("select * into v_contact from public.contacto where pipeline_id = v_pipeline.id;");
  });

  it("keeps new contact creation active-only after the established-contact branch", () => {
    const contactBranch = migration.indexOf("select * into v_contact");
    const activeGate = migration.indexOf("estado = 'activa'", contactBranch);
    expect(contactBranch).toBeGreaterThan(-1);
    expect(activeGate).toBeGreaterThan(contactBranch);
    expect(migration).toContain("raise exception 'contact_pair_not_allowed';");
  });
});
