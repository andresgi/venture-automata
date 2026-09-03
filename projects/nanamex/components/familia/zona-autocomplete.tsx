"use client";

import { useId, useMemo, useState } from "react";
import { MapPin, WarningCircle } from "@phosphor-icons/react/ssr";
import type { ZonaOption } from "@/lib/zonas/queries";

function zonaLabel(zona: ZonaOption): string {
  return zona.colonia ? `${zona.colonia}, ${zona.alcaldiaMunicipio}` : zona.alcaldiaMunicipio;
}

const MAX_VISIBLE_MATCHES = 8;

/**
 * "Zona" autocomplete control for FAM-01 (design/UI-SPEC.md FAM-01: "same autocomplete/pin
 * control as FAM-03's Zona step"). FAM-03 (Epic 2) doesn't exist yet, so this component
 * lives under `components/familia/` for that story to reuse once it's built, rather than
 * being inlined into FAM-01's own form.
 *
 * Client-side filtering only, no debounced network search — the seeded `zonas` table is
 * small and static (36 rows for the Monterrey launch city as of E0-03), so the full list is
 * fetched once server-side (`lib/zonas/queries.ts`) and passed in as `zonas`.
 *
 * FAM-03's fuller spec also describes "a small embedded map preview (pin, not full
 * interactive map) once a zona is chosen." This renders a lightweight static pin + label
 * confirmation instead of an interactive map, matching the spec's own "keeps this step
 * lightweight" intent without adding a mapping dependency this story doesn't otherwise need.
 */
export function ZonaAutocomplete({
  zonas,
  name,
  defaultZonaId,
  error,
  onSelect,
}: {
  zonas: ZonaOption[];
  name: string;
  defaultZonaId?: string | null;
  error?: string;
  onSelect?: (zona: ZonaOption) => void;
}) {
  const listboxId = useId();
  const inputId = `${listboxId}-input`;
  const defaultZona = zonas.find((zona) => zona.id === defaultZonaId) ?? null;

  const [query, setQuery] = useState(defaultZona ? zonaLabel(defaultZona) : "");
  const [selectedId, setSelectedId] = useState<string | null>(defaultZona?.id ?? null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const pool = trimmed
      ? zonas.filter((zona) => zonaLabel(zona).toLowerCase().includes(trimmed))
      : zonas;
    return pool.slice(0, MAX_VISIBLE_MATCHES);
  }, [query, zonas]);

  const selectedZona = selectedId ? (zonas.find((zona) => zona.id === selectedId) ?? null) : null;

  function selectZona(zona: ZonaOption) {
    setSelectedId(zona.id);
    setQuery(zonaLabel(zona));
    setIsOpen(false);
    setActiveIndex(0);
    onSelect?.(zona);
  }

  return (
    <div className="flex flex-col gap-2 text-body-sm text-ink-900">
      <label htmlFor={inputId}>Zona</label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-invalid={error ? true : undefined}
          aria-activedescendant={isOpen && matches[activeIndex] ? `${listboxId}-option-${matches[activeIndex].id}` : undefined}
          aria-describedby={error ? `${listboxId}-error` : undefined}
          autoComplete="off"
          placeholder="Busca tu colonia o municipio"
          className={`h-11 w-full rounded-sm border bg-bg-raised px-3 text-body outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-600/25 ${error ? "border-danger-600" : "border-border-strong"}`}
          value={query}
           onChange={(event) => {
             setQuery(event.target.value);
             setSelectedId(null);
             setIsOpen(true);
             setActiveIndex(0);
           }}
           onFocus={() => setIsOpen(true)}
           onKeyDown={(event) => {
             if (event.key === "ArrowDown") {
               event.preventDefault();
               setIsOpen(true);
               setActiveIndex((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
             } else if (event.key === "ArrowUp") {
               event.preventDefault();
               setActiveIndex((index) => Math.max(index - 1, 0));
             } else if (event.key === "Enter" && isOpen && matches[activeIndex]) {
               event.preventDefault();
               selectZona(matches[activeIndex]);
             } else if (event.key === "Escape") {
               setIsOpen(false);
             }
           }}
          onBlur={() => {
            // Deferred so a mousedown on an option (which calls event.preventDefault()
            // below) still registers as a click before the listbox unmounts.
            setTimeout(() => setIsOpen(false), 100);
          }}
        />

        {isOpen && matches.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Zonas"
            className="absolute top-full left-0 z-10 mt-1 max-h-56 w-full overflow-auto rounded-sm border border-border-strong bg-bg-raised shadow-sm"
          >
            {matches.map((zona) => (
              <li key={zona.id}>
                 <button
                   id={`${listboxId}-option-${zona.id}`}
                  type="button"
                  role="option"
                  aria-selected={zona.id === selectedId}
                   className={`block h-11 w-full px-3 text-left text-body-sm ${zona.id === matches[activeIndex]?.id ? "bg-primary-50" : "hover:bg-primary-50"}`}
                   onMouseEnter={() => setActiveIndex(matches.findIndex((match) => match.id === zona.id))}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectZona(zona)}
                >
                  {zonaLabel(zona)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Server-validated on submit (`actions/perfil-familiar.ts` re-checks this id exists
          in `zonas`) -- this hidden input is what the form actually submits, never the
          free-text `query` above, so a value that doesn't match any real zona simply
          submits empty and fails required-field validation rather than persisting free
          text. */}
      <input type="hidden" name={name} value={selectedId ?? ""} />

      {selectedZona ? (
        <p className="flex items-center gap-1 text-xs text-zinc-500">
          <MapPin size={14} weight="fill" className="shrink-0" aria-hidden />
          {zonaLabel(selectedZona)}
        </p>
      ) : null}

      {error ? (
        <span id={`${listboxId}-error`} className="flex items-center gap-1 text-body-sm text-danger-600">
          <WarningCircle size={16} weight="fill" aria-hidden />
          {error}
        </span>
      ) : null}
    </div>
  );
}
