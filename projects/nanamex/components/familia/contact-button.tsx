"use client";

import { useState } from "react";
import { PaywallGate } from "@/components/familia/paywall-gate";
import type { VerificationStatus } from "@/components/shared/trust-badge";

export type ContactButtonProps = {
  necesidadId: string;
  nineraId: string;
  candidateNombre: string;
  candidateFotoUrl: string | null;
  verificationStatus: VerificationStatus;
  className?: string;
  /** Mobile footer's compact label wraps a secondary caption span; desktop doesn't. */
  variant?: "desktop" | "mobile";
  initialOpen?: boolean;
};

/**
 * FAM-06's "Contactar" action (implementation-plan.md E5-01/E5-03). Opens the real FAM-08
 * (paywall) -> FAM-09 (checkout) flow (`PaywallGate`) instead of E5-01's documented interim
 * direct-to-Stripe redirect (agent/BACKLOG.md E5-01 entry) -- this button is now only the
 * trigger; every server-side gate/eligibility/entitlement check still happens inside
 * `createCheckoutSessionAction`, called from `PaywallGate` itself.
 */
export function ContactButton({
  necesidadId,
  nineraId,
  candidateNombre,
  candidateFotoUrl,
  verificationStatus,
  className,
  variant = "desktop",
  initialOpen = false,
}: ContactButtonProps) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <span className={variant === "mobile" ? "flex flex-1" : "contents"}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={variant === "mobile" ? "Contactar" : undefined}
        className={className}
      >
        <span>Contactar</span>
      </button>
      <PaywallGate
        open={open}
        onClose={() => setOpen(false)}
        necesidadId={necesidadId}
        nineraId={nineraId}
        candidateNombre={candidateNombre}
        candidateFotoUrl={candidateFotoUrl}
        verificationStatus={verificationStatus}
      />
    </span>
  );
}
