import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "db/migrations/20260904000021_identity_verifications.sql"), "utf8");
const hardening = readFileSync(join(process.cwd(), "db/migrations/20260904000022_identity_verification_hardening.sql"), "utf8");

describe("E7-03 identity verification migration", () => {
  it("keeps the bucket private and restricts Storage writes to the server boundary", () => {
    expect(migration).toContain("values ('identity-documents', 'identity-documents', false)");
    expect(migration).toContain("identity_documents_admin_read");
    expect(hardening).toContain("drop policy if exists identity_documents_owner_insert");
    expect(hardening).toContain("drop policy if exists identity_documents_owner_update");
  });
  it("keeps submission, status transition, and durable analytics atomic", () => {
    expect(migration).toContain("create table public.identity_verifications");
    expect(migration).toContain("insert into public.identity_verifications");
    expect(migration).toContain("verification_status = 'en_proceso'");
    expect(migration).toContain("identity_verification_submitted");
    expect(migration).toContain("v_motivo := case when v_status = 'verificada'");
    expect(hardening).toContain("identity_verification_already_in_process");
    expect(hardening).toContain("identity_verifications_one_active_submission");
  expect(hardening).toContain("identity_verifications_document_path_unique");
  const cleanup = readFileSync(join(process.cwd(), "db/migrations/20260904000023_identity_cleanup_queue.sql"), "utf8");
  expect(cleanup).toContain("create table public.identity_document_cleanup_queue");
  expect(cleanup).toContain("No browser policy");
    expect(hardening).not.toContain("set publicado");
  });
});
