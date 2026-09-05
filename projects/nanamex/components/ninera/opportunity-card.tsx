import { ArrowRight, Check, X } from "@phosphor-icons/react/ssr";
import type { OpportunityCardData } from "@/lib/ninera/opportunities";
import { nineraChecklistLabels } from "@/lib/ninera/opportunities";

const MODALITY_LABELS: Record<string, string> = { planta: "De planta", entrada_salida: "Entrada por salida", ocasional: "Ocasional" };

/**
 * NIN-04/NIN-05 card. NIN-06 owns the detail and interest mutation; until that story lands,
 * the two requested actions remain visibly present but inert rather than pretending to save
 * interest or linking to a route that does not exist yet.
 */
export function OpportunityCard({ opportunity }: { opportunity: OpportunityCardData }) {
  const labels = nineraChecklistLabels(opportunity.factors);
  return (
    <article className="rounded-md border border-border bg-bg-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-medium text-ink-900">Familia en {opportunity.zona}</p>
          <p className="mt-1 text-body-sm text-ink-600">{MODALITY_LABELS[opportunity.modalidad] ?? opportunity.modalidad}</p>
        </div>
        <p className="text-numeral-lg text-primary-600">{opportunity.score}%<span className="sr-only"> compatible</span></p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm text-ink-600">
        <div><dt className="sr-only">Pago</dt><dd>${opportunity.pagoMin.toLocaleString("es-MX")}–${opportunity.pagoMax.toLocaleString("es-MX")} MXN</dd></div>
        <div><dt className="sr-only">Inicio</dt><dd>Inicio {opportunity.fechaInicio}</dd></div>
      </dl>
      {labels.length > 0 && <ul className="mt-4 flex flex-col gap-1">{labels.map((label) => <li key={label} className="flex items-start gap-2 text-body-sm text-ink-600"><Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{label}</li>)}</ul>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <button type="button" disabled className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-border px-3 text-button text-ink-600 opacity-60" aria-label="Ver detalle, disponible próximamente"><span>Ver detalle</span><ArrowRight size={16} aria-hidden="true" /></button>
        {opportunity.pushed && <button type="button" disabled className="inline-flex min-h-11 items-center gap-1 text-button text-ink-600 opacity-60" aria-label="Descartar, disponible próximamente"><X size={16} aria-hidden="true" />Descartar</button>}
        <button type="button" disabled className="inline-flex min-h-11 items-center rounded-sm border border-border-strong px-4 text-button text-ink-600 opacity-60">Mostrar interés (próximamente)</button>
      </div>
    </article>
  );
}
