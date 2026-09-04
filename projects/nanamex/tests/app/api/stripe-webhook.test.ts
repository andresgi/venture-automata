import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import Stripe from "stripe";

/**
 * E5-02: unlike most Supabase-backed tests in this repo, this test does NOT mock the Stripe
 * SDK's signature verification -- it uses Stripe's own officially documented test helper
 * (`stripe.webhooks.generateTestHeaderString`) to compute a genuinely valid signature for a
 * test-mode secret, then exercises the real `constructEvent` verification path inside
 * lib/stripe/client.ts. Only the network-touching pieces (Checkout Session creation, which
 * this route never calls) and the Supabase RPC call are mocked -- per this story's
 * instruction to mock the SDK "using Stripe's documented test-signing-secret pattern ... or
 * the officially documented test helper," this uses the latter for stronger coverage of the
 * actual signature-rejection logic instead of stubbing it away entirely.
 */

const TEST_WEBHOOK_SECRET = "whsec_test_e5_02_dummy_secret";
const stripeForSigning = new Stripe("sk_test_dummy_for_signing_only");

function signedRequest(body: string, secret = TEST_WEBHOOK_SECRET, signatureOverride?: string) {
  const signature =
    signatureOverride ?? stripeForSigning.webhooks.generateTestHeaderString({ payload: body, secret });
  return new NextRequest("https://clin.example/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    body,
  });
}

function checkoutSessionEvent(type: string, sessionId: string): string {
  return JSON.stringify({
    id: "evt_test_1",
    object: "event",
    type,
    data: { object: { id: sessionId, object: "checkout.session" } },
  });
}

const rpcMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({ rpc: rpcMock })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
  process.env.STRIPE_WEBHOOK_SIGNING_SECRET = TEST_WEBHOOK_SECRET;
  rpcMock.mockReturnValue({
    maybeSingle: vi.fn(async () => ({ data: { already_finalized: false }, error: null })),
  });
});

describe("POST /api/webhooks/stripe", () => {
  it("rejects a request with no stripe-signature header, before touching the database", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const body = checkoutSessionEvent("checkout.session.completed", "cs_test_1");
    const request = new NextRequest("https://clin.example/api/webhooks/stripe", {
      method: "POST",
      body,
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid/forged signature, before touching the database", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const body = checkoutSessionEvent("checkout.session.completed", "cs_test_1");
    const request = signedRequest(body, TEST_WEBHOOK_SECRET, "t=1,v1=deadbeef");
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects a payload signed with the wrong secret", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const body = checkoutSessionEvent("checkout.session.completed", "cs_test_1");
    const request = signedRequest(body, "whsec_wrong_secret");
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects a tampered body even with a validly-shaped signature header", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const signedBody = checkoutSessionEvent("checkout.session.completed", "cs_test_1");
    const signature = stripeForSigning.webhooks.generateTestHeaderString({
      payload: signedBody,
      secret: TEST_WEBHOOK_SECRET,
    });
    const tamperedBody = checkoutSessionEvent("checkout.session.completed", "cs_test_ATTACKER");
    const request = new NextRequest("https://clin.example/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body: tamperedBody,
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("finalizes a verified checkout.session.completed as exitoso", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const body = checkoutSessionEvent("checkout.session.completed", "cs_test_1");
    const response = await POST(signedRequest(body));
    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("finalize_stripe_payment", {
      p_provider_payment_id: "cs_test_1",
      p_outcome: "exitoso",
    });
  });

  it("finalizes a verified checkout.session.expired as fallido", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const body = checkoutSessionEvent("checkout.session.expired", "cs_test_2");
    const response = await POST(signedRequest(body));
    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("finalize_stripe_payment", {
      p_provider_payment_id: "cs_test_2",
      p_outcome: "fallido",
    });
  });

  it("acknowledges but ignores an unhandled event type without calling the RPC", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const body = checkoutSessionEvent("payment_intent.created", "pi_test_1");
    const response = await POST(signedRequest(body));
    expect(response.status).toBe(200);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("is idempotent on a redelivered event: reports already_finalized without erroring", async () => {
    rpcMock.mockReturnValue({
      maybeSingle: vi.fn(async () => ({ data: { already_finalized: true }, error: null })),
    });
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const body = checkoutSessionEvent("checkout.session.completed", "cs_test_1");
    const response = await POST(signedRequest(body));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.alreadyFinalized).toBe(true);
  });

  it("acknowledges (200) a payment_not_found RPC error instead of causing a retry storm", async () => {
    rpcMock.mockReturnValue({
      maybeSingle: vi.fn(async () => ({ data: null, error: { message: "payment_not_found", code: "P0001" } })),
    });
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const body = checkoutSessionEvent("checkout.session.completed", "cs_test_missing");
    const response = await POST(signedRequest(body));
    expect(response.status).toBe(200);
  });

  it("returns 500 (retryable) on an unexpected RPC error", async () => {
    rpcMock.mockReturnValue({
      maybeSingle: vi.fn(async () => ({ data: null, error: { message: "db_unavailable", code: "XX000" } })),
    });
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const body = checkoutSessionEvent("checkout.session.completed", "cs_test_1");
    const response = await POST(signedRequest(body));
    expect(response.status).toBe(500);
  });
});
