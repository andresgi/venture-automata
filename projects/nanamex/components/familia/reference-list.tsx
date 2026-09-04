import { ChatCircleText } from "@phosphor-icons/react/ssr";

export type Reference = {
  id: string;
  nombre: string;
  relacion: string;
  periodo: string;
  contacto: string | null;
};

/** Self-reported references: intentionally separate from TrustBadge and its trust colors. */
export function ReferenceList({ references }: { references: Reference[] }) {
  // The detail column contributes gap-7 (28px); mt-3 completes the UI-spec's
  // space-7 (40px) separation without double-counting a second 40px margin.
  return (
    <section aria-labelledby="references-heading" className="mt-3 border-t border-border pt-6">
      <h2 id="references-heading" className="flex items-center gap-2 text-h2 text-ink-900">
        <ChatCircleText size={18} weight="regular" className="text-ink-400" aria-hidden="true" />
        Referencias
      </h2>
      <p className="mt-2 text-body-sm text-ink-600">
        Proporcionadas por la niñera — Clin no las ha verificado.
      </p>
      {references.length > 0 && (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {references.map((reference) => (
            <li key={reference.id} className="py-4 text-body text-ink-900">
              <p>{reference.nombre}</p>
              <p className="text-body-sm text-ink-600">
                {reference.relacion}, {reference.periodo}
              </p>
              {reference.contacto && (
                <p className="mt-1 text-body-sm text-ink-600">Contacto: {reference.contacto}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
