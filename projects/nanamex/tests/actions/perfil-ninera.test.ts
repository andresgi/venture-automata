import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/auth-server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })) }));
const storageUpload = vi.fn();
const storageGetPublicUrl = vi.fn();
const db = {
  from: vi.fn(),
  rpc: vi.fn(),
  storage: { from: vi.fn(() => ({ upload: storageUpload, getPublicUrl: storageGetPublicUrl })) },
};
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: vi.fn(() => db) }));

const { savePerfilNineraDraftAction, uploadPerfilFotoAction } = await import("@/actions/perfil-ninera");

function fd(payload: unknown) {
  const form = new FormData();
  form.set("draft", JSON.stringify(payload));
  return form;
}

const chain = (data: unknown) => {
  const value: Record<string, unknown> = {
    select: () => value,
    eq: () => value,
    in: () => value,
    maybeSingle: async () => ({ data }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data, error: null })),
  };
  return value;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("savePerfilNineraDraftAction", () => {
  it("rejects malformed JSON before touching auth", async () => {
    const form = new FormData();
    form.set("draft", "not json");
    const result = await savePerfilNineraDraftAction({ status: "idle" }, form);
    expect(result.status).toBe("error");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects unknown fields at the schema level", async () => {
    const result = await savePerfilNineraDraftAction({ status: "idle" }, fd({ edadExacta: 4 }));
    expect(result.status).toBe("error");
    expect(getUser).not.toHaveBeenCalled();
  });

  it("requires an authenticated session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const result = await savePerfilNineraDraftAction({ status: "idle" }, fd({}));
    expect(result.status).toBe("error");
  });

  it("rejects a non-niñera role", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "familia" }));
    const result = await savePerfilNineraDraftAction({ status: "idle" }, fd({}));
    expect(result.status).toBe("error");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("rejects zona ids that don't exist in the seeded zonas table", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation((table: string) => (table === "profiles" ? chain({ role: "ninera" }) : chain([])));
    const result = await savePerfilNineraDraftAction(
      { status: "idle" },
      fd({ zonaIds: ["11111111-1111-4111-8111-111111111111"] }),
    );
    expect(result.status).toBe("error");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("calls the atomic RPC and reports perfil_completo from its result", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation((table: string) =>
      table === "profiles" ? chain({ role: "ninera" }) : chain([{ id: "11111111-1111-4111-8111-111111111111" }]),
    );
    db.rpc.mockResolvedValue({ data: true, error: null });

    const result = await savePerfilNineraDraftAction(
      { status: "idle" },
      fd({
        zonaIds: ["11111111-1111-4111-8111-111111111111"],
        disponibilidad: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }],
      }),
    );

    expect(result).toEqual({ status: "saved", perfilCompleto: true });
    expect(db.rpc).toHaveBeenCalledWith(
      "save_perfil_ninera",
      expect.objectContaining({ p_ninera_id: "user-1" }),
    );
    expect(db.rpc.mock.calls[0][1].p_payload.disponibilidad).toEqual([
      { dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" },
    ]);
  });

  it("surfaces an error when the RPC fails", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera" }));
    db.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const result = await savePerfilNineraDraftAction({ status: "idle" }, fd({}));
    expect(result.status).toBe("error");
  });
});

describe("uploadPerfilFotoAction", () => {
  function fileForm(file: File) {
    const form = new FormData();
    form.set("foto", file);
    return form;
  }

  it("requires an authenticated niñera", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const result = await uploadPerfilFotoAction({ status: "idle" }, new FormData());
    expect(result.status).toBe("error");
  });

  it("rejects an oversized file server-side", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera" }));
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "foto.jpg", { type: "image/jpeg" });
    const result = await uploadPerfilFotoAction({ status: "idle" }, fileForm(big));
    expect(result.status).toBe("error");
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("rejects a disallowed file type even if the client bypassed its own accept filter", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera" }));
    const pdf = new File([new Uint8Array(10)], "foto.pdf", { type: "application/pdf" });
    const result = await uploadPerfilFotoAction({ status: "idle" }, fileForm(pdf));
    expect(result.status).toBe("error");
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("uploads a valid image under the user's own path and returns its public URL", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera" }));
    storageUpload.mockResolvedValue({ error: null });
    storageGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn.test/user-1/1.jpg" } });
    const image = new File([new Uint8Array(10)], "foto.jpg", { type: "image/jpeg" });

    const result = await uploadPerfilFotoAction({ status: "idle" }, fileForm(image));

    expect(result).toEqual({ status: "uploaded", fotoUrl: "https://cdn.test/user-1/1.jpg" });
    expect(storageUpload.mock.calls[0][0]).toMatch(/^user-1\//);
  });
});
