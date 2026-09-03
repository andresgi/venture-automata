import { beforeEach, describe, expect, it, vi } from "vitest";

// upsertPerfilFamiliarAction calls next/navigation's redirect() on success -- same pattern
// as tests/actions/auth.test.ts.
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: getUserMock } })),
}));

const VALID_ZONA_ID = "11111111-1111-4111-8111-111111111111";

// Minimal fluent query-builder double covering exactly the chains
// actions/perfil-familiar.ts uses per table.
function makeProfilesTable(opts: {
  selectResult?: { data: unknown; error: unknown };
  updateResult?: { error: unknown };
}) {
  const selectResult = opts.selectResult ?? { data: null, error: null };
  const updateResult = opts.updateResult ?? { error: null };

  const update = vi.fn((patch: Record<string, unknown>) => {
    void patch;
    return { eq: vi.fn(async () => updateResult) };
  });

  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => selectResult),
      })),
    })),
    update,
  };
}

function makeZonasTable(opts: { selectResult?: { data: unknown; error: unknown } }) {
  const selectResult = opts.selectResult ?? { data: { id: VALID_ZONA_ID }, error: null };
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => selectResult),
      })),
    })),
  };
}

function makePerfilFamiliarTable(opts: { upsertResult?: { error: unknown } }) {
  const upsertResult = opts.upsertResult ?? { error: null };
  return {
    upsert: vi.fn(async (row: Record<string, unknown>, options: Record<string, unknown>) => {
      void row;
      void options;
      return upsertResult;
    }),
  };
}

function makeServiceRoleClient(tables: {
  profiles: ReturnType<typeof makeProfilesTable>;
  zonas: ReturnType<typeof makeZonasTable>;
  perfil_familiar: ReturnType<typeof makePerfilFamiliarTable>;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") return tables.profiles;
      if (table === "zonas") return tables.zonas;
      if (table === "perfil_familiar") return tables.perfil_familiar;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

let currentServiceRoleClient: ReturnType<typeof makeServiceRoleClient>;

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => currentServiceRoleClient),
}));

const { upsertPerfilFamiliarAction } = await import("@/actions/perfil-familiar");

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("upsertPerfilFamiliarAction", () => {
  it("rejects a missing nombre without touching the session or database", async () => {
    const state = await upsertPerfilFamiliarAction(
      { status: "idle" },
      formData({ nombre: "", zona_id: VALID_ZONA_ID })
    );

    expect(state.status).toBe("error");
    expect(state.fieldErrors?.nombre).toBeTruthy();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("rejects a missing/free-text zona_id (not a UUID) without touching the session or database", async () => {
    const state = await upsertPerfilFamiliarAction(
      { status: "idle" },
      formData({ nombre: "Ana Test", zona_id: "Monterrey Centro" })
    );

    expect(state.status).toBe("error");
    expect(state.fieldErrors?.zonaId).toBeTruthy();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns a generic error with no session", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const state = await upsertPerfilFamiliarAction(
      { status: "idle" },
      formData({ nombre: "Ana Test", zona_id: VALID_ZONA_ID })
    );

    expect(state.status).toBe("error");
  });

  it("returns a generic error when the caller's profile is not role=familia (defense-in-depth)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const perfilFamiliarTable = makePerfilFamiliarTable({});
    currentServiceRoleClient = makeServiceRoleClient({
      profiles: makeProfilesTable({
        selectResult: { data: { role: "ninera", nombre: "Ana" }, error: null },
      }),
      zonas: makeZonasTable({}),
      perfil_familiar: perfilFamiliarTable,
    });

    const state = await upsertPerfilFamiliarAction(
      { status: "idle" },
      formData({ nombre: "Ana Test", zona_id: VALID_ZONA_ID })
    );

    expect(state.status).toBe("error");
    expect(perfilFamiliarTable.upsert).not.toHaveBeenCalled();
  });

  it("rejects a zona_id that doesn't exist in the zonas table", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const perfilFamiliarTable = makePerfilFamiliarTable({});
    currentServiceRoleClient = makeServiceRoleClient({
      profiles: makeProfilesTable({
        selectResult: { data: { role: "familia", nombre: "Ana" }, error: null },
      }),
      zonas: makeZonasTable({ selectResult: { data: null, error: null } }),
      perfil_familiar: perfilFamiliarTable,
    });

    const state = await upsertPerfilFamiliarAction(
      { status: "idle" },
      formData({ nombre: "Ana Test", zona_id: VALID_ZONA_ID })
    );

    expect(state.status).toBe("error");
    expect(state.fieldErrors?.zonaId).toBeTruthy();
    expect(perfilFamiliarTable.upsert).not.toHaveBeenCalled();
  });

  it("upserts perfil_familiar and updates profiles.nombre when it changed, then redirects to /familia", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const profilesTable = makeProfilesTable({
      selectResult: { data: { role: "familia", nombre: "Ana Vieja" }, error: null },
    });
    const perfilFamiliarTable = makePerfilFamiliarTable({});
    currentServiceRoleClient = makeServiceRoleClient({
      profiles: profilesTable,
      zonas: makeZonasTable({}),
      perfil_familiar: perfilFamiliarTable,
    });

    await expect(
      upsertPerfilFamiliarAction(
        { status: "idle" },
        formData({ nombre: "Ana Nueva", zona_id: VALID_ZONA_ID })
      )
    ).rejects.toThrow("REDIRECT:/familia");

    expect(profilesTable.update).toHaveBeenCalledWith({ nombre: "Ana Nueva" });
    expect(perfilFamiliarTable.upsert).toHaveBeenCalledWith(
      { profile_id: "user-1", zona_id: VALID_ZONA_ID },
      { onConflict: "profile_id" }
    );
  });

  it("does not write profiles.nombre when it is unchanged, but still upserts perfil_familiar", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const profilesTable = makeProfilesTable({
      selectResult: { data: { role: "familia", nombre: "Ana Test" }, error: null },
    });
    const perfilFamiliarTable = makePerfilFamiliarTable({});
    currentServiceRoleClient = makeServiceRoleClient({
      profiles: profilesTable,
      zonas: makeZonasTable({}),
      perfil_familiar: perfilFamiliarTable,
    });

    await expect(
      upsertPerfilFamiliarAction(
        { status: "idle" },
        formData({ nombre: "Ana Test", zona_id: VALID_ZONA_ID })
      )
    ).rejects.toThrow("REDIRECT:/familia");

    expect(profilesTable.update).not.toHaveBeenCalled();
    expect(perfilFamiliarTable.upsert).toHaveBeenCalledWith(
      { profile_id: "user-1", zona_id: VALID_ZONA_ID },
      { onConflict: "profile_id" }
    );
  });

  it("returns a generic error (not a crash) if the perfil_familiar upsert itself fails", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    currentServiceRoleClient = makeServiceRoleClient({
      profiles: makeProfilesTable({
        selectResult: { data: { role: "familia", nombre: "Ana Test" }, error: null },
      }),
      zonas: makeZonasTable({}),
      perfil_familiar: makePerfilFamiliarTable({ upsertResult: { error: { message: "db error" } } }),
    });

    const state = await upsertPerfilFamiliarAction(
      { status: "idle" },
      formData({ nombre: "Ana Test", zona_id: VALID_ZONA_ID })
    );

    expect(state.status).toBe("error");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
