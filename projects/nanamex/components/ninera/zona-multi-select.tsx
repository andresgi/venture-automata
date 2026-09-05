"use client";

import { useId, useMemo, useState } from "react";
import { MapPin, X } from "@phosphor-icons/react/ssr";
import type { ZonaOption } from "@/lib/zonas/queries";

function zonaLabel(zona: ZonaOption): string {
  return zona.colonia ? `${zona.colonia}, ${zona.alcaldiaMunicipio}` : zona.alcaldiaMunicipio;
}

const MAX_VISIBLE_MATCHES = 8;

/**
 * "Zona de trabajo" for NIN-01 -- design/UI-SPEC.md says "same autocomplete as FAM-03"
 * (`components/familia/zona-autocomplete.tsx`), but `ninera_zonas` is many-to-many
 * (database.md §3b: "a niñera may work across multiple zonas"), unlike FAM-01/FAM-03's
 * single `zona_id`. This adapts the same combobox interaction (type-to-filter, keyboard
 * nav, listbox) into a multi-select: selecting an option adds it to a removable chip list
 * below instead of replacing the input value, and already-selected zonas are excluded from
 * further matches. This is a scope resolution, not a silent deviation -- see this story's
 * final report for the explicit call-out.
 */
export function ZonaMultiSelect({
  zonas,
  name,
  defaultZonaIds,
  error,
  onChange,
}: {
  zonas: ZonaOption[];
  name: string;
  defaultZonaIds?: string[];
  error?: string;
  onChange?: (zonaIds: string[]) => void;
}) {
  const listboxId = useId();
  const inputId = `${listboxId}-input`;
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultZonaIds ?? []);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedZonas = selectedIds.flatMap((id) => {
    const zona = zonas.find((item) => item.id === id);
    return zona ? [zona] : [];
  });

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const pool = zonas.filter(
      (zona) => !selectedIds.includes(zona.id) && (!trimmed || zonaLabel(zona).toLowerCase().includes(trimmed))
    );
    return pool.slice(0, MAX_VISIBLE_MATCHES);
  }, [query, zonas, selectedIds]);

  function addZona(zona: ZonaOption) {
    const next = [...selectedIds, zona.id];
    setSelectedIds(next);
    setQuery("");
    setIsOpen(false);
    setActiveIndex(0);
    onChange?.(next);
  }

  function removeZona(id: string) {
    const next = selectedIds.filter((item) => item !== id);
    setSelectedIds(next);
    onChange?.(next);
  }

  return (
    <div className="flex flex-col gap-2 text-body-sm text-ink-900">
      <label htmlFor={inputId}>Zona de trabajo</label>

      {selectedZonas.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Zonas seleccionadas">
          {selectedZonas.map((zona) => (
            <li key={zona.id}>
              <button
                type="button"
                onClick={() => removeZona(zona.id)}
                className="flex min-h-11 items-center gap-1 rounded-full border border-primary-600 bg-primary-50 px-3 py-1 text-body-sm text-primary-700"
              >
                <MapPin size={14} weight="fill" aria-hidden />
                {zonaLabel(zona)}
                <X size={14} aria-hidden />
                <span className="sr-only">Quitar {zonaLabel(zona)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${listboxId}-error` : undefined}
          autoComplete="off"
          placeholder="Busca y agrega una colonia o municipio"
          className={`h-11 w-full rounded-sm border bg-bg-raised px-3 text-body outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-600/25 ${error ? "border-danger-600" : "border-border-strong"}`}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
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
              addZona(matches[activeIndex]);
            } else if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          onBlur={() => {
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
                  type="button"
                  role="option"
                  aria-selected={false}
                  className={`block h-11 w-full px-3 text-left text-body-sm ${zona.id === matches[activeIndex]?.id ? "bg-primary-50" : "hover:bg-primary-50"}`}
                  onMouseEnter={() => setActiveIndex(matches.findIndex((match) => match.id === zona.id))}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => addZona(zona)}
                >
                  {zonaLabel(zona)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Server-validated on submit (`actions/perfil-ninera.ts` re-checks these ids exist
          in `zonas`). */}
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {error ? (
        <span id={`${listboxId}-error`} className="flex items-center gap-1 text-body-sm text-danger-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
