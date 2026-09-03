"use client";

import { Funnel, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CandidateCard, type CandidateCardData } from "@/components/familia/candidate-card";

export type CandidateFilterData = CandidateCardData & {
  zonas: string[];
  salarioMin: number | null;
  salarioMax: number | null;
  modalidades: string[];
  disponibilidad: { dia: string; hora_inicio: string; hora_fin: string }[];
};

export type CandidateFilters = {
  zona: string;
  modalidad: string;
  pagoMin: string;
  pagoMax: string;
  dias: string[];
};

export const EMPTY_FILTERS: CandidateFilters = { zona: "", modalidad: "", pagoMin: "", pagoMax: "", dias: [] };
const MODALITIES = ["planta", "entrada_salida", "ocasional"] as const;
const MODALITY_LABELS: Record<(typeof MODALITIES)[number], string> = {
  planta: "Planta",
  entrada_salida: "Entrada por salida",
  ocasional: "Ocasional",
};
const DAYS = [
  ["lun", "Lun"], ["mar", "Mar"], ["mie", "Mié"], ["jue", "Jue"],
  ["vie", "Vie"], ["sab", "Sáb"], ["dom", "Dom"],
] as const;

export function candidateMatchesFilters(candidate: CandidateFilterData, filters: CandidateFilters): boolean {
  if (filters.zona && !candidate.zonas.includes(filters.zona)) return false;
  if (filters.modalidad && !candidate.modalidades.includes(filters.modalidad)) return false;
  const min = filters.pagoMin === "" ? null : Number(filters.pagoMin);
  const max = filters.pagoMax === "" ? null : Number(filters.pagoMax);
  if ((min !== null && (!Number.isFinite(min) || min < 0)) || (max !== null && (!Number.isFinite(max) || max < 0))) return false;
  if (min !== null && max !== null && min > max) return false;
  if (min !== null && (candidate.salarioMax === null || candidate.salarioMax < min)) return false;
  if (max !== null && (candidate.salarioMin === null || candidate.salarioMin > max)) return false;
  if (filters.dias.length > 0 && !filters.dias.every((day) => candidate.disponibilidad.some((entry) => entry.dia === day))) return false;
  return true;
}

function normalizeFilters(filters: CandidateFilters, zones: string[]): CandidateFilters {
  const validNumber = (value: string) => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 ? value : "";
  const normalized = {
    zona: zones.includes(filters.zona) ? filters.zona : "",
    modalidad: MODALITIES.includes(filters.modalidad as (typeof MODALITIES)[number]) ? filters.modalidad : "",
    pagoMin: validNumber(filters.pagoMin),
    pagoMax: validNumber(filters.pagoMax),
    dias: filters.dias.filter((day) => DAYS.some(([value]) => value === day)),
  };
  if (normalized.pagoMin && normalized.pagoMax && Number(normalized.pagoMin) > Number(normalized.pagoMax)) {
    normalized.pagoMin = "";
    normalized.pagoMax = "";
  }
  return normalized;
}

function readFilters(zones: string[]): CandidateFilters {
  const params = new URLSearchParams(window.location.search);
  return normalizeFilters({
    zona: params.get("zona") ?? "",
    modalidad: params.get("modalidad") ?? "",
    pagoMin: params.get("pagoMin") ?? "",
    pagoMax: params.get("pagoMax") ?? "",
    dias: params.get("dias")?.split(",").filter(Boolean) ?? [],
  }, zones);
}

