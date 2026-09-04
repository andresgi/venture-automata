/* The fluent Supabase test double intentionally uses dynamic query methods. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/auth-server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })) }));
const createStripe = vi.fn();
const expireStripe = vi.fn();
const getStripeSession = vi.fn();
vi.mock("@/lib/stripe/client", () => ({ createStripeCheckoutSession: createStripe, expireStripeCheckoutSession: expireStripe, getStripeCheckoutSession: getStripeSession, CONTACTO_30D_PRICE_MXN_CENTS: 29900 }));

type TableConfig = { select?: { data: any; error: any }; insert?: { data: any; error: any }; update?: { data: any; error: any }; updateSequence?: { data: any; error: any }[] };
function table(config: TableConfig) {
  let inserted = false;
  let updated = false;
  const query: any = {
    select: vi.fn(() => query), eq: vi.fn(() => query), is: vi.fn(() => query), or: vi.fn(() => query), gt: vi.fn(() => query), order: vi.fn(() => query),
    limit: vi.fn(() => query), contains: vi.fn(() => query),
    maybeSingle: vi.fn(async () => config.select ?? { data: null, error: null }),
     single: vi.fn(async () => updated ? (config.updateSequence?.shift() ?? config.update ?? { data: { id: "payment-1" }, error: null }) : inserted ? (config.insert ?? { data: null, error: null }) : (config.select ?? { data: null, error: null })),
    insert: vi.fn(() => { inserted = true; return query; }), update: vi.fn(() => { updated = true; return query; }),
    then: (resolve: (v: any) => any) => Promise.resolve(config.update ?? { data: null, error: null }).then(resolve),
  };
  return query;
}
let tables: Record<string, any>;
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: vi.fn(() => ({ from: (name: string) => tables[name] })) }));
const { createCheckoutSessionAction } = await import("@/actions/entitlements");

const input = { necesidadId: "11111111-1111-4111-8111-111111111111", nineraId: "22222222-2222-4222-8222-222222222222" };
const profile = { data: { role: "familia", account_status: "activa", email_verified: true, phone_verified: true }, error: null };
const necesidad = { data: { id: input.necesidadId, familia_id: "user-1", estado: "activa", zona_id: "zona-1", modalidad: "ocasional", pago_min: 100, pago_max: 200, dias_horarios: [{ dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" }], necesidad_children: [{ rango_edad: "3-6" }], zonas: { alcaldia_municipio: "Centro" } }, error: null };
const candidate = { data: { profile_id: input.nineraId, disponibilidad: [{ dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" }], salario_min: 100, salario_max: 200, modalidades_aceptadas: ["ocasional"], anos_experiencia: 3, profiles: { role: "ninera", account_status: "activa" }, ninera_zonas: [{ zona_id: "zona-1", zonas: { alcaldia_municipio: "Centro" } }], ninera_experiencia_edades: [{ rango_edad: "3-6" }] }, error: null };

function setup(overrides: Record<string, TableConfig> = {}) {
  tables = {
    profiles: table({ select: profile }), necesidades: table({ select: necesidad }), perfil_ninera: table({ select: candidate }),
    entitlements: table({ select: { data: null, error: null } }),
    payments: table({ insert: { data: { id: "payment-1", idempotency_key: "idem-1", checkout_url: null }, error: null }, select: { data: null, error: null }, ...overrides.payments }),
  };
  for (const [name, config] of Object.entries(overrides)) if (name !== "payments") tables[name] = table(config);
}
beforeEach(() => { vi.clearAllMocks(); getUser.mockResolvedValue({ data: { user: { id: "user-1" } } }); createStripe.mockResolvedValue({ sessionId: "cs_test_123", url: "https://checkout.stripe.com/test", expiresAt: new Date(Date.now() + 3600000).toISOString() }); getStripeSession.mockResolvedValue({ state: "open", expiresAt: new Date(Date.now() + 3600000).toISOString() }); setup(); delete process.env.APP_URL; });

describe("createCheckoutSessionAction", () => {
  it("rejects malformed UUIDs without touching auth", async () => { const r = await createCheckoutSessionAction({ necesidadId: "bad", nineraId: "bad" } as any); expect(r.status).toBe("error"); expect(getUser).not.toHaveBeenCalled(); });
  it("requires an authenticated familia and both verified channels", async () => { getUser.mockResolvedValue({ data: { user: null } }); expect((await createCheckoutSessionAction(input)).status).toBe("error"); getUser.mockResolvedValue({ data: { user: { id: "user-1" } } }); setup({ profiles: { select: { data: { role: "familia", account_status: "activa", email_verified: true, phone_verified: false }, error: null } } }); expect((await createCheckoutSessionAction(input)).status).toBe("blocked_unverified"); });
  it("rejects an unauthorized or ineligible pair before Stripe", async () => { setup({ necesidades: { select: { data: null, error: null } } }); expect((await createCheckoutSessionAction(input)).status).toBe("error"); expect(createStripe).not.toHaveBeenCalled(); });
  it.each([
    ["suspended family", { profiles: { select: { data: { ...profile.data, account_status: "suspendida" }, error: null } } }],
    ["non-ninera candidate", { perfil_ninera: { select: { data: { ...candidate.data, profiles: { role: "familia", account_status: "activa" } }, error: null } } }],
    ["availability mismatch", { perfil_ninera: { select: { data: { ...candidate.data, disponibilidad: [] }, error: null } } }],
    ["salary mismatch", { perfil_ninera: { select: { data: { ...candidate.data, salario_min: 500, salario_max: 600 }, error: null } } }],
    ["child-age mismatch", { perfil_ninera: { select: { data: { ...candidate.data, ninera_experiencia_edades: [{ rango_edad: "12+" }] }, error: null } } }],
    ["experience below minimum", { perfil_ninera: { select: { data: { ...candidate.data, anos_experiencia: 1 }, error: null } } }],
  ])("rejects %s at payment initiation", async (_label, overrides) => {
    setup(overrides as any);
    expect((await createCheckoutSessionAction(input)).status).toBe("error");
    expect(createStripe).not.toHaveBeenCalled();
  });
  it("fails closed when entitlement lookup fails", async () => { setup({ entitlements: { select: { data: null, error: { code: "outage" } } } }); expect((await createCheckoutSessionAction(input)).status).toBe("error"); expect(createStripe).not.toHaveBeenCalled(); });
  it("short-circuits an active entitlement", async () => { const expiry = new Date(Date.now() + 10000).toISOString(); setup({ entitlements: { select: { data: { expires_at: expiry }, error: null } } }); expect((await createCheckoutSessionAction(input)).status).toBe("already_entitled"); expect(createStripe).not.toHaveBeenCalled(); });
  it("persists the local boundary before creating Stripe and links it afterward", async () => { const r = await createCheckoutSessionAction(input); expect(r.status).toBe("checkout_created"); expect(tables.payments.insert).toHaveBeenCalledWith(expect.objectContaining({ familia_id: "user-1", status: "pendiente" })); expect(createStripe).toHaveBeenCalledWith(expect.objectContaining({ paymentBoundaryId: "payment-1", idempotencyKey: "idem-1" })); expect(tables.payments.update).toHaveBeenCalledWith(expect.objectContaining({ provider_payment_id: "cs_test_123", checkout_url: "https://checkout.stripe.com/test" })); });
  it("persists Stripe's session expiry with the linked boundary", async () => { await createCheckoutSessionAction(input); expect(tables.payments.update).toHaveBeenCalledWith(expect.objectContaining({ provider_session_expires_at: expect.any(String) })); });
  it("uses configured APP_URL, never request headers", async () => { process.env.APP_URL = "https://safe.clin.example"; await createCheckoutSessionAction(input); expect(createStripe.mock.calls[0][0].successUrl).toMatch(/^https:\/\/safe\.clin\.example\//); });
  it("rejects an unsafe configured redirect origin before creating a payment boundary", async () => { process.env.APP_URL = "https://attacker.example/path?next=1"; expect((await createCheckoutSessionAction(input)).status).toBe("error"); expect(createStripe).not.toHaveBeenCalled(); expect(tables.payments.insert).not.toHaveBeenCalled(); expect(tables.payments.update).not.toHaveBeenCalled(); });
  it("compensates if linking Stripe to the durable row fails", async () => { setup({ payments: { select: { data: { status: "pendiente" }, error: null }, updateSequence: [{ data: { id: "payment-1" }, error: null }, { data: null, error: { code: "db_down" } }, { data: null, error: { code: "db_down" } }, { data: null, error: { code: "db_down" } }], update: { data: null, error: { code: "db_down" } }, insert: { data: { id: "payment-1", idempotency_key: "idem-1" }, error: null } } }); expect((await createCheckoutSessionAction(input)).status).toBe("error"); expect(expireStripe).toHaveBeenCalledWith("cs_test_123"); });
  it("treats a zero-row link as a failed link and compensates", async () => { setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-1", status: "pendiente" }, error: null }, updateSequence: [{ data: { id: "payment-1" }, error: null }, { data: null, error: null }, { data: null, error: null }], update: { data: { id: "payment-1" }, error: null }, insert: { data: { id: "payment-1", idempotency_key: "idem-1" }, error: null } } }); expect((await createCheckoutSessionAction(input)).status).toBe("error"); expect(expireStripe).toHaveBeenCalledWith("cs_test_123"); });
  it("allows a retry after successful compensation with a rotated idempotency key", async () => {
    setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-1", status: "pendiente" }, error: null }, updateSequence: [{ data: { id: "payment-1" }, error: null }, { data: null, error: { code: "db_down" } }, { data: null, error: { code: "db_down" } }], update: { data: { id: "payment-1" }, error: null }, insert: { data: { id: "payment-1", idempotency_key: "idem-1" }, error: null } } });
    expect((await createCheckoutSessionAction(input)).status).toBe("error");
    expect(expireStripe).toHaveBeenCalledOnce();
    setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-rotated", provider_payment_id: null, checkout_url: null, provider_session_status: "expired" }, error: null }, update: { data: { id: "payment-1" }, error: null }, insert: { data: { id: "payment-1", idempotency_key: "idem-rotated" }, error: null } } });
    expect((await createCheckoutSessionAction(input)).status).toBe("checkout_created");
    expect(createStripe).toHaveBeenLastCalledWith(expect.objectContaining({ idempotencyKey: "idem-rotated" }));
  });
  it("keeps provider metadata recoverable when compensation is uncertain", async () => {
    expireStripe.mockRejectedValueOnce(new Error("provider unavailable"));
    setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-1", status: "pendiente" }, error: null }, updateSequence: [{ data: { id: "payment-1" }, error: null }, { data: null, error: { code: "db_down" } }, { data: null, error: { code: "db_down" } }], update: { data: { id: "payment-1" }, error: null }, insert: { data: { id: "payment-1", idempotency_key: "idem-1" }, error: null } } });
    expect((await createCheckoutSessionAction(input)).status).toBe("error");
    expect(tables.payments.update).toHaveBeenLastCalledWith(expect.objectContaining({ provider_payment_id: "cs_test_123", checkout_url: "https://checkout.stripe.com/test", provider_session_status: "unknown", provider_session_expires_at: expect.any(String) }));
    expect(createStripe).toHaveBeenCalledWith(expect.objectContaining({ paymentBoundaryId: "payment-1" }));
  });
  it("fails closed and verifies the idempotent provider session after final recovery persistence fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-1", status: "pendiente" }, error: null }, updateSequence: [{ data: { id: "payment-1" }, error: null }, { data: null, error: { code: "db_down" } }, { data: null, error: { code: "db_down" } }], update: { data: null, error: { code: "db_down" } }, insert: { data: { id: "payment-1", idempotency_key: "idem-1" }, error: null } } });
    expect((await createCheckoutSessionAction(input)).status).toBe("error");
    expect(errorSpy).toHaveBeenCalledWith("Stripe checkout recovery state persistence failed", expect.objectContaining({ providerSessionId: "cs_test_123" }));
    expect(expireStripe).toHaveBeenCalledWith("cs_test_123");

    // The local row still has no provider ID/key rotation. Stripe idempotency and
    // payment_boundary_id metadata are therefore the recovery fallback.
    setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-1", provider_payment_id: null, checkout_url: null, status: "pendiente" }, error: null }, update: { data: { id: "payment-1" }, error: null }, insert: { data: { id: "payment-1", idempotency_key: "idem-1" }, error: null } } });
    getStripeSession.mockResolvedValueOnce({ state: "open", expiresAt: new Date(Date.now() + 3600000).toISOString() });
    expect(await createCheckoutSessionAction(input)).toEqual({ status: "checkout_created", checkoutUrl: "https://checkout.stripe.com/test" });
    expect(createStripe).toHaveBeenLastCalledWith(expect.objectContaining({ idempotencyKey: "idem-1", paymentBoundaryId: "payment-1" }));
    expect(getStripeSession).toHaveBeenCalledWith("cs_test_123");
    errorSpy.mockRestore();
  });
  it("allows only one caller through the checkout lease", async () => {
    setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-1", checkout_url: null, provider_payment_id: null }, error: null }, updateSequence: [{ data: { id: "payment-1" }, error: null }, { data: null, error: { code: "lease_taken" } }], update: { data: { id: "payment-1" }, error: null }, insert: { data: { id: "payment-1", idempotency_key: "idem-1" }, error: null } } });
    createStripe.mockImplementationOnce(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); return { sessionId: "cs_test_123", url: "https://checkout.stripe.com/test", expiresAt: new Date(Date.now() + 3600000).toISOString() }; });
    const results = await Promise.all([createCheckoutSessionAction(input), createCheckoutSessionAction(input)]);
    expect(createStripe).toHaveBeenCalledOnce();
    expect(results.some((result) => result.status === "error")).toBe(true);
  });
  it("reuses a pending open checkout URL rather than creating another session", async () => { setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-1", provider_payment_id: "cs_existing", checkout_url: "https://existing" }, error: null } } }); expect(await createCheckoutSessionAction(input)).toEqual({ status: "checkout_created", checkoutUrl: "https://existing" }); expect(createStripe).not.toHaveBeenCalled(); });
  it("does not return a provider-expired pending URL", async () => { getStripeSession.mockResolvedValueOnce({ state: "expired", expiresAt: new Date(Date.now() - 1000).toISOString() }).mockResolvedValueOnce({ state: "open", expiresAt: new Date(Date.now() + 3600000).toISOString() }); setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-1", provider_payment_id: "cs_old", checkout_url: "https://old" }, error: null } } }); expect((await createCheckoutSessionAction(input)).status).toBe("checkout_created"); expect(createStripe).toHaveBeenCalled(); });
  it("does not reuse an open pending URL when Stripe omits expiry", async () => { getStripeSession.mockResolvedValueOnce({ state: "open", expiresAt: null }).mockResolvedValueOnce({ state: "open", expiresAt: new Date(Date.now() + 3600000).toISOString() }); setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-1", provider_payment_id: "cs_old", checkout_url: "https://old" }, error: null } } }); expect((await createCheckoutSessionAction(input)).status).toBe("checkout_created"); expect(createStripe).toHaveBeenCalled(); });

  // Code Review (agent/reviews/code-E5-01-review.md) Important Issue #2: the post-create
  // re-verification branch (an existing boundary retry receiving a session via Stripe's own
  // idempotency key) was only ever exercised by its success path. These three assert the
  // fail-closed behavior for each unsafe provider response -- the URL must never be returned.
  it("fails closed when Stripe reports the post-create session already complete (existing-boundary retry)", async () => {
    getStripeSession.mockResolvedValueOnce({ state: "complete", expiresAt: new Date(Date.now() + 3600000).toISOString() });
    setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-1", checkout_url: null, provider_payment_id: null, status: "pendiente" }, error: null }, update: { data: { id: "payment-1" }, error: null } } });
    const result = await createCheckoutSessionAction(input);
    expect(result.status).toBe("error");
    expect(result).not.toHaveProperty("checkoutUrl");
    expect(getStripeSession).toHaveBeenCalledWith("cs_test_123");
  });
  it("fails closed when Stripe reports the post-create session already expired (existing-boundary retry)", async () => {
    getStripeSession.mockResolvedValueOnce({ state: "expired", expiresAt: new Date(Date.now() - 1000).toISOString() });
    setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-1", checkout_url: null, provider_payment_id: null, status: "pendiente" }, error: null }, update: { data: { id: "payment-1" }, error: null } } });
    const result = await createCheckoutSessionAction(input);
    expect(result.status).toBe("error");
    expect(result).not.toHaveProperty("checkoutUrl");
  });
  it("fails closed when Stripe omits expiry on the post-create session (existing-boundary retry)", async () => {
    getStripeSession.mockResolvedValueOnce({ state: "open", expiresAt: null });
    setup({ payments: { select: { data: { id: "payment-1", idempotency_key: "idem-1", checkout_url: null, provider_payment_id: null, status: "pendiente" }, error: null }, update: { data: { id: "payment-1" }, error: null } } });
    const result = await createCheckoutSessionAction(input);
    expect(result.status).toBe("error");
    expect(result).not.toHaveProperty("checkoutUrl");
  });
});
