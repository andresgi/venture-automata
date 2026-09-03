"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { UNAUTHORIZED_BANNER_PARAM, UNAUTHORIZED_BANNER_VALUE } from "@/lib/auth/roles";

/**
 * Neutral "Acceso no autorizado" banner (design/UX-spec.md Part C "Permission denied";
 * design/UI-SPEC.md "Acceso no autorizado"): a matter-of-fact redirect notice, deliberately
 * styled without the app's `danger`/red treatment — "consistent with the product's honest,
 * not alarmist register even when the state is access-related." Dismissible; auto-clears on
 * next navigation because it's driven entirely by the `banner` query param middleware.ts
 * appends to the redirect, not by any persisted client/server state.
 *
 * Note: full design-token wiring (UI-SYSTEM.md's `ink-600`/`bg-raised`/`border` palette) is
 * not yet plumbed into app/globals.css as of E0-04 (that lands with the first UI-focused
 * BUILD story) — this uses plain neutral Tailwind grays as a placeholder approximation of
 * the same "neutral, no red, no icon fill" intent.
 */
export function UnauthorizedBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const isVisible = searchParams.get(UNAUTHORIZED_BANNER_PARAM) === UNAUTHORIZED_BANNER_VALUE;

  if (!isVisible) {
    return null;
  }

  function dismiss() {
    const params = new URLSearchParams(searchParams);
    params.delete(UNAUTHORIZED_BANNER_PARAM);
    const query = params.toString();
    router.replace(query ? `?${query}` : "?", { scroll: false });
  }

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-4 border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-600"
    >
      <span>No tienes acceso a esa página.</span>
      <button
        type="button"
        onClick={dismiss}
        className="text-zinc-500 underline underline-offset-2 hover:text-zinc-700"
        aria-label="Cerrar aviso"
      >
        Cerrar
      </button>
    </div>
  );
}
