import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/auth-server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })) }));
const storageUpload = vi.fn();
const storageRemove = vi.fn();
const storageGetPublicUrl = vi.fn();
const db = {
  from: vi.fn(),
  rpc: vi.fn(),
  storage: { from: vi.fn(() => ({ upload: storageUpload, remove: storageRemove, getPublicUrl: storageGetPublicUrl })) },
};
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: vi.fn(() => db) }));

const { savePerfilNineraDraftAction, savePerfilNineraSectionAction, uploadPerfilFotoAction, submitIdentityDocumentAction } = await import("@/actions/perfil-ninera");

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

  it("keeps incomplete draft profiles in onboarding despite a real profile row", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation((table: string) => table === "profiles" ? chain({ role: "ninera" }) : chain({ verification_status: "no_verificada", perfil_completo: false }));
    db.rpc.mockResolvedValue({ data: false, error: null });
    const result = await savePerfilNineraDraftAction({ status: "idle" }, fd({}));
    expect(result).toEqual({ status: "saved", perfilCompleto: false });
    expect(db.rpc).toHaveBeenCalledWith("save_perfil_ninera", expect.anything());
  });

  it("surfaces an error when the RPC fails", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera" }));
    db.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const result = await savePerfilNineraDraftAction({ status: "idle" }, fd({}));
    expect(result.status).toBe("error");
  });
});

describe("savePerfilNineraSectionAction", () => {
  beforeEach(() => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    db.rpc.mockResolvedValue({ data: true, error: null });
  });

  it("sends identity edits through the re-review-capable RPC", async () => {
    const result = await savePerfilNineraSectionAction({ status: "idle" }, "identity", { nombre: "Nueva", fotoUrl: "" });
    expect(result).toEqual({ status: "saved", perfilCompleto: true });
    expect(db.rpc).toHaveBeenCalledWith("save_perfil_ninera_section", expect.objectContaining({ p_section: "identity", p_ninera_id: "user-1" }));
  });

  it("sends non-identity edits without a verification-status input", async () => {
    const result = await savePerfilNineraSectionAction({ status: "idle" }, "about", { descripcion: "Una descripción" });
    expect(result.status).toBe("saved");
    expect(db.rpc.mock.calls[0][1].p_payload).toEqual({ descripcion: "Una descripción", disponibilidad: undefined });
  });

  it("returns controlled errors for invalid runtime sections and payloads", async () => {
    expect((await savePerfilNineraSectionAction({ status: "idle" }, "unknown" as never, {})).status).toBe("error");
    expect((await savePerfilNineraSectionAction({ status: "idle" }, "availability", { disponibilidad: [{ dia: "xxx", horaInicio: "bad", horaFin: "bad" }], salarioMin: 5, salarioMax: 1, modalidadesAceptadas: [] })).status).toBe("error");
    expect((await savePerfilNineraSectionAction({ status: "idle" }, "references", { referencias: [{ nombre: "A", relacion: "Familia", periodo: "2024", contacto: null }] })).status).toBe("saved");
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

  it("rejects an inactive niñera before touching storage", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "suspendida" }));
    const result = await uploadPerfilFotoAction({ status: "idle" }, new FormData());
    expect(result.status).toBe("error");
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("rejects an oversized file server-side", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "foto.jpg", { type: "image/jpeg" });
    const result = await uploadPerfilFotoAction({ status: "idle" }, fileForm(big));
    expect(result.status).toBe("error");
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("rejects a disallowed file type even if the client bypassed its own accept filter", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    const pdf = new File([new Uint8Array(10)], "foto.pdf", { type: "application/pdf" });
    const result = await uploadPerfilFotoAction({ status: "idle" }, fileForm(pdf));
    expect(result.status).toBe("error");
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("uploads a valid image under the user's own path and returns its public URL", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    storageUpload.mockResolvedValue({ error: null });
    storageGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn.test/user-1/1.jpg" } });
    const image = new File([new Uint8Array(10)], "foto.jpg", { type: "image/jpeg" });

    const result = await uploadPerfilFotoAction({ status: "idle" }, fileForm(image));

    expect(result).toEqual({ status: "uploaded", fotoUrl: "https://cdn.test/user-1/1.jpg" });
    expect(storageUpload.mock.calls[0][0]).toMatch(/^user-1\//);
  });
});

