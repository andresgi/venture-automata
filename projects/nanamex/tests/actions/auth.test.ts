import { beforeEach, describe, expect, it, vi } from "vitest";

// registerAction/loginAction call next/navigation's redirect() on success -- App Router's
// real redirect() throws a special control-flow error under the hood. Mocked here so a
// "successful" action path can be asserted without a full Next.js request context.
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const signUpMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const resendMock = vi.fn();
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      signUp: signUpMock,
      signInWithPassword: signInWithPasswordMock,
      resend: resendMock,
    },
  })),
}));

// Minimal fluent query-builder double covering exactly the chains actions/auth.ts uses
// (`.from("profiles").select(...).eq(...).maybeSingle()` and `.from("profiles").insert(...)`).
function makeProfilesTable(opts: {
  selectResult?: { data: unknown; error: unknown };
  insertResult?: { error: unknown };
}) {
  const selectResult = opts.selectResult ?? { data: null, error: null };
  const insertResult = opts.insertResult ?? { error: null };

  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => selectResult),
      })),
    })),
    insert: vi.fn(async (row: Record<string, unknown>) => {
      void row; // recorded via `insert.mock.calls` for assertions -- return value only needs `insertResult`.
      return insertResult;
    }),
  };
}

const deleteUserMock = vi.fn(async () => ({ error: null }));

function makeServiceRoleClient(profilesTable: ReturnType<typeof makeProfilesTable>) {
  return {
    from: vi.fn((table: string) => {
      if (table !== "profiles") throw new Error(`Unexpected table: ${table}`);
      return profilesTable;
    }),
    auth: { admin: { deleteUser: deleteUserMock } },
  };
}

let currentServiceRoleClient: ReturnType<typeof makeServiceRoleClient>;

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => currentServiceRoleClient),
}));

const { registerAction, loginAction, resendConfirmationEmailAction } = await import(
  "@/actions/auth"
);

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const validRegistration = {
  nombre: "Ana Test",
  correo: "ana@example.com",
  telefono: "8112345678",
  contrasena: "Password123",
  confirmarContrasena: "Password123",
  role: "familia",
};

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  });
});

describe("registerAction", () => {
  it("rejects an invalid submission without calling Supabase at all", async () => {
    currentServiceRoleClient = makeServiceRoleClient(makeProfilesTable({}));

    const state = await registerAction(
      { status: "idle" },
      formData({ ...validRegistration, correo: "not-an-email" })
    );

    expect(state.status).toBe("error");
    expect(state.fieldErrors?.correo).toBeTruthy();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("rejects a duplicate phone before ever calling Supabase Auth signUp (AUTH-02)", async () => {
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({ selectResult: { data: { id: "existing-id" }, error: null } })
    );

    const state = await registerAction({ status: "idle" }, formData(validRegistration));

    expect(state).toMatchObject({ status: "error", duplicate: true });
    expect(state.message).toMatch(/ya existe una cuenta/i);
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email (GoTrue's explicit user_already_exists error)", async () => {
    currentServiceRoleClient = makeServiceRoleClient(makeProfilesTable({}));
    signUpMock.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "User already registered" },
    });

    const state = await registerAction({ status: "idle" }, formData(validRegistration));

    expect(state).toMatchObject({ status: "error", duplicate: true });
    expect(state.message).toMatch(/ya existe una cuenta/i);
  });

  it("rejects a duplicate email via GoTrue's stable error.code, not just message text", async () => {
    currentServiceRoleClient = makeServiceRoleClient(makeProfilesTable({}));
    signUpMock.mockResolvedValueOnce({
      data: { user: null },
      error: { code: "user_already_exists", message: "some future wording" },
    });

    const state = await registerAction({ status: "idle" }, formData(validRegistration));

    expect(state).toMatchObject({ status: "error", duplicate: true });
  });

  it("rejects a duplicate email signalled via an empty identities array (defensive fallback)", async () => {
    currentServiceRoleClient = makeServiceRoleClient(makeProfilesTable({}));
    signUpMock.mockResolvedValueOnce({
      data: { user: { id: "user-1", identities: [] } },
      error: null,
    });

    const state = await registerAction({ status: "idle" }, formData(validRegistration));

    expect(state).toMatchObject({ status: "error", duplicate: true });
  });

  it("creates the profile row and redirects to /verificar on success", async () => {
    const profilesTable = makeProfilesTable({ insertResult: { error: null } });
    currentServiceRoleClient = makeServiceRoleClient(profilesTable);
    signUpMock.mockResolvedValueOnce({
      data: { user: { id: "user-1", identities: [{ id: "identity-1" }] } },
      error: null,
    });

    await expect(
      registerAction({ status: "idle" }, formData(validRegistration))
    ).rejects.toThrow("REDIRECT:/verificar");

    expect(profilesTable.insert).toHaveBeenCalledWith({
      id: "user-1",
      role: "familia",
      nombre: "Ana Test",
      phone: "+528112345678",
    });
    // Never sets email_verified/phone_verified from the registration path — those are
    // system-set only (db/migrations/20260902000007_security_hardening.sql).
    const insertArg = profilesTable.insert.mock.calls[0][0];
    expect(insertArg).not.toHaveProperty("email_verified");
    expect(insertArg).not.toHaveProperty("phone_verified");
  });

  it("gracefully handles a profile-insert failure instead of a raw error (defense-in-depth)", async () => {
    const profilesTable = makeProfilesTable({
      insertResult: { error: { code: "23505", message: "duplicate key value" } },
    });
    currentServiceRoleClient = makeServiceRoleClient(profilesTable);
    signUpMock.mockResolvedValueOnce({
      data: { user: { id: "user-1", identities: [{ id: "identity-1" }] } },
      error: null,
    });

    const state = await registerAction({ status: "idle" }, formData(validRegistration));

    expect(state).toMatchObject({ status: "error", duplicate: true });
    // Cleans up the now-orphaned auth user rather than leaving a stuck account.
    expect(deleteUserMock).toHaveBeenCalledWith("user-1");
  });

  it("never attempts to set profiles.role via an update -- only ever inserts", async () => {
    const profilesTable = makeProfilesTable({});
    currentServiceRoleClient = makeServiceRoleClient(profilesTable);
    signUpMock.mockResolvedValueOnce({
      data: { user: { id: "user-1", identities: [{ id: "identity-1" }] } },
      error: null,
    });

    await expect(
      registerAction({ status: "idle" }, formData(validRegistration))
    ).rejects.toThrow("REDIRECT:/verificar");

    expect(profilesTable).not.toHaveProperty("update");
  });
});

