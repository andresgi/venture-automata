import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks Twilio's SDK entirely per this story's own validation note ("mock Twilio in tests --
// no real SMS sent in CI"). `twilio` is a CommonJS `export = fn` module -- with
// esModuleInterop, importing it as a default export is exactly how lib/twilio/verify.ts
// consumes it, so mocking `default` here is the correct shape to intercept.
const verificationsCreateMock = vi.fn();
const verificationChecksCreateMock = vi.fn();
const servicesMock = vi.fn(() => ({
  verifications: { create: verificationsCreateMock },
  verificationChecks: { create: verificationChecksCreateMock },
}));
const twilioClientFactoryMock = vi.fn(() => ({
  verify: { v2: { services: servicesMock } },
}));

vi.mock("twilio", () => ({ default: twilioClientFactoryMock }));

const ORIGINAL_ENV = { ...process.env };

function setValidTwilioEnv() {
  process.env.TWILIO_ACCOUNT_SID = "ACtest0000000000000000000000000";
  process.env.TWILIO_AUTH_TOKEN = "test_auth_token";
  process.env.TWILIO_VERIFY_SERVICE_SID = "VAtest0000000000000000000000000";
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

describe("lib/twilio/verify -- client construction", () => {
  it("does not construct a Twilio client at import time (lazy)", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    await import("@/lib/twilio/verify");

    expect(twilioClientFactoryMock).not.toHaveBeenCalled();
  });

  it("throws a clear, actionable error (not a silent no-op) when sending with missing credentials", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    const { sendVerificationCode } = await import("@/lib/twilio/verify");

    await expect(sendVerificationCode("+528112345678")).rejects.toThrow(
      /TWILIO_ACCOUNT_SID.*TWILIO_AUTH_TOKEN.*TWILIO_VERIFY_SERVICE_SID/
    );
    expect(twilioClientFactoryMock).not.toHaveBeenCalled();
  });

  it("throws the same missing-credentials error when checking with missing credentials", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    const { checkVerificationCode } = await import("@/lib/twilio/verify");

    await expect(checkVerificationCode("+528112345678", "123456")).rejects.toThrow(
      /Missing TWILIO_ACCOUNT_SID/
    );
  });

  it("constructs the client only once per module instance (cached across calls)", async () => {
    setValidTwilioEnv();
    verificationsCreateMock.mockResolvedValue({ status: "pending" });

    const { sendVerificationCode } = await import("@/lib/twilio/verify");
    await sendVerificationCode("+528112345678");
    await sendVerificationCode("+528112345678");

    expect(twilioClientFactoryMock).toHaveBeenCalledTimes(1);
  });
});

describe("lib/twilio/verify -- sendVerificationCode", () => {
  it("calls Twilio Verify's verifications.create with the right service/channel/destination", async () => {
    setValidTwilioEnv();
    verificationsCreateMock.mockResolvedValue({ status: "pending" });

    const { sendVerificationCode } = await import("@/lib/twilio/verify");
    await sendVerificationCode("+528112345678");

    expect(servicesMock).toHaveBeenCalledWith("VAtest0000000000000000000000000");
    expect(verificationsCreateMock).toHaveBeenCalledWith({
      to: "+528112345678",
      channel: "sms",
    });
  });

  it("wraps a Twilio max-send-attempts error as TwilioVerifyError(reason: rate_limited)", async () => {
    setValidTwilioEnv();
    verificationsCreateMock.mockRejectedValue({ status: 429, code: 60203, message: "Max send attempts reached" });

    const { sendVerificationCode, TwilioVerifyError } = await import("@/lib/twilio/verify");

    await expect(sendVerificationCode("+528112345678")).rejects.toBeInstanceOf(TwilioVerifyError);
    try {
      await sendVerificationCode("+528112345678");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TwilioVerifyError);
      expect((error as InstanceType<typeof TwilioVerifyError>).reason).toBe("rate_limited");
    }
  });

  it("wraps an invalid-phone-number Twilio error as TwilioVerifyError(reason: invalid_phone)", async () => {
    setValidTwilioEnv();
    verificationsCreateMock.mockRejectedValue({ status: 400, code: 60200, message: "Invalid parameter" });

    const { sendVerificationCode, TwilioVerifyError } = await import("@/lib/twilio/verify");

    try {
      await sendVerificationCode("+52not-a-real-number");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TwilioVerifyError);
      expect((error as InstanceType<typeof TwilioVerifyError>).reason).toBe("invalid_phone");
    }
  });

  it("wraps any other Twilio failure as TwilioVerifyError(reason: unknown) -- never a raw exception", async () => {
    setValidTwilioEnv();
    verificationsCreateMock.mockRejectedValue(new Error("ECONNRESET"));

    const { sendVerificationCode, TwilioVerifyError } = await import("@/lib/twilio/verify");

    try {
      await sendVerificationCode("+528112345678");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TwilioVerifyError);
      expect((error as InstanceType<typeof TwilioVerifyError>).reason).toBe("unknown");
    }
  });
});

describe("lib/twilio/verify -- checkVerificationCode", () => {
  it("returns true when Twilio reports the check as approved", async () => {
    setValidTwilioEnv();
    verificationChecksCreateMock.mockResolvedValue({ status: "approved" });

    const { checkVerificationCode } = await import("@/lib/twilio/verify");
    await expect(checkVerificationCode("+528112345678", "123456")).resolves.toBe(true);
    expect(verificationChecksCreateMock).toHaveBeenCalledWith({
      to: "+528112345678",
      code: "123456",
    });
  });

  it("returns false (not a throw) for a wrong code with attempts remaining (status: pending)", async () => {
    setValidTwilioEnv();
    verificationChecksCreateMock.mockResolvedValue({ status: "pending" });

    const { checkVerificationCode } = await import("@/lib/twilio/verify");
    await expect(checkVerificationCode("+528112345678", "000000")).resolves.toBe(false);
  });

  it("returns false (not a throw) when Twilio 404s on an expired/already-resolved verification", async () => {
    setValidTwilioEnv();
    verificationChecksCreateMock.mockRejectedValue({ status: 404, code: 20404, message: "Not found" });

    const { checkVerificationCode } = await import("@/lib/twilio/verify");
    await expect(checkVerificationCode("+528112345678", "123456")).resolves.toBe(false);
  });

  it("throws TwilioVerifyError(reason: rate_limited) on a max-check-attempts error", async () => {
    setValidTwilioEnv();
    verificationChecksCreateMock.mockRejectedValue({ status: 400, code: 60202, message: "Max check attempts reached" });

    const { checkVerificationCode, TwilioVerifyError } = await import("@/lib/twilio/verify");
    try {
      await checkVerificationCode("+528112345678", "123456");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TwilioVerifyError);
      expect((error as InstanceType<typeof TwilioVerifyError>).reason).toBe("rate_limited");
    }
  });
});
