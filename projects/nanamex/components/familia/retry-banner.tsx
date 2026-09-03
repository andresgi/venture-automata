"use client";

import { useRouter } from "next/navigation";
import { WarningCircle } from "@phosphor-icons/react/ssr";

/**
 * FAM-04 error state (design/UI-SPEC.md: "Error: inline retry banner above where cards
 * would render"). `router.refresh()` re-runs the page's Server Component data fetch
 * in-place (no full navigation/reload), which is the correct "retry" primitive for a
 * server-fetched page in the App Router.
 */
export function RetryBanner({ message }: { message: string }) {
  const router = useRouter();

  return (
    <div
      role="alert"
      className="mt-6 flex items-center justify-between gap-4 rounded-sm border border-danger-600 bg-danger-50 px-4 py-3 text-body-sm text-danger-600"
    >
      <span className="flex items-center gap-2">
        <WarningCircle size={18} weight="regular" aria-hidden="true" />
        {message}
      </span>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="shrink-0 text-button text-danger-600 underline underline-offset-2"
      >
        Reintentar
      </button>
    </div>
  );
}
