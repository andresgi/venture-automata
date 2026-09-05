import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const rpc = vi.fn();
const profileMaybeSingle = vi.fn();
vi.mock("@/lib/supabase/auth-server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })) }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: profileMaybeSingle })) })) })),
    rpc,
  })),
}));
const { advancePipelineStateAction } = await import("@/actions/pipeline");

const pipelineId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "family-1" } } });
  profileMaybeSingle.mockResolvedValue({ data: { role: "familia" } });
  rpc.mockResolvedValue({ data: { estado: "entrevista" }, error: null });
});

describe("advancePipelineStateAction", () => {
  it("rejects a manual nueva -> contactada transition at the schema layer, never reaching the database", async () => {
    // The zod schema only accepts entrevista/contratada/descartada as a target state --
    // "contactada" (and "nueva") are structurally impossible inputs to this action, per
    // E6-01's acceptance criteria: `nueva -> contactada` remains exclusively E5-04's
    // `confirm_contact` paid flow.
    const result = await advancePipelineStateAction({ pipelineId, newEstado: "contactada" as never });
    expect(result).toEqual({ ok: false, message: "Solicitud inválida." });
    expect(rpc).not.toHaveBeenCalled();

    const nuevaResult = await advancePipelineStateAction({ pipelineId, newEstado: "nueva" as never });
    expect(nuevaResult).toEqual({ ok: false, message: "Solicitud inválida." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed for an unauthenticated caller", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await advancePipelineStateAction({ pipelineId, newEstado: "entrevista" })).toEqual({
      ok: false,
      message: "Tu sesión expiró. Inicia sesión de nuevo.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed for a non-familia caller", async () => {
    profileMaybeSingle.mockResolvedValue({ data: { role: "ninera" } });
    expect(await advancePipelineStateAction({ pipelineId, newEstado: "entrevista" })).toEqual({
      ok: false,
      message: "No se pudo actualizar el estado. Intenta de nuevo.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps an RPC error to a generic message without leaking authorization details", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "transition_not_allowed", code: "P0001" } });
    const result = await advancePipelineStateAction({ pipelineId, newEstado: "contratada" });
    expect(result).toEqual({ ok: false, message: "No se pudo actualizar el estado. Intenta de nuevo." });
  });

  it("calls advance_pipeline_state with the session-derived familia id and returns the new estado", async () => {
    rpc.mockResolvedValue({ data: { estado: "descartada" }, error: null });
    const result = await advancePipelineStateAction({ pipelineId, newEstado: "descartada" });
    expect(result).toEqual({ ok: true, estado: "descartada" });
    expect(rpc).toHaveBeenCalledWith("advance_pipeline_state", {
      p_pipeline_id: pipelineId,
      p_familia_id: "family-1",
      p_new_estado: "descartada",
    });
  });
});
