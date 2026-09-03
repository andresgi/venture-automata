import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeNecesidadPayload } from "@/lib/familia/necesidad-persistence";

const getUser = vi.fn();
vi.mock("@/lib/supabase/auth-server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })) }));
const db = { from: vi.fn(), rpc: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: vi.fn(() => db) }));
const { publishNecesidadAction, saveNecesidadDraftAction } = await import("@/actions/necesidad");

function fd(payload: unknown, step = "1", id?: string) { const form = new FormData(); form.set("draft", JSON.stringify(payload)); form.set("step", step); if (id) form.set("draft_id", id); return form; }
const valid = { children: ["0-1"], zonaId: "11111111-1111-4111-8111-111111111111", diasHorarios: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }] };
const completeDraft = { ...valid, modalidad: "ocasional", pagoMin: 100, pagoMax: 200, fechaInicio: "2099-01-01", responsabilidades: ["Jugar y acompañar"] };

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

  it("does not publish another family's draft", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "family-1" } } });
    const chain = (data: unknown) => { const value: Record<string, unknown> = { select: () => value, eq: () => value, maybeSingle: async () => ({ data }) }; return value; };
    db.from.mockImplementation((table: string) => table === "profiles" ? chain({ role: "familia" }) : chain(null));
    const result = await publishNecesidadAction({ status: "idle" }, fd(completeDraft, "7", "22222222-2222-4222-8222-222222222222"));
    expect(result.status).toBe("error");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("publishes with zero candidates and persists an empty initial result", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "family-1" } } });
    const chain = (data: unknown) => { const value: Record<string, unknown> = { select: () => value, eq: () => value, maybeSingle: async () => ({ data }), then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: [], error: null })) }; return value; };
    const stored = { id: "22222222-2222-4222-8222-222222222222", familia_id: "family-1", zona_id: valid.zonaId, modalidad: "ocasional", pago_min: 100, pago_max: 200, fecha_inicio: "2099-01-01", responsabilidades: completeDraft.responsabilidades, dias_horarios: [{ dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" }], necesidad_children: [{ rango_edad: "0-1" }], zonas: { alcaldia_municipio: "Centro" } };
    db.from.mockImplementation((table: string) => table === "profiles" ? chain({ role: "familia" }) : table === "necesidades" ? chain(stored) : chain([]));
    db.rpc.mockResolvedValue({ data: stored.id, error: null });
    const result = await publishNecesidadAction({ status: "idle" }, fd(completeDraft, "7", stored.id));
    expect(result).toEqual({ status: "published", necesidadId: stored.id });
    expect(db.rpc).toHaveBeenCalledWith("publish_necesidad_with_matches", expect.objectContaining({ p_matches: [] }));
  });

  const storedForMatching = { id: "22222222-2222-4222-8222-222222222222", familia_id: "family-1", zona_id: valid.zonaId, modalidad: "ocasional", pago_min: 100, pago_max: 200, fecha_inicio: "2099-01-01", responsabilidades: completeDraft.responsabilidades, dias_horarios: [{ dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" }], necesidad_children: [{ rango_edad: "0-1" }], zonas: { alcaldia_municipio: "Centro" } };

  // A candidate matching every weighted factor for `storedForMatching`'s necesidad: location
  // "Centro", full lun 09:00-17:00 coverage, salary overlap, "0-1" age overlap, and >=2 years
  // experience -- i.e. a guaranteed 100 score, so two such rows are score-tied and any
  // ordering difference between them isolates the completeness tie-break.
  //
  // `disponibilidad` here deliberately uses the *real, documented* database.md §3 shape
  // (snake_case `hora_inicio`/`hora_fin`, the same convention as `necesidad.dias_horarios`)
  // rather than the code's internal `MatchScheduleEntry` camelCase shape -- this is what
  // actually flows out of Postgres, and is what caught BUG-001 (candidateFromRow silently
  // never translating these keys, always scoring `availability: false`).
  function fullyMatchingRow(overrides: Record<string, unknown>): Record<string, unknown> {
    return {
      profile_id: "row-id", disponibilidad: [{ dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" }],
      salario_min: 100, salario_max: 200, modalidades_aceptadas: ["ocasional"], anos_experiencia: 5,
      perfil_completo: true, created_at: "2026-01-01T00:00:00.000Z",
      ninera_zonas: [{ zonas: { alcaldia_municipio: "Centro" } }],
      ninera_experiencia_edades: [{ rango_edad: "0-1" }],
      ...overrides,
    };
  }

  it("ranks an equally-scored, more complete profile ahead of a less complete one", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "family-1" } } });
    const candidateRows = [
      fullyMatchingRow({ profile_id: "aaa-incomplete", perfil_completo: false }),
      fullyMatchingRow({ profile_id: "zzz-complete", perfil_completo: true }),
    ];
    const chain = (data: unknown) => { const value: Record<string, unknown> = { select: () => value, eq: () => value, maybeSingle: async () => ({ data }), then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: candidateRows, error: null })) }; return value; };
    db.from.mockImplementation((table: string) => table === "profiles" ? chain({ role: "familia" }) : table === "necesidades" ? chain(storedForMatching) : chain(candidateRows));
    db.rpc.mockResolvedValue({ data: storedForMatching.id, error: null });

    const result = await publishNecesidadAction({ status: "idle" }, fd(completeDraft, "7", storedForMatching.id));

    expect(result).toEqual({ status: "published", necesidadId: storedForMatching.id });
    const matches = db.rpc.mock.calls[0][1].p_matches as { ninera_id: string; match_score_snapshot: number }[];
    expect(matches.map((m) => m.ninera_id)).toEqual(["zzz-complete", "aaa-incomplete"]);
    expect(matches.every((m) => m.match_score_snapshot === 100)).toBe(true);
  });

  it("scores a candidate's real snake_case disponibilidad as available (BUG-001 regression)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "family-1" } } });
    // Isolates the availability factor: everything else about this candidate is otherwise
    // a poor fit (wrong zona, no salary overlap, no age overlap, insufficient experience),
    // so `availability: true` and a 25-point contribution can only come from correctly
    // translating `disponibilidad`'s snake_case `hora_inicio`/`hora_fin` DB shape.
    const candidateRows = [{
      profile_id: "availability-only", disponibilidad: [{ dia: "lun", hora_inicio: "08:00", hora_fin: "18:00" }],
      salario_min: 900, salario_max: 950, modalidades_aceptadas: ["ocasional"], anos_experiencia: 0,
      perfil_completo: true, created_at: "2026-01-01T00:00:00.000Z",
      ninera_zonas: [{ zonas: { alcaldia_municipio: "Otra zona" } }],
      ninera_experiencia_edades: [{ rango_edad: "6-12" }],
    }];
    const chain = (data: unknown) => { const value: Record<string, unknown> = { select: () => value, eq: () => value, maybeSingle: async () => ({ data }), then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: candidateRows, error: null })) }; return value; };
    db.from.mockImplementation((table: string) => table === "profiles" ? chain({ role: "familia" }) : table === "necesidades" ? chain(storedForMatching) : chain(candidateRows));
    db.rpc.mockResolvedValue({ data: storedForMatching.id, error: null });

    await publishNecesidadAction({ status: "idle" }, fd(completeDraft, "7", storedForMatching.id));

    const matches = db.rpc.mock.calls[0][1].p_matches as { match_score_snapshot: number; match_checklist_snapshot: { availability: boolean } }[];
    expect(matches[0].match_checklist_snapshot.availability).toBe(true);
    expect(matches[0].match_score_snapshot).toBe(25);
  });

  it("publishes non-empty results with candidate ids, scores, and checklist snapshots", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "family-1" } } });
    const candidateRows = [fullyMatchingRow({ profile_id: "candidate-1" })];
    const chain = (data: unknown) => { const value: Record<string, unknown> = { select: () => value, eq: () => value, maybeSingle: async () => ({ data }), then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: candidateRows, error: null })) }; return value; };
    db.from.mockImplementation((table: string) => table === "profiles" ? chain({ role: "familia" }) : table === "necesidades" ? chain(storedForMatching) : chain(candidateRows));
    db.rpc.mockResolvedValue({ data: storedForMatching.id, error: null });

    const result = await publishNecesidadAction({ status: "idle" }, fd(completeDraft, "7", storedForMatching.id));

    expect(result).toEqual({ status: "published", necesidadId: storedForMatching.id });
    expect(db.rpc).toHaveBeenCalledWith("publish_necesidad_with_matches", {
      p_necesidad_id: storedForMatching.id,
      p_familia_id: "family-1",
      p_matches: [{
        ninera_id: "candidate-1",
        match_score_snapshot: 100,
        match_checklist_snapshot: { location: true, availability: true, salaryOverlap: true, childAgeOverlap: true, experience: true },
      }],
    });
  });
});
