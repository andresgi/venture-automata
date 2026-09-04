import { Heart } from "@phosphor-icons/react/ssr";

/** Visual-only actions for FAM-06 until favorites/contact are implemented by their stories. */
export function CandidateDetailActions() {
  return (
    <>
      <div className="mt-6 hidden gap-3 lg:flex">
        <button type="button" disabled className="flex h-11 w-11 items-center justify-center rounded-sm border border-border-strong text-ink-600" aria-label="Guardar favorita (próximamente)"><Heart size={20} /></button>
        <button type="button" disabled className="h-11 flex-1 rounded-sm bg-primary-600 text-button text-white opacity-50">Contactar</button>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-border bg-bg-raised px-4 py-3 shadow-md lg:hidden" data-testid="candidate-mobile-actions">
        <button type="button" disabled className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-border-strong text-ink-600" aria-label="Guardar favorita (próximamente)"><Heart size={20} aria-hidden="true" /></button>
        <button type="button" disabled className="flex h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-primary-600 text-button text-white opacity-50" aria-label="Contactar (próximamente)"><span>Contactar</span><span className="text-caption">Próximamente</span></button>
      </div>
    </>
  );
}
