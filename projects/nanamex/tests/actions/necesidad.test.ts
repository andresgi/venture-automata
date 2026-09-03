import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeNecesidadPayload } from "@/lib/familia/necesidad-persistence";

const getUser = vi.fn();
vi.mock("@/lib/supabase/auth-server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })) }));
const db = { from: vi.fn(), rpc: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: vi.fn(() => db) }));
const { saveNecesidadDraftAction } = await import("@/actions/necesidad");

function fd(payload: unknown, step = "1", id?: string) { const form = new FormData(); form.set("draft", JSON.stringify(payload)); form.set("step", step); if (id) form.set("draft_id", id); return form; }
const valid = { children: ["0-1"], zonaId: "11111111-1111-4111-8111-111111111111", diasHorarios: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }] };

beforeEach(() => { vi.clearAllMocks(); });

describe("saveNecesidadDraftAction", () => {
  it("rejects malformed steps and exact-age keys before persistence", async () => {
    expect((await saveNecesidadDraftAction({ status: "idle" }, fd(valid, "8"))).status).toBe("error");
    expect((await saveNecesidadDraftAction({ status: "idle" }, fd({ ...valid, edadExacta: 4 }))).status).toBe("error");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("rejects an empty zona id on the action path", async () => {
    expect((await saveNecesidadDraftAction({ status: "idle" }, fd({ children: ["0-1"], zonaId: "" }, "2"))).status).toBe("error");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("requires an authenticated family", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await saveNecesidadDraftAction({ status: "idle" }, fd(valid))).status).toBe("error");
  });

  it("does not let a family edit another family or an active necesidad", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "family-1" } } });
    db.from.mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { role: "familia" } })) })) })) });
    db.from.mockImplementation((table: string) => table === "profiles" ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: "familia" } }) }) }) } : { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "draft", familia_id: "other", estado: "activa" } }) }) }) });
    expect((await saveNecesidadDraftAction({ status: "idle" }, fd(valid, "1", "22222222-2222-4222-8222-222222222222"))).status).toBe("error");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("calls the atomic RPC for a new draft", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "family-1" } } });
    db.from.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: "familia" } }) }) }) }));
    db.rpc.mockResolvedValue({ data: "draft-1", error: null });
    const result = await saveNecesidadDraftAction({ status: "idle" }, fd(valid));
    expect(result).toEqual({ status: "saved", draftId: "draft-1" });
    expect(db.rpc).toHaveBeenCalledWith("save_necesidad_draft", expect.objectContaining({ p_draft_id: null, p_familia_id: "family-1" }));
    expect(db.rpc.mock.calls[0][1].p_payload.diasHorarios).toEqual([{ dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" }]);
  });

  it("normalizes client schedule keys for the database contract", () => {
    expect(normalizeNecesidadPayload({ diasHorarios: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }] }).diasHorarios).toEqual([{ dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" }]);
  });
});
