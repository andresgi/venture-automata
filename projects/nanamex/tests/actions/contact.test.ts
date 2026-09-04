import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const rpc = vi.fn();
vi.mock("@/lib/supabase/auth-server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })) }));
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: vi.fn(() => ({ rpc })) }));
const { confirmContactAction } = await import("@/actions/entitlements");

const input = { necesidadId: "11111111-1111-4111-8111-111111111111", nineraId: "22222222-2222-4222-8222-222222222222" };
beforeEach(() => { vi.clearAllMocks(); getUser.mockResolvedValue({ data: { user: { id: "family-1" } } }); rpc.mockResolvedValue({ data: { status: "contacted", phone: "+5215550001", mensaje: null }, error: null }); });

describe("confirmContactAction", () => {
  it("fails closed for an unauthenticated caller", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await confirmContactAction(input)).toEqual({ status: "error", message: "Tu sesión expiró. Inicia sesión de nuevo." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(["contact_not_allowed", "contact_pair_not_allowed"]) ("maps %s without leaking authorization details", async (code) => {
    rpc.mockResolvedValue({ data: null, error: { message: code, code: "P0001" } });
    expect((await confirmContactAction(input)).status).toBe("error");
    expect((await confirmContactAction(input) as { message: string }).message).toBe("No se pudo registrar la solicitud. Intenta de nuevo.");
  });

  it("returns the phone only from the successful atomic contact result and retries idempotently", async () => {
    expect(await confirmContactAction(input)).toMatchObject({ status: "contacted", phone: "+5215550001" });
    rpc.mockResolvedValueOnce({ data: { status: "already_contacted", phone: "+5215550001", mensaje: "Hola" }, error: null });
    expect(await confirmContactAction(input)).toMatchObject({ status: "already_contacted", phone: "+5215550001" });
    expect(rpc).toHaveBeenCalledWith("confirm_contact", expect.objectContaining({ p_familia_id: "family-1" }));
  });
});