describe("loginAction", () => {
  it("returns a generic error on invalid credentials (never leaks whether the email exists)", async () => {
    currentServiceRoleClient = makeServiceRoleClient(makeProfilesTable({}));
    signInWithPasswordMock.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    const state = await loginAction(
      { status: "idle" },
      formData({ correo: "a@b.com", contrasena: "wrong" })
    );

    expect(state).toEqual({ status: "error", message: "Correo o contraseña incorrectos." });
  });

  it("returns the distinct 'confirma tu correo' state on GoTrue's email_not_confirmed error (AUTH-04)", async () => {
    currentServiceRoleClient = makeServiceRoleClient(makeProfilesTable({}));
    signInWithPasswordMock.mockResolvedValueOnce({
      data: { user: null },
      error: { code: "email_not_confirmed", message: "Email not confirmed" },
    });

    const state = await loginAction(
      { status: "idle" },
      formData({ correo: "ana@example.com", contrasena: "Password123" })
    );

    expect(state).toEqual({
      status: "error",
      message: "Confirma tu correo para iniciar sesión.",
      unconfirmedEmail: "ana@example.com",
    });
  });

  it("also recognizes email-not-confirmed via message text as a fallback when error.code is absent", async () => {
    currentServiceRoleClient = makeServiceRoleClient(makeProfilesTable({}));
    signInWithPasswordMock.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Email not confirmed" },
    });

    const state = await loginAction(
      { status: "idle" },
      formData({ correo: "ana@example.com", contrasena: "Password123" })
    );

    expect(state.unconfirmedEmail).toBe("ana@example.com");
  });

  it("redirects a familia account to its own home on success", async () => {
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({ selectResult: { data: { role: "familia" }, error: null } })
    );
    signInWithPasswordMock.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    await expect(
      loginAction({ status: "idle" }, formData({ correo: "a@b.com", contrasena: "Password123" }))
    ).rejects.toThrow("REDIRECT:/familia");
  });

  it("redirects to the preserved `next` path only when it belongs to the account's own role", async () => {
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({ selectResult: { data: { role: "ninera" }, error: null } })
    );
    signInWithPasswordMock.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    await expect(
      loginAction(
        { status: "idle" },
        formData({ correo: "a@b.com", contrasena: "Password123", next: "/ninera/perfil" })
      )
    ).rejects.toThrow("REDIRECT:/ninera/perfil");
  });

  it("ignores a `next` path belonging to a different role's route group", async () => {
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({ selectResult: { data: { role: "familia" }, error: null } })
    );
    signInWithPasswordMock.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    await expect(
      loginAction(
        { status: "idle" },
        formData({ correo: "a@b.com", contrasena: "Password123", next: "/admin/verificaciones" })
      )
    ).rejects.toThrow("REDIRECT:/familia");
  });
});

describe("resendConfirmationEmailAction", () => {
  it("re-triggers Supabase's confirmation email for the given correo (AUTH-04 'reenviar correo')", async () => {
    resendMock.mockResolvedValueOnce({ data: {}, error: null });

    const state = await resendConfirmationEmailAction(
      { status: "idle" },
      formData({ correo: "ana@example.com" })
    );

    expect(resendMock).toHaveBeenCalledWith({ type: "signup", email: "ana@example.com" });
    expect(state).toEqual({
      status: "sent",
      message: "Te reenviamos el correo de confirmación.",
    });
  });

  it("returns a graceful error if Supabase's resend call fails", async () => {
    resendMock.mockResolvedValueOnce({ data: null, error: { message: "rate limited" } });

    const state = await resendConfirmationEmailAction(
      { status: "idle" },
      formData({ correo: "ana@example.com" })
    );

    expect(state.status).toBe("error");
  });

  it("rejects an empty correo without calling Supabase", async () => {
    const state = await resendConfirmationEmailAction({ status: "idle" }, formData({ correo: "" }));

    expect(state.status).toBe("error");
    expect(resendMock).not.toHaveBeenCalled();
  });
});
