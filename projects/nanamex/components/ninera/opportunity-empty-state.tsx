import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";

// UI-SYSTEM §5.8 empty-state template (shared with FAM-04/FAM-11/NIN-09/ADM-02/04): icon
// inside a primary-50 circular container -> Fraunces headline -> one body line of
// guidance -> one primary action. See app/familia/necesidad/[id]/page.tsx's EmptyState
// for the reference implementation this mirrors.
//
// The primary action is either a navigation (actionHref) or an in-place action
// (onAction, e.g. clearing client-side filter state without a page reload) -- exactly
// one of the two must be supplied.
type Props = {
  icon: Icon;
  headline: string;
  guidance: string;
  actionLabel: string;
} & ({ actionHref: string; onAction?: never } | { actionHref?: never; onAction: () => void });

export function OpportunityEmptyState({ icon: IconComponent, headline, guidance, actionLabel, actionHref, onAction }: Props) {
  const actionClassName = "mt-2 inline-flex min-h-11 items-center justify-center rounded-sm bg-primary-600 px-5 py-3 text-button text-white";
  return (
    <section className="mt-8 flex flex-col items-center gap-4 rounded-md border border-border bg-bg-raised px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        <IconComponent size={28} weight="regular" className="text-primary-600" />
      </span>
      <h2 className="text-headline">{headline}</h2>
      <p className="max-w-[420px] text-body text-ink-600">{guidance}</p>
      {onAction ? (
        <button type="button" onClick={onAction} className={actionClassName}>{actionLabel}</button>
      ) : (
        <Link href={actionHref} className={actionClassName}>{actionLabel}</Link>
      )}
    </section>
  );
}
