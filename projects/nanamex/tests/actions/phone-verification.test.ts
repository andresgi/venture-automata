import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: getUserMock } })),
}));

const sendVerificationCodeMock = vi.fn();
const checkVerificationCodeMock = vi.fn();

class FakeTwilioVerifyError extends Error {
  reason: string;
  constructor(message: string, reason: string) {
    super(message);
    this.name = "TwilioVerifyError";
    this.reason = reason;
  }
}

vi.mock("@/lib/twilio/verify", () => ({
  sendVerificationCode: sendVerificationCodeMock,
  checkVerificationCode: checkVerificationCodeMock,
  TwilioVerifyError: FakeTwilioVerifyError,
}));

// Minimal fluent query-builder double covering exactly the chains actions/
// phone-verification.ts uses: `.from("profiles").select(...).eq(...).maybeSingle()` and
// `.from("profiles").update(...).eq(...)` (mirrors tests/actions/auth.test.ts's pattern).
function makeProfilesTable(opts: {
  selectResult?: { data: unknown; error: unknown };
  updateResult?: { error: unknown };
}) {
  const selectResult = opts.selectResult ?? { data: null, error: null };
  const updateResult = opts.updateResult ?? { error: null };

  const update = vi.fn((patch: Record<string, unknown>) => {
    void patch; // recorded via `update.mock.calls` for assertions.
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

function makeServiceRoleClient(profilesTable: ReturnType<typeof makeProfilesTable>) {
  return {
    from: vi.fn((table: string) => {
      if (table !== "profiles") throw new Error(`Unexpected table: ${table}`);
      return profilesTable;
    }),
  };
}

let currentServiceRoleClient: ReturnType<typeof makeServiceRoleClient>;

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => currentServiceRoleClient),
}));

const { sendPhoneOtpAction, confirmPhoneOtpAction } = await import("@/actions/phone-verification");

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendPhoneOtpAction", () => {
  it("returns a generic error with no session, without touching the database or Twilio", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    currentServiceRoleClient = makeServiceRoleClient(makeProfilesTable({}));

    const state = await sendPhoneOtpAction({ status: "idle" }, formData({}));

    expect(state.status).toBe("error");
    expect(sendVerificationCodeMock).not.toHaveBeenCalled();
  });

  it("returns a generic error when the profile has no phone on file", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({ selectResult: { data: { phone: null, phone_verified: false }, error: null } })
    );

    const state = await sendPhoneOtpAction({ status: "idle" }, formData({}));

    expect(state.status).toBe("error");
    expect(sendVerificationCodeMock).not.toHaveBeenCalled();
  });

  it("is a quiet success (no Twilio call) when the phone is already verified", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({
        selectResult: { data: { phone: "+528112345678", phone_verified: true }, error: null },
      })
    );

    const state = await sendPhoneOtpAction({ status: "idle" }, formData({}));

    expect(state).toEqual({ status: "sent" });
    expect(sendVerificationCodeMock).not.toHaveBeenCalled();
  });

  it("enforces the ~60s app-layer resend cooldown before ever calling Twilio", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const recentSend = new Date(Date.now() - 10_000).toISOString(); // 10s ago
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({
        selectResult: {
          data: { phone: "+528112345678", phone_verified: false, phone_otp_last_sent_at: recentSend },
          error: null,
        },
      })
    );

    const state = await sendPhoneOtpAction({ status: "idle" }, formData({}));

    expect(state.status).toBe("cooldown");
    expect(state.cooldownSecondsRemaining).toBeGreaterThan(0);
    expect(state.cooldownSecondsRemaining).toBeLessThanOrEqual(60);
    expect(sendVerificationCodeMock).not.toHaveBeenCalled();
  });

  it("sends via Twilio and stamps phone_otp_last_sent_at once the cooldown has elapsed", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const oldSend = new Date(Date.now() - 120_000).toISOString(); // 2 minutes ago
    const profilesTable = makeProfilesTable({
      selectResult: {
        data: { phone: "+528112345678", phone_verified: false, phone_otp_last_sent_at: oldSend },
        error: null,
      },
    });
    currentServiceRoleClient = makeServiceRoleClient(profilesTable);
    sendVerificationCodeMock.mockResolvedValue(undefined);

    const state = await sendPhoneOtpAction({ status: "idle" }, formData({}));

    expect(state).toEqual({ status: "sent" });
    expect(sendVerificationCodeMock).toHaveBeenCalledWith("+528112345678");
    expect(profilesTable.update).toHaveBeenCalledWith({
      phone_otp_last_sent_at: expect.any(String),
    });
    // Never touches phone_verified or email_verified from the send path.
    const updateArg = profilesTable.update.mock.calls[0][0];
    expect(updateArg).not.toHaveProperty("phone_verified");
    expect(updateArg).not.toHaveProperty("email_verified");
  });

  it("sends on a first-ever attempt with no prior phone_otp_last_sent_at", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const profilesTable = makeProfilesTable({
      selectResult: {
        data: { phone: "+528112345678", phone_verified: false, phone_otp_last_sent_at: null },
        error: null,
      },
    });
    currentServiceRoleClient = makeServiceRoleClient(profilesTable);
    sendVerificationCodeMock.mockResolvedValue(undefined);

    const state = await sendPhoneOtpAction({ status: "idle" }, formData({}));

    expect(state).toEqual({ status: "sent" });
    expect(sendVerificationCodeMock).toHaveBeenCalledTimes(1);
  });

  it("maps a Twilio rate_limited error to a safe user-facing message, not a raw exception", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({
        selectResult: {
          data: { phone: "+528112345678", phone_verified: false, phone_otp_last_sent_at: null },
          error: null,
        },
      })
    );
    sendVerificationCodeMock.mockRejectedValue(
      new FakeTwilioVerifyError("Max send attempts reached", "rate_limited")
    );

    const state = await sendPhoneOtpAction({ status: "idle" }, formData({}));

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/límite de envíos/i);
  });

  it("maps a Twilio invalid_phone error to a safe user-facing message", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({
        selectResult: {
          data: { phone: "+528112345678", phone_verified: false, phone_otp_last_sent_at: null },
          error: null,
        },
      })
    );
    sendVerificationCodeMock.mockRejectedValue(
      new FakeTwilioVerifyError("Invalid parameter", "invalid_phone")
    );

    const state = await sendPhoneOtpAction({ status: "idle" }, formData({}));

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/número de teléfono/i);
  });

  it("maps any other Twilio/unknown failure to the generic safe message", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({
        selectResult: {
          data: { phone: "+528112345678", phone_verified: false, phone_otp_last_sent_at: null },
          error: null,
        },
      })
    );
    sendVerificationCodeMock.mockRejectedValue(new Error("ECONNRESET"));

    const state = await sendPhoneOtpAction({ status: "idle" }, formData({}));

    expect(state).toEqual({ status: "error", message: "No se pudo enviar el código. Intenta de nuevo." });
  });
});

