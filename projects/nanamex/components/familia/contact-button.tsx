"use client";

import { useState, useTransition } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { createCheckoutSessionAction } from "@/actions/entitlements";
import { Toast, type ToastVariant } from "@/components/shared/toast";

export type ContactButtonProps = {
  necesidadId: string;
  nineraId: string;
  className?: string;
  /** Mobile footer's compact label wraps a secondary caption span; desktop doesn't. */
  variant?: "desktop" | "mobile";
};

const GENERIC_ERROR_MESSAGE = "No se pudo iniciar el pago. Intenta de nuevo.";

/**
 * FAM-06's "Contactar" action (implementation-plan.md E5-01). This story owns only the
 * server-side gate + Stripe Checkout Session creation, not FAM-08/FAM-09's full paywall/
 * checkout screens (E5-03's scope) -- clicking straight through to Stripe's own hosted
 * Checkout page (redirect on `checkout_created`) is the smallest wiring that actually
 * exercises `createCheckoutSessionAction` end to end, per this story's scope note.
 *
 * Both blocking conditions (unverified contact channels, an already-active entitlement) are
 * always re-checked server-side by the action itself -- this component has no client-side
 * gating logic of its own to bypass.
 */
export function ContactButton({ necesidadId, nineraId, className, variant = "desktop" }: ContactButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  const handleClick = () => {
    setToast(null);
    startTransition(async () => {
      try {
        const result = await createCheckoutSessionAction({ necesidadId, nineraId });
        if (result.status === "checkout_created") {
          window.location.href = result.checkoutUrl;
          return;
        }
        if (result.status === "already_entitled") {
          setToast({ message: result.message, variant: "success" });
          return;
        }
        setToast({ message: result.message, variant: "error" });
      } catch {
        setToast({ message: GENERIC_ERROR_MESSAGE, variant: "error" });
      }
    });
  };

  return (
    <span className={variant === "mobile" ? "flex flex-1" : "contents"}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={isPending ? "Contactar, procesando" : variant === "mobile" ? "Contactar" : undefined}
        aria-busy={isPending}
        className={`${className ?? ""} disabled:pointer-events-none disabled:opacity-40`}
      >
        {isPending ? (
          <CircleNotch size={16} weight="bold" className="animate-spin" aria-hidden="true" />
        ) : (
          <span>Contactar</span>
        )}
      </button>
      {isPending ? (
        <span role="status" aria-live="polite" className="sr-only">
          Procesando contacto…
        </span>
      ) : null}
      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
          avoidMobileActionBar={variant === "mobile"}
        />
      ) : null}
    </span>
  );
}
