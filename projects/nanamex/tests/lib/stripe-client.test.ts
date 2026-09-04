import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const expire = vi.fn();
vi.mock("stripe", () => ({ default: class Stripe { checkout = { sessions: { create, expire } }; } }));
const { createStripeCheckoutSession, expireStripeCheckoutSession } = await import("@/lib/stripe/client");

beforeEach(() => { vi.clearAllMocks(); process.env.STRIPE_SECRET_KEY = "sk_test_dummy"; create.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.test", expires_at: 1800000000 }); });

describe("Stripe checkout wrapper", () => {
  it("sends the exact MXN payload and idempotency boundary", async () => {
    await expect(createStripeCheckoutSession({ familiaId: "fam-1", paymentBoundaryId: "pay-1", idempotencyKey: "idem-1", successUrl: "https://safe/success", cancelUrl: "https://safe/cancel" })).resolves.toMatchObject({ sessionId: "cs_test_1", url: "https://checkout.test", expiresAt: new Date(1800000000 * 1000).toISOString() });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ mode: "payment", client_reference_id: "fam-1", metadata: { payment_boundary_id: "pay-1", familia_id: "fam-1", entitlement_tier: "contacto_30d" }, line_items: [{ quantity: 1, price_data: { currency: "mxn", unit_amount: 29900, product_data: { name: expect.any(String) } } }], success_url: "https://safe/success", cancel_url: "https://safe/cancel" }), { idempotencyKey: "idem-1" });
  });
  it("exposes compensation for an open session", async () => { await expireStripeCheckoutSession("cs_test_1"); expect(expire).toHaveBeenCalledWith("cs_test_1"); });
});
