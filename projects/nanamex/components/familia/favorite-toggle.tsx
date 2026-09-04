"use client";

import { useState, useTransition } from "react";
import { Heart } from "@phosphor-icons/react";
import { toggleFavoriteAction } from "@/actions/favorites";
import { Toast, type ToastVariant } from "@/components/shared/toast";

export type FavoriteToggleProps = {
  necesidadId: string;
  nineraId: string;
  score: number;
  checklist: Record<string, boolean>;
  initialFavorite: boolean;
  className?: string;
};

const DEFAULT_CLASSNAME = "flex h-11 w-11 items-center justify-center rounded-sm text-ink-600";
const GENERIC_ERROR_MESSAGE = "No se pudo actualizar la favorita.";

/**
 * FAM-04/FAM-06/FAM-07's "Guardar favorita" icon toggle (UX-spec.md FAM-04/FAM-06:
 * "icon toggle, free, always enabled" -- Decision 4: never paywall-gated). Optimistically
 * flips the heart, then confirms against `toggleFavoriteAction`; reverts to the server's
 * reported state on failure rather than leaving the UI silently out of sync.
 *
 * Feedback is surfaced via the shared `Toast` (UI-SYSTEM.md §5.6 names "favorited" as a
 * named toast use case) on both success and failure -- a screen-reader-only span alone
 * (the original implementation) left sighted users with no visible explanation when a
 * failure silently reverted the optimistic icon flip (Code Review/Functional QA/Visual QA
 * E4-04 finding).
 */
export function FavoriteToggle({ necesidadId, nineraId, score, checklist, initialFavorite, className }: FavoriteToggleProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  const toggle = () => {
    const next = !isFavorite;
    setIsFavorite(next);
    setToast(null);
    startTransition(async () => {
      try {
        const result = await toggleFavoriteAction({
          necesidadId,
          nineraId,
          favorite: next,
          matchScore: score,
          matchChecklist: checklist,
        });
        if (result.ok) {
          setToast({ message: next ? "Guardada en favoritas" : "Quitada de favoritas", variant: "success" });
        } else {
          setIsFavorite(result.isFavorite);
          setToast({ message: result.message ?? GENERIC_ERROR_MESSAGE, variant: "error" });
        }
      } catch {
        // The server action itself threw (e.g. network failure) instead of returning a
        // handled `{ ok: false }` result -- revert to the pre-toggle state defensively
        // rather than leaving the optimistic UI stuck out of sync with no feedback.
        setIsFavorite(!next);
        setToast({ message: GENERIC_ERROR_MESSAGE, variant: "error" });
      }
    });
  };

  return (
    <span className="inline-flex flex-col items-center">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Quitar de favoritas" : "Guardar favorita"}
        className={className ?? DEFAULT_CLASSNAME}
      >
        <Heart size={20} weight={isFavorite ? "fill" : "regular"} className={isFavorite ? "text-primary-600" : undefined} aria-hidden="true" />
      </button>
      {toast ? <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} /> : null}
    </span>
  );
}