describe("submitIdentityDocumentAction", () => {
  const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "id.jpg", { type: "image/jpeg" });
  const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "id.png", { type: "image/png" });
  const webp = () => new File([new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])], "id.webp", { type: "image/webp" });

  it("turns authentication and profile lookup exceptions into safe user errors", async () => {
    getUser.mockRejectedValueOnce(new Error("auth backend unavailable"));
    expect((await submitIdentityDocumentAction({ status: "idle" }, new FormData())).message).toBe("No se pudo subir tu identificación. Intenta de nuevo.");

    getUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });
    db.from.mockImplementationOnce(() => { throw new Error("profile lookup unavailable"); });
    expect((await submitIdentityDocumentAction({ status: "idle" }, new FormData())).message).toBe("No se pudo subir tu identificación. Intenta de nuevo.");
  });
  function fileForm(file: File, field = "documento") {
    const form = new FormData();
    form.set(field, file);
    return form;
  }

  it("rejects a disallowed MIME type server-side even when the client is bypassed", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    const pdf = new File([new Uint8Array(10)], "id.pdf", { type: "application/pdf" });
    const form = new FormData(); form.set("documento", pdf);
    const result = await submitIdentityDocumentAction({ status: "idle" }, form);
    expect(result.status).toBe("error");
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("rejects an extension that does not match the MIME type", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    const image = new File([new Uint8Array([0xff, 0xd8, 0xff])], "id.png", { type: "image/jpeg" });
    const result = await submitIdentityDocumentAction({ status: "idle" }, fileForm(image));
    expect(result.status).toBe("error");
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it.each([jpeg, png, webp])("accepts image bytes with a supported signature", async (makeFile) => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    storageUpload.mockResolvedValue({ error: null });
    db.rpc.mockResolvedValue({ error: null });
    expect((await submitIdentityDocumentAction({ status: "idle" }, fileForm(makeFile()))).status).toBe("uploaded");
  });

  it("rejects a correctly labelled file with invalid image bytes", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    const result = await submitIdentityDocumentAction({ status: "idle" }, fileForm(new File(["not an image"], "id.jpg", { type: "image/jpeg" })));
    expect(result.status).toBe("error");
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("rejects an oversized image before reading or uploading it", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    const image = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "id.jpg", { type: "image/jpeg" });
    const result = await submitIdentityDocumentAction({ status: "idle" }, fileForm(image, "documento"));
    expect(result.message).toContain("10 MB");
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("canonicalizes .jpeg to a unique .jpg storage path", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    storageUpload.mockResolvedValue({ error: null });
    db.rpc.mockResolvedValue({ error: null });
    const image = new File([new Uint8Array([0xff, 0xd8, 0xff])], "id.jpeg", { type: "image/jpeg" });
    const result = await submitIdentityDocumentAction({ status: "idle" }, fileForm(image, "documento"));
    expect(result.status).toBe("uploaded");
    expect(storageUpload.mock.calls[0][0]).toMatch(/^user-1\/.+\.jpg$/);
    expect(db.rpc).toHaveBeenCalledWith("submit_identity_verification", expect.objectContaining({ p_document_storage_path: expect.stringMatching(/\.jpg$/) }));
  });

  it("cleans up an uploaded document when the submission RPC rejects", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    storageUpload.mockResolvedValue({ error: null });
    storageRemove.mockResolvedValue({ error: null });
    db.rpc.mockResolvedValue({ error: { message: "identity_verification_already_in_process" } });
    const result = await submitIdentityDocumentAction({ status: "idle" }, fileForm(jpeg(), "documento"));
    expect(result).toEqual({ status: "error", message: "Tu identificación ya está en revisión." });
    expect(storageRemove).toHaveBeenCalledWith([expect.stringMatching(/^user-1\/.+\.jpg$/)]);
  });

  it("cleans up an uploaded document when the submission RPC throws", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    storageUpload.mockResolvedValue({ error: null });
    storageRemove.mockResolvedValue({ error: null });
    db.rpc.mockRejectedValue(new Error("database unavailable"));
    const result = await submitIdentityDocumentAction({ status: "idle" }, fileForm(jpeg(), "documento"));
    expect(result.status).toBe("error");
    expect(storageRemove).toHaveBeenCalledOnce();
  });

  it("durably queues cleanup when object removal fails", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const queueInsert = vi.fn().mockResolvedValue({ error: null });
    db.from.mockImplementation((table: string) => table === "profiles" ? chain({ role: "ninera", account_status: "activa" }) : { insert: queueInsert });
    storageUpload.mockResolvedValue({ error: null });
    storageRemove.mockResolvedValue({ error: { message: "storage unavailable" } });
    db.rpc.mockRejectedValue(new Error("database unavailable"));
    const result = await submitIdentityDocumentAction({ status: "idle" }, fileForm(jpeg()));
    expect(result.status).toBe("error");
    expect(queueInsert).toHaveBeenCalledWith(expect.objectContaining({ reason: "submission_exception" }));
  });

  it("turns file-reading and storage exceptions into safe errors", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    db.from.mockImplementation(() => chain({ role: "ninera", account_status: "activa" }));
    storageUpload.mockRejectedValue(new Error("storage unavailable"));
    const result = await submitIdentityDocumentAction({ status: "idle" }, fileForm(jpeg(), "documento"));
    expect(result).toEqual({ status: "error", message: "No se pudo subir tu identificación. Intenta de nuevo." });
  });
});
