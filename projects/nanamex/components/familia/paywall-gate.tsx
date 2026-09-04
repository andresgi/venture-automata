"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CircleNotch, LockSimple, X } from "@phosphor-icons/react";
import { createCheckoutSessionAction } from "@/actions/entitlements";
import { TrustBadge, type VerificationStatus } from "@/components/shared/trust-badge";

export type PaywallGateProps = {
  open: boolean;
  onClose: () => void;
  necesidadId: string;
  nineraId: string;
  candidateNombre: string;
  candidateFotoUrl: string | null;
  verificationStatus: VerificationStatus;
};

type Step = "paywall" | "checkout" | "already_entitled";

const GENERIC_ERROR_MESSAGE = "No se pudo iniciar el pago. Intenta de nuevo.";

/**
 * FAM-08 (Paywall) / FAM-09 (Checkout) -- design/UI-SPEC.md, design/UI-SYSTEM.md §4.4/§5.7,
 * design/UX-spec.md Decision 4. Replaces E5-01's documented interim direct-to-Stripe
 * redirect (agent/BACKLOG.md E5-01 entry) -- this is the real `Contactar` -> FAM-08 ->
 * FAM-09 flow.
 *
 * Single dialog/takeover shell shared by both screens (mobile: full-screen takeover, no
 * scrim; desktop: centered 560px dialog, `elevation-3` + `overlay-scrim`), per UI-SYSTEM
 * §5.7. Internal `step` state moves between FAM-08's offer screen and FAM-09's order-summary
 * screen without unmounting the shell.
 *
 * Stripe Hosted Checkout (architecture.md §16) means the actual card-entry fields FAM-09's
 * spec calls "provider-dependent, out of this spec's scope" render on Stripe's own page, not
 * here -- "Confirmar pago" hands off via `window.location.href`, it does not collect card
 * data itself. FAM-09's local "success"/"error" states (declined card, etc.) are therefore
 * Stripe's own hosted-page concern; this component's own error surface is limited to the
 * pre-redirect entitlement/eligibility check (`createCheckoutSessionAction`, matching FAM-08's
 * documented "error (entitlement check failed)" state). The post-redirect return trip
 * (`?checkout=success`/`?checkout=cancel`) is handled separately by
 * `CheckoutReturnBanner` on the candidate detail page.
 */
