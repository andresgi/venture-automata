import { FavoriteToggle } from "@/components/familia/favorite-toggle";
import { ContactButton } from "@/components/familia/contact-button";
import type { VerificationStatus } from "@/components/shared/trust-badge";

export type CandidateDetailActionsProps = {
  necesidadId: string;
  nineraId: string;
  score: number;
  checklist: Record<string, boolean>;
  initialFavorite: boolean;
  candidateNombre: string;
  candidateFotoUrl: string | null;
  verificationStatus: VerificationStatus;
  initialContactOpen?: boolean;
};

/**
 * FAM-06 actions footer (design/UI-SPEC.md, sticky on mobile per UX-spec.md FAM-06).
 * "Guardar favorita" is functional (E4-04). "Contactar" opens the real FAM-08/FAM-09
 * paywall/checkout flow (E5-03, `ContactButton` -> `PaywallGate`).
 */
export function CandidateDetailActions({
  necesidadId,
  nineraId,
  score,
  checklist,
  initialFavorite,
  candidateNombre,
  candidateFotoUrl,
  verificationStatus,
  initialContactOpen = false,
}: CandidateDetailActionsProps) {
  return (
    <>
      <div className="mt-6 hidden gap-3 lg:flex">
        <FavoriteToggle
          necesidadId={necesidadId}
          nineraId={nineraId}
          score={score}
          checklist={checklist}
          initialFavorite={initialFavorite}
          className="flex h-11 w-11 items-center justify-center rounded-sm border border-border-strong text-ink-600"
        />
        <ContactButton
          necesidadId={necesidadId}
          nineraId={nineraId}
          candidateNombre={candidateNombre}
          candidateFotoUrl={candidateFotoUrl}
          className="h-11 flex-1 rounded-sm bg-primary-600 text-button text-white"
        />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-border bg-bg-raised px-4 py-3 shadow-md lg:hidden" data-testid="candidate-mobile-actions">
        <FavoriteToggle
          necesidadId={necesidadId}
          nineraId={nineraId}
          score={score}
          checklist={checklist}
          initialFavorite={initialFavorite}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-border-strong text-ink-600"
        />
        <ContactButton
          necesidadId={necesidadId}
          nineraId={nineraId}
          candidateNombre={candidateNombre}
          candidateFotoUrl={candidateFotoUrl}
           verificationStatus={verificationStatus}
           initialOpen={initialContactOpen}
           variant="mobile"
           initialOpen={initialContactOpen}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-primary-600 text-button text-white"
        />
      </div>
    </>
  );
}
