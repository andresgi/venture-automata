import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/auth-server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })) }));
const db = { from: vi.fn(), rpc: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: vi.fn(() => db) }));
const { toggleFavoriteAction } = await import("@/actions/favorites");

const validInput = {
  necesidadId: "11111111-1111-4111-8111-111111111111",
  nineraId: "22222222-2222-4222-8222-222222222222",
  favorite: true,
  matchScore: 80,
  matchChecklist: { location: true },
};

const chain = (data: unknown) => {
  const value: Record<string, unknown> = { select: () => value, eq: () => value, maybeSingle: async () => ({ data }) };
  return value;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toggleFavoriteAction", () => {
  it("rejects malformed input before touching the database", async () => {
    const result = await toggleFavoriteAction({ ...validInput, necesidadId: "not-a-uuid" });
    expect(result.ok).toBe(false);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("requires an authenticated session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const result = await toggleFavoriteAction(validInput);
    expect(result).toEqual({ ok: false, isFavorite: false, message: "Tu sesión expiró. Inicia sesión de nuevo." });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("rejects a non-familia caller without calling the RPC", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera" }));
    const result = await toggleFavoriteAction(validInput);
    expect(result.ok).toBe(false);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("calls set_candidate_favorite with the authenticated family id, not a client-supplied one", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "family-1" } } });
    db.from.mockImplementation(() => chain({ role: "familia" }));
    db.rpc.mockResolvedValue({ error: null });
    const result = await toggleFavoriteAction(validInput);
    expect(result).toEqual({ ok: true, isFavorite: true });
    expect(db.rpc).toHaveBeenCalledWith("set_candidate_favorite", {
      p_necesidad_id: validInput.necesidadId,
      p_familia_id: "family-1",
      p_ninera_id: validInput.nineraId,
      p_favorite: true,
      p_match_score: 80,
      p_match_checklist: { location: true },
    });
  });

  it("reports the pre-toggle state on RPC failure so the client can revert optimistic UI", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "family-1" } } });
    db.from.mockImplementation(() => chain({ role: "familia" }));
    db.rpc.mockResolvedValue({ error: { message: "boom" } });
    const result = await toggleFavoriteAction({ ...validInput, favorite: true });
    expect(result.ok).toBe(false);
    expect(result.isFavorite).toBe(false);
  });

  it("supports unfavoriting", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "family-1" } } });
    db.from.mockImplementation(() => chain({ role: "familia" }));
    db.rpc.mockResolvedValue({ error: null });
    const result = await toggleFavoriteAction({ ...validInput, favorite: false });
    expect(result).toEqual({ ok: true, isFavorite: false });
    expect(db.rpc.mock.calls[0][1].p_favorite).toBe(false);
  });
});