function writeFilters(filters: CandidateFilters) {
  const params = new URLSearchParams(window.location.search);
  const values: [string, string][] = [
    ["zona", filters.zona], ["modalidad", filters.modalidad], ["pagoMin", filters.pagoMin],
    ["pagoMax", filters.pagoMax], ["dias", filters.dias.join(",")],
  ];
  values.forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

function FilterFields({ filters, setFilters, zones }: { filters: CandidateFilters; setFilters: (next: CandidateFilters) => void; zones: string[] }) {
  const update = (change: Partial<CandidateFilters>) => setFilters(normalizeFilters({ ...filters, ...change }, zones));
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-body-sm text-ink-900">
        Zona
        <select aria-label="Zona" value={filters.zona} onChange={(event) => update({ zona: event.target.value })} className="h-11 rounded-sm border border-border-strong bg-bg-raised px-3 text-body">
          <option value="">Todas las zonas</option>
          {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
        </select>
      </label>
      <fieldset>
        <legend className="text-body-sm text-ink-900">Modalidad</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {MODALITIES.map((modality) => (
            <label key={modality} className={`cursor-pointer rounded-full border px-3 py-2 text-body-sm ${filters.modalidad === modality ? "border-primary-600 bg-primary-50 text-primary-700" : "border-border-strong text-ink-600"}`}>
              <input className="sr-only" type="radio" name="filter-modalidad" value={modality} checked={filters.modalidad === modality} onChange={() => update({ modalidad: modality })} />
              {MODALITY_LABELS[modality]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-body-sm text-ink-900">Rango de pago (MXN/semana)</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input aria-label="Pago mínimo" inputMode="numeric" min="0" type="number" placeholder="Mínimo" value={filters.pagoMin} onChange={(event) => update({ pagoMin: event.target.value })} className="h-11 min-w-0 rounded-sm border border-border-strong bg-bg-raised px-3 text-body" />
          <input aria-label="Pago máximo" inputMode="numeric" min="0" type="number" placeholder="Máximo" value={filters.pagoMax} onChange={(event) => update({ pagoMax: event.target.value })} className="h-11 min-w-0 rounded-sm border border-border-strong bg-bg-raised px-3 text-body" />
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-body-sm text-ink-900">Disponibilidad</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map(([day, label]) => {
            const selected = filters.dias.includes(day);
            return <label key={day} className={`cursor-pointer rounded-full border px-3 py-2 text-body-sm ${selected ? "border-primary-600 bg-primary-50 text-primary-700" : "border-border-strong text-ink-600"}`}><input className="sr-only" type="checkbox" aria-label={label} checked={selected} onChange={() => update({ dias: selected ? filters.dias.filter((value) => value !== day) : [...filters.dias, day] })} />{label}</label>;
          })}
        </div>
      </fieldset>
    </div>
  );
}

export function CandidateFiltersView({ candidates }: { candidates: CandidateFilterData[] }) {
  const [applied, setApplied] = useState<CandidateFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<CandidateFilters>(EMPTY_FILTERS);
  const [open, setOpen] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const zones = useMemo(() => [...new Set(candidates.flatMap((candidate) => candidate.zonas))].sort(), [candidates]);

  // URL state is an external browser concern; sync it once after hydration so the server
  // render remains deterministic and filtered links can be opened directly.
  useEffect(() => {
    const syncFromUrl = () => {
    const next = readFilters(zones);
    setApplied(next);
    setDraft(next);
    writeFilters(next);
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [zones]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>("button, input, select") ?? [])].filter((element) => !element.hasAttribute("disabled"));
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        filterTriggerRef.current?.focus();
      } else if (event.key === "Tab") {
        const elements = focusable();
        if (elements.length === 0) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [open]);
  const visible = candidates.filter((candidate) => candidateMatchesFilters(candidate, applied));
  const activeCount = [applied.zona, applied.modalidad, applied.pagoMin, applied.pagoMax, ...applied.dias].filter(Boolean).length;
  const close = () => { setOpen(false); filterTriggerRef.current?.focus(); };
  const apply = (next: CandidateFilters) => { const normalized = normalizeFilters(next, zones); setApplied(normalized); setDraft(normalized); writeFilters(normalized); close(); };
  const clear = () => apply(EMPTY_FILTERS);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button ref={filterTriggerRef} type="button" onClick={() => { setDraft(applied); setOpen(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border-strong px-4 text-button text-ink-900 lg:hidden"><Funnel size={18} aria-hidden="true" />Filtrar{activeCount > 0 ? ` (${activeCount})` : ""}</button>
        {activeCount > 0 && <div aria-label="Filtros activos" className="flex flex-wrap gap-2 text-body-sm">{applied.zona && <FilterTag label={`Zona: ${applied.zona}`} onRemove={() => apply({ ...applied, zona: "" })} />}{applied.modalidad && <FilterTag label={`Modalidad: ${MODALITY_LABELS[applied.modalidad as keyof typeof MODALITY_LABELS]}`} onRemove={() => apply({ ...applied, modalidad: "" })} />}{(applied.pagoMin || applied.pagoMax) && <FilterTag label="Rango de pago" onRemove={() => apply({ ...applied, pagoMin: "", pagoMax: "" })} />}{applied.dias.length > 0 && <FilterTag label={`Días: ${applied.dias.length}`} onRemove={() => apply({ ...applied, dias: [] })} />}</div>}
      </div>
      <aside aria-label="Filtros de candidatas" className="hidden w-60 shrink-0 rounded-md border border-border bg-bg-raised p-4 lg:block"><h2 className="text-h2">Filtros</h2><div className="mt-5"><FilterFields filters={applied} setFilters={(next) => { setApplied(next); setDraft(next); writeFilters(next); }} zones={zones} /></div><button type="button" onClick={clear} className="mt-5 min-h-11 text-button text-primary-600">Limpiar</button></aside>
      <div className="min-w-0 flex-1"><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((candidate) => <CandidateCard key={candidate.ninera_id} candidate={candidate} />)}</div>{visible.length === 0 && <p className="rounded-md border border-border bg-bg-raised px-5 py-8 text-center text-body text-ink-600">No hay candidatas con estos filtros. Intenta ampliar tus criterios.</p>}</div>
      {open && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="filters-title" className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-lg bg-bg-raised p-5"><div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" /><div className="flex items-center justify-between"><h2 id="filters-title" className="text-h2">Filtros</h2><button type="button" aria-label="Cerrar filtros" onClick={close} className="flex h-11 w-11 items-center justify-center text-ink-600"><X size={20} aria-hidden="true" /></button></div><div className="mt-5"><FilterFields filters={draft} setFilters={setDraft} zones={zones} /></div><footer className="sticky bottom-0 mt-6 flex items-center justify-between border-t border-border bg-bg-raised pt-4"><button type="button" onClick={() => setDraft(EMPTY_FILTERS)} className="min-h-11 text-button text-primary-600">Limpiar</button><button type="button" onClick={() => apply(draft)} className="min-h-11 rounded-sm bg-primary-600 px-5 text-button text-white">Aplicar filtros</button></footer></section></div>}
    </>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) { return <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-ink-900">{label}<button type="button" aria-label={`Quitar ${label}`} onClick={onRemove}><X size={14} aria-hidden="true" /></button></span>; }
