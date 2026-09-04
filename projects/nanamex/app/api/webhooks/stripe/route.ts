import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { constructStripeWebhookEvent } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * E5-02: Stripe webhook handler -- the only writer of `payments.status`/`entitlements.*`
 * (database.md §9). Dependency: E5-01's checkout-session creation and payment-boundary
 * design (architecture.md §16.4). No UI in this story -- pure backend finalization.
 *
 * Signature verification happens before any database access (per this story's acceptance
 * criteria: reject unsigned/invalid payloads without touching DB state). The atomic
 * finalize-and-activate step lives entirely in the `finalize_stripe_payment` SECURITY
 * DEFINER RPC (db/migrations/20260904000016_finalize_stripe_payment.sql) so idempotency and
 * the stacking rule (architecture.md §16.1) are enforced in one transaction, not split
 * across this route handler's own logic.
 *
 * Event types handled (Stripe's actual documented naming, verified against the installed
 * `stripe` package's `Stripe.Event.data.object` type for `checkout.session.*` events):
 * - `checkout.session.completed` -- the buyer finished Checkout successfully. For a `mode:
 *   "payment"` session (this venture's only mode, see lib/stripe/client.ts), `completed`
 *   already implies the payment succeeded; there is no separate `payment_status` check
 *   needed here since Stripe only fires `completed` once payment collection succeeds for
 *   this mode (an unpaid/deferred flow would be `async` payment methods, not used here).
 * - `checkout.session.expired` -- the session's time limit elapsed without completing
 *   (Stripe's actual failure-equivalent event for an abandoned Checkout Session; there is no
 *   `checkout.session.failed` event in Stripe's API).
 * Any other event type is acknowledged with 200 and ignored -- Stripe webhooks are commonly
 * configured to receive more event types than a given endpoint cares about, and returning a
 * non-2xx for an irrelevant event would only cause pointless retries.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = constructStripeWebhookEvent(rawBody, signature);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let providerPaymentId: string | null = null;
  let outcome: "exitoso" | "fallido" | null = null;

  if (event.type === "checkout.session.completed") {
    providerPaymentId = (event.data.object as Stripe.Checkout.Session).id;
    outcome = "exitoso";
  } else if (event.type === "checkout.session.expired") {
    providerPaymentId = (event.data.object as Stripe.Checkout.Session).id;
    outcome = "fallido";
  }

  if (!providerPaymentId || !outcome) {
    // Unhandled event type -- acknowledge, do not retry.
    return NextResponse.json({ received: true });
  }

  type FinalizeStripePaymentRow = {
    payment_id: string;
    familia_id: string;
    already_finalized: boolean;
    entitlement_id: string | null;
    expires_at: string | null;
  };

  const db = createServiceRoleClient();
  const { data, error } = (await db
    .rpc("finalize_stripe_payment", {
      p_provider_payment_id: providerPaymentId,
      p_outcome: outcome,
    })
    .maybeSingle()) as { data: FinalizeStripePaymentRow | null; error: { message?: string; code?: string } | null };

  if (error) {
    if (error.message?.includes("payment_not_found")) {
      // Genuinely nothing to reconcile -- this `provider_payment_id` was never created by
      // this environment's checkout flow. Retrying will never resolve it, so acknowledge to
      // stop Stripe's retry backoff and flag for manual investigation via the log line.
      console.error("Stripe webhook: no matching payment row", { providerPaymentId, eventType: event.type });
      return NextResponse.json({ received: true, warning: "payment_not_found" });
    }
    console.error("Stripe webhook: finalize_stripe_payment failed", {
      providerPaymentId,
      eventType: event.type,
      code: error.code,
    });
    return NextResponse.json({ error: "finalize_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true, alreadyFinalized: Boolean(data?.already_finalized) });
}
