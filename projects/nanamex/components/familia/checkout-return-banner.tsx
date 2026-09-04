"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { getCheckoutReturnStateAction } from "@/actions/entitlements";

type ReturnState = "success" | "cancel" | null;

/**
 * Handles the round trip back from Stripe's hosted Checkout page (`successUrl`/`cancelUrl`
 * in `actions/entitlements.ts`, `?checkout=success` / `?checkout=cancel`) on FAM-06's
 * candidate detail page -- the page the family lands back on after paying or backing out of
 * Stripe's own hosted page.
 *
 * Stands in for FAM-09's local "success" state (design/UI-SPEC.md: "a single filled-check
 * icon animation... before auto-advancing to FAM-10"). When the FAM-10 destination is
 * supplied, the brief confirmation is shown before handing off to that specific request
 * route; otherwise it remains an in-place confirmation for contexts without a candidate.
 *
 * The displayed state is pinned in local state from the URL param at mount, independent of
 * the URL itself, so it stays visible for a stable `DISMISS_DELAY_MS` regardless of how
 * quickly the param-stripping `router.replace` round-trips (this page is `force-dynamic`,
 * so that replace re-fetches from the server) -- the same fixed-duration convention this
 * codebase's `Toast` component uses (`components/shared/toast.tsx`, `durationMs = 4000`).
 */
const DISMISS_DELAY_MS = 4000;

export function CheckoutReturnBanner({
  necesidadId,
  nineraId,
  autoNavigateTo,
}: { necesidadId?: string; nineraId?: string; autoNavigateTo?: string } = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const raw = searchParams.get("checkout");
  const initialState: ReturnState = raw === "success" || raw === "cancel" ? raw : null;
  const [state] = useState<ReturnState>(initialState);
  const [verification, setVerification] = useState<"checking" | "pending" | "unverified" | "stale" | "error" | "ready">("checking");

  const paywallHref = necesidadId && nineraId
    ? `/familia/necesidad/${necesidadId}/candidatas/${nineraId}?contactar=1`
    : undefined;

  async function verifyReturn() {
    setVerification("checking");
    const result = await getCheckoutReturnStateAction();
    if (result.status === "ready") {
      setVerification("ready");
      if (autoNavigateTo) router.replace(autoNavigateTo, { scroll: false });
    } else if (result.status === "pending") setVerification("pending");
    else if (result.status === "unverified") setVerification("unverified");
    else if (result.status === "stale") {
      setVerification("stale");
      if (paywallHref) router.replace(paywallHref, { scroll: false });
    }
    else setVerification("error");
  }

  useEffect(() => {
    if (!state) return;
    if (state === "success") {
      void Promise.resolve().then(() => verifyReturn());
      const timer = window.setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        params.delete("checkout");
        const query = params.toString();
        router.replace(query ? `?${query}` : "?", { scroll: false });
      }, DISMISS_DELAY_MS);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      params.delete("checkout");
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    }, DISMISS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoNavigateTo, paywallHref, router, state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === "success") {
    return (
      <div
        role="status"
        className="mb-6 flex items-center gap-2 border-l-2 border-trust-verified-600 pl-3 text-body text-ink-900"
      >
        <CheckCircle size={20} weight="fill" aria-hidden="true" className="shrink-0 text-trust-verified-600" />
         <span>{verification === "ready" ? <>Contacto desbloqueado. Pago confirmado. {necesidadId && nineraId && !autoNavigateTo ? <Link className="font-semibold text-primary-600 underline" href={`/familia/necesidad/${necesidadId}/candidatas/${nineraId}/contactar`}>Solicitar entrevista</Link> : autoNavigateTo ? "Abriendo la solicitud…" : "Ya puedes contactar a esta candidata y a cualquier otra compatible."}</> : verification === "error" ? "No pudimos comprobar el pago todavía." : verification === "unverified" ? "Aún no podemos verificar este pago. Actualiza para volver a intentar." : verification === "stale" ? "Este intento de pago expiró. Regresa para iniciar uno nuevo." : "Estamos confirmando tu pago. La confirmación puede tardar unos segundos."}</span>
        {verification !== "ready" && <button type="button" onClick={() => void verifyReturn()} className="ml-auto min-h-11 shrink-0 font-semibold text-primary-600 underline">Actualizar</button>}
      </div>
    );
  }

  if (state === "cancel") {
    return (
      <div role="status" className="mb-6 rounded-sm border border-border bg-bg-raised px-4 py-3 text-body-sm text-ink-600">
        Pago cancelado. Puedes intentar de nuevo cuando quieras.
      </div>
    );
  }

  return null;
}