export function PaywallGate({
  open,
  onClose,
  necesidadId,
  nineraId,
  candidateNombre,
  candidateFotoUrl,
  verificationStatus,
}: PaywallGateProps) {
  const [step, setStep] = useState<Step>("paywall");
  const [isPending, setIsPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyEntitledMessage, setAlreadyEntitledMessage] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset to FAM-08's default state every time the gate is freshly (re)opened.
  useEffect(() => {
    const resetToDefault = () => {
      setStep("paywall");
      setIsPending(false);
      setConfirming(false);
      setError(null);
      setAlreadyEntitledMessage(null);
      setCheckoutUrl(null);
    };
    if (open) resetToDefault();
  }, [open]);

  const locked = isPending || confirming;

  const handleClose = () => {
    if (locked) return;
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const focusable = () =>
      [...(dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? [])].filter(
        (element) => !element.hasAttribute("disabled"),
      );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      } else if (event.key === "Tab") {
        const elements = focusable();
        if (elements.length === 0) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleClose closes over `locked`/`onClose`, re-derived each render intentionally.
  }, [open, locked]);

  if (!open) return null;

  const handleContinue = () => {
    setError(null);
    setIsPending(true);
    createCheckoutSessionAction({ necesidadId, nineraId })
      .then((result) => {
        if (result.status === "checkout_created") {
          setCheckoutUrl(result.checkoutUrl);
          setStep("checkout");
          return;
        }
        if (result.status === "already_entitled") {
          setAlreadyEntitledMessage(result.message);
          setStep("already_entitled");
          return;
        }
        setError(result.message);
      })
      .catch(() => setError(GENERIC_ERROR_MESSAGE))
      .finally(() => setIsPending(false));
  };

  const handleConfirm = () => {
    if (!checkoutUrl) return;
    setConfirming(true);
    window.location.href = checkoutUrl;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center lg:items-center lg:bg-overlay-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-gate-title"
        className="flex w-full flex-col overflow-y-auto bg-bg-raised px-5 py-6 lg:max-h-[90vh] lg:w-[560px] lg:rounded-lg lg:px-8 lg:py-8 lg:shadow-elevation-3"
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Cerrar"
          onClick={handleClose}
          disabled={locked}
          className="flex h-11 w-11 items-center justify-center self-start text-ink-600 disabled:pointer-events-none disabled:opacity-40"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="mt-2 flex items-center gap-3">
          {candidateFotoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- profile photo URLs are Supabase-managed. */
            <img
              src={candidateFotoUrl}
              alt={`Foto de ${candidateNombre}`}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-border text-body text-ink-600">
              {candidateNombre.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-body text-ink-900">{candidateNombre}</span>
            <TrustBadge status={verificationStatus} />
          </div>
        </div>

        {step === "paywall" && (
          <PaywallStep
            isPending={isPending}
            error={error}
            onContinue={handleContinue}
            onCancel={handleClose}
          />
        )}
        {step === "checkout" && (
          <CheckoutStep confirming={confirming} onConfirm={handleConfirm} onBack={() => setStep("paywall")} />
        )}
        {step === "already_entitled" && alreadyEntitledMessage && (
          <AlreadyEntitledStep message={alreadyEntitledMessage} onClose={onClose} href={`/familia/necesidad/${necesidadId}/candidatas/${nineraId}/contactar`} />
        )}

        <h2 id="paywall-gate-title" className="sr-only">
          Desbloquear contacto
        </h2>
      </div>
    </div>
  );
}

function PaywallStep({
  isPending,
  error,
  onContinue,
  onCancel,
}: {
  isPending: boolean;
  error: string | null;
  onContinue: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col items-center text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        <LockSimple size={28} className="text-primary-600" aria-hidden="true" />
      </span>
      <p className="mt-4 text-headline text-ink-900">MX$299 · Contacta candidatas durante 30 días</p>
      {/* Generic offer copy (implementation-plan.md E5-03 acceptance criteria; design/UI-SPEC.md
          FAM-08; design/UX-spec.md FAM-08's flagged dependency): exact feature-gating mechanics
          (uncapped vs. capped contacts, per-necesidad vs. account-wide scope) remain an open
          TECH_ARCHITECTURE/product item -- this copy is deliberately generic, not final legal/
          product copy, per the spec's explicit instruction not to invent specifics. */}
      <ul className="mt-4 flex w-full flex-col gap-2 text-left text-body text-ink-600">
        <li>Contacta directamente a esta candidata y a cualquier otra que sea compatible con tu necesidad.</li>
        <li>Acceso por 30 días a partir de tu pago.</li>
        <li>Puedes seguir explorando y guardando candidatas sin costo adicional.</li>
      </ul>

      {error && (
        <div role="alert" className="mt-4 w-full rounded-sm border border-danger-600 bg-danger-50 px-4 py-3 text-left text-body-sm text-danger-600">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={isPending}
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-primary-600 text-button text-white disabled:pointer-events-none disabled:opacity-40 lg:w-auto lg:self-center lg:px-10"
      >
        {isPending ? (
          <>
            <CircleNotch size={16} weight="bold" className="animate-spin" aria-hidden="true" />
            <span>Continuar a pago</span>
          </>
        ) : (
          "Continuar a pago"
        )}
      </button>
      <button type="button" onClick={onCancel} disabled={isPending} className="mt-3 min-h-11 text-button text-primary-600 disabled:pointer-events-none disabled:opacity-40">
        Cancelar
      </button>
      {isPending && (
        <span role="status" aria-live="polite" className="sr-only">
          Preparando tu pago…
        </span>
      )}
    </div>
  );
}

function CheckoutStep({
  confirming,
  onConfirm,
  onBack,
}: {
  confirming: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col">
      <h2 className="text-h2">Confirmación de pago</h2>
      <div className="mt-4 flex items-center justify-between border-t border-b border-border py-3 text-body text-ink-900">
        <span>Contacta candidatas durante 30 días</span>
        <span className="text-numeral-lg">MX$299</span>
      </div>
      <p className="mt-4 text-body-sm text-ink-600">
        Ingresarás tus datos de pago de forma segura en la página de Stripe, nuestro proveedor de
        pagos.
      </p>
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirming}
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-primary-600 text-button text-white disabled:pointer-events-none disabled:opacity-40 lg:w-auto lg:self-center lg:px-10"
      >
        {confirming ? (
          <>
            <CircleNotch size={16} weight="bold" className="animate-spin" aria-hidden="true" />
            <span>Confirmar pago</span>
          </>
        ) : (
          "Confirmar pago"
        )}
      </button>
      <button
        type="button"
        onClick={onBack}
        disabled={confirming}
        className="mt-3 min-h-11 text-button text-primary-600 disabled:pointer-events-none disabled:opacity-40"
      >
        Cancelar
      </button>
      {confirming && (
        <span role="status" aria-live="polite" className="sr-only">
          Redirigiendo a la página de pago…
        </span>
      )}
    </div>
  );
}

function AlreadyEntitledStep({ message, onClose, href }: { message: string; onClose: () => void; href: string }) {
  return (
    <div className="mt-6 flex flex-col items-center text-center">
      <p className="text-body text-ink-900">{message}</p>
      <Link href={href} onClick={onClose} className="mt-6 flex h-11 w-full items-center justify-center rounded-sm bg-primary-600 text-button text-white lg:w-auto lg:self-center lg:px-10">
        Solicitar entrevista
      </Link>
      <button type="button" onClick={onClose} className="mt-3 min-h-11 text-button text-primary-600">
        Entendido
      </button>
    </div>
  );
}
