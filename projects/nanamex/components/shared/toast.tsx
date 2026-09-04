"use client";

import { useEffect } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";

export type ToastVariant = "success" | "error";

export type ToastProps = {
  message: string;
  variant: ToastVariant;
  onDismiss: () => void;
  /** UI-SYSTEM.md §5.6: "auto-dismiss 4s". */
  durationMs?: number;
};

/**
 * design/UI-SYSTEM.md §5.6 "Feedback: toasts, banners, inline validation" -- "Toast
 * (favorited, reported, saved): bottom-anchored (mobile) / bottom-left (desktop), single
 * line, icon + message, `bg-raised` with `elevation-2`, auto-dismiss 4s, max one visible at
 * a time (new toast replaces, doesn't stack)."
 *
 * First caller is `FavoriteToggle` (E4-04, FAM-04/FAM-06/FAM-07's "Guardar favorita"), which
 * §5.6 names as one of the three canonical use cases by name. Kept in `components/shared`
 * since the other two named use cases ("reported", "saved") will need the same pattern
 * later -- a single-toast-at-a-time contract is satisfied by each caller owning its own
 * message slot in local state and only ever mounting one `Toast` at a time, which is true
 * of every call site so far.
 */
export function Toast({ message, variant, onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, variant, onDismiss, durationMs]);

  const Icon = variant === "success" ? CheckCircle : WarningCircle;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-2 rounded-sm bg-bg-raised px-4 py-3 text-body-sm shadow-elevation-2 sm:inset-x-auto sm:left-4 sm:w-80"
    >
      <Icon size={20} weight="fill" aria-hidden="true" className={variant === "success" ? "shrink-0 text-primary-600" : "shrink-0 text-danger-600"} />
      <span className={variant === "success" ? "text-ink-900" : "text-danger-600"}>{message}</span>
    </div>
  );
}
