import "server-only";
import Stripe from "stripe";

/**
 * Stripe client wrapper (E5-01; engineering/architecture.md §16, §16.4, §20). Mirrors
 * lib/twilio/verify.ts's lazy-construction pattern exactly: the SDK client is only built
 * inside `getStripeClient()`, the first time a caller actually needs it, so this module can
 * be safely imported in any environment (tests, local dev with `.env.example`'s
 * `STRIPE_SECRET_KEY` still a placeholder) without crashing at import time. It still fails
 * loudly -- an explicit thrown `Error`, not a silent no-op -- the moment someone actually
 * tries to create/retrieve/expire a Checkout Session with no key configured.
 *
 * This project has no real Stripe account yet (human decision, agent/DECISIONS.md's E5-01
 * entry -- same posture as E0-05's Twilio integration before real credentials existed) --
 * `.env.example`'s `STRIPE_SECRET_KEY` is a `sk_test_...`-shaped placeholder only, and every
 * automated test mocks this module entirely rather than exercising the real Stripe SDK/
 * network (see tests/actions/entitlements.test.ts).
 */

let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY environment variable -- see .env.example. Stripe Checkout " +
        "cannot create/retrieve/expire a session without it."
    );
  }

  cachedClient = new Stripe(secretKey);
  return cachedClient;
}

/** MX$299 flat price for the single V1 entitlement tier (architecture.md §16.1), in cents
 * (MXN) -- Stripe's `unit_amount` is always the smallest currency unit. */
export const CONTACTO_30D_PRICE_MXN_CENTS = 29900;

export interface CreateCheckoutSessionParams {
  familiaId: string;
  /** `payments.id` -- the durable local boundary row this session is being linked to
   * (architecture.md §16.4). Sent as Stripe metadata so E5-02's webhook, and any manual
   * reconciliation, can recover the boundary even if the local link-back update fails. */
  paymentBoundaryId: string;
  /** `payments.idempotency_key` -- passed through as Stripe's own request idempotency key
   * (architecture.md §16.4), so a retried request with the same boundary can never create a
   * second chargeable session. */
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
  /** Stripe's Checkout Session `expires_at`, normalized from Unix seconds to an ISO string
   * (architecture.md §16.4) -- null only if Stripe omits it, which the caller must treat as
   * "cannot be trusted as open." */
  expiresAt: string | null;
}

function toIsoString(unixSeconds: number | null | undefined): string | null {
  return typeof unixSeconds === "number" ? new Date(unixSeconds * 1000).toISOString() : null;
}

/**
 * Creates a single-line-item Stripe Checkout Session for the `contacto_30d` entitlement
 * (architecture.md §16.1, §16.4; database.md §9). Entitlement activation itself only ever
 * happens in the E5-02 webhook handler on a confirmed successful payment -- this function
 * never writes to `entitlements`.
 */
export async function createStripeCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: params.familiaId,
      metadata: {
        familia_id: params.familiaId,
        payment_boundary_id: params.paymentBoundaryId,
        entitlement_tier: "contacto_30d",
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "mxn",
            unit_amount: CONTACTO_30D_PRICE_MXN_CENTS,
            product_data: {
              name: "Clin -- Contacta candidatas durante 30 días",
            },
          },
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    },
    { idempotencyKey: params.idempotencyKey }
  );

  if (!session.url) {
    throw new Error("Stripe Checkout Session created with no redirect URL.");
  }

  return { sessionId: session.id, url: session.url, expiresAt: toIsoString(session.expires_at) };
}

export type StripeCheckoutSessionState = "open" | "complete" | "expired" | "unknown";

export interface StripeCheckoutSessionSnapshot {
  state: StripeCheckoutSessionState;
  expiresAt: string | null;
}

/**
 * Re-reads a Checkout Session's live state from Stripe (architecture.md §16.4) -- used both
 * to decide whether a stored pending URL is still safely reusable (`state: "open"` and
 * unexpired) and, after a retried creation call returns an existing session via Stripe's own
 * idempotency boundary, to verify that session's state before ever linking or returning it.
 */
export async function getStripeCheckoutSession(
  sessionId: string
): Promise<StripeCheckoutSessionSnapshot> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const rawStatus: string | null = session.status;
  const state: StripeCheckoutSessionState =
    rawStatus === "open" || rawStatus === "complete" || rawStatus === "expired"
      ? rawStatus
      : "unknown";

  return { state, expiresAt: toIsoString(session.expires_at) };
}

/**
 * Expires an open Checkout Session (architecture.md §16.4's compensation path -- called when
 * the local link-back update fails after Stripe already created the session, so a stale,
 * unlinked session is never left reusable).
 */
export async function expireStripeCheckoutSession(sessionId: string): Promise<void> {
  const stripe = getStripeClient();
  await stripe.checkout.sessions.expire(sessionId);
}

/**
 * Verifies and parses an inbound Stripe webhook payload (E5-02;
 * app/api/webhooks/stripe/route.ts) using Stripe's official `constructEvent` signature
 * verification -- the only supported way to authenticate a webhook request. `rawBody` must
 * be the exact, unmodified request body bytes/string (never a re-serialized JSON.parse'd
 * object), since the signature is computed over the raw payload.
 *
 * Throws (not a boolean return) on a missing/invalid signature or a missing configured
 * secret, so the caller's `try/catch` is the single place that decides to reject with 400 --
 * mirrors `getStripeClient()`'s "fail loudly only when actually used" posture. Uses Stripe's
 * documented test-mode conventions in `.env.example`'s `STRIPE_WEBHOOK_SIGNING_SECRET`; no
 * real Stripe account exists for this venture yet (agent/DECISIONS.md, 2026-09-03/04 entries).
 */
export function constructStripeWebhookEvent(rawBody: string | Buffer, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;
  if (!webhookSecret) {
    throw new Error(
      "Missing STRIPE_WEBHOOK_SIGNING_SECRET environment variable -- see .env.example. " +
        "Stripe webhook payloads cannot be verified without it."
    );
  }
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
