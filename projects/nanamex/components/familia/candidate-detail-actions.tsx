import { FavoriteToggle } from "@/components/familia/favorite-toggle";

export type CandidateDetailActionsProps = {
  necesidadId: string;
  nineraId: string;
  score: number;
  checklist: Record<string, boolean>;
  initialFavorite: boolean;
};

/**
 * FAM-06 actions footer (design/UI-SPEC.md, sticky on mobile per UX-spec.md FAM-06).
 * "Guardar favorita" is functional (E4-04). "Contactar" stays a visual-only placeholder --
 * E5's paywall/contact scope, not built yet.
 */
export function CandidateDetailActions({ necesidadId, nineraId, score, checklist, initialFavorite }: CandidateDetailActionsProps) {
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
        <button type="button" disabled className="h-11 flex-1 rounded-sm bg-primary-600 text-button text-white opacity-50">Contactar</button>
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
        <button type="button" disabled className="flex h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-primary-600 text-button text-white opacity-50" aria-label="Contactar (próximamente)"><span>Contactar</span><span className="text-caption">Próximamente</span></button>
      </div>
    </>
  );
}