describe("confirmPhoneOtpAction", () => {
  it("rejects a malformed code without touching the session or database", async () => {
    const state = await confirmPhoneOtpAction({ status: "idle" }, formData({ code: "abc" }));

    expect(state.status).toBe("error");
    expect(getUserMock).not.toHaveBeenCalled();
    expect(checkVerificationCodeMock).not.toHaveBeenCalled();
  });

  it("returns a generic error with no session", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const state = await confirmPhoneOtpAction({ status: "idle" }, formData({ code: "123456" }));

    expect(state.status).toBe("error");
    expect(checkVerificationCodeMock).not.toHaveBeenCalled();
  });

  it("short-circuits to verified without calling Twilio if already phone_verified", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({ selectResult: { data: { phone: "+528112345678", phone_verified: true }, error: null } })
    );

    const state = await confirmPhoneOtpAction({ status: "idle" }, formData({ code: "123456" }));

    expect(state).toEqual({ status: "verified" });
    expect(checkVerificationCodeMock).not.toHaveBeenCalled();
  });

  it("sets phone_verified=true on a correct code, and touches no other column (AUTH-03/E0-05 acceptance criteria)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const profilesTable = makeProfilesTable({
      selectResult: { data: { phone: "+528112345678", phone_verified: false }, error: null },
    });
    currentServiceRoleClient = makeServiceRoleClient(profilesTable);
    checkVerificationCodeMock.mockResolvedValue(true);

    const state = await confirmPhoneOtpAction({ status: "idle" }, formData({ code: "123456" }));

    expect(state).toEqual({ status: "verified" });
    expect(checkVerificationCodeMock).toHaveBeenCalledWith("+528112345678", "123456");
    expect(profilesTable.update).toHaveBeenCalledWith({ phone_verified: true });
    const updateArg = profilesTable.update.mock.calls[0][0];
    expect(updateArg).not.toHaveProperty("email_verified");
  });

  it("shows an inline error on an invalid/expired code and never writes to the database at all", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const profilesTable = makeProfilesTable({
      selectResult: { data: { phone: "+528112345678", phone_verified: false }, error: null },
    });
    currentServiceRoleClient = makeServiceRoleClient(profilesTable);
    checkVerificationCodeMock.mockResolvedValue(false);

    const state = await confirmPhoneOtpAction({ status: "idle" }, formData({ code: "000000" }));

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/incorrecto o ya expiró/i);
    // The core acceptance criterion: an invalid/expired code never disturbs any verification
    // state -- not phone_verified, and certainly not email_verified -- it's a pure read.
    expect(profilesTable.update).not.toHaveBeenCalled();
  });

  it("maps a Twilio max-check-attempts (rate_limited) error to a safe user-facing message", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({ selectResult: { data: { phone: "+528112345678", phone_verified: false }, error: null } })
    );
    checkVerificationCodeMock.mockRejectedValue(
      new FakeTwilioVerifyError("Max check attempts reached", "rate_limited")
    );

    const state = await confirmPhoneOtpAction({ status: "idle" }, formData({ code: "123456" }));

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/límite de intentos/i);
  });

  it("maps any other Twilio/unknown check failure to the generic safe message, not a raw exception", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({ selectResult: { data: { phone: "+528112345678", phone_verified: false }, error: null } })
    );
    checkVerificationCodeMock.mockRejectedValue(new Error("ECONNRESET"));

    const state = await confirmPhoneOtpAction({ status: "idle" }, formData({ code: "123456" }));

    expect(state).toEqual({
      status: "error",
      message: "No se pudo verificar el código. Intenta de nuevo.",
    });
  });

  it("returns a generic error (not a crash) if the phone_verified update itself fails", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    currentServiceRoleClient = makeServiceRoleClient(
      makeProfilesTable({
        selectResult: { data: { phone: "+528112345678", phone_verified: false }, error: null },
        updateResult: { error: { message: "db error" } },
      })
    );
    checkVerificationCodeMock.mockResolvedValue(true);

    const state = await confirmPhoneOtpAction({ status: "idle" }, formData({ code: "123456" }));

    expect(state.status).toBe("error");
  });
});
