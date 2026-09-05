"use client";

import { Funnel, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { OpportunityCard } from "@/components/ninera/opportunity-card";
import { OpportunityEmptyState } from "@/components/ninera/opportunity-empty-state";
import {
  EMPTY_OPPORTUNITY_FILTERS,
  opportunityMatchesFilters,
  sortOpportunities,
  type OpportunityCardData,
  type OpportunityFilters,
} from "@/lib/ninera/opportunities";
import { Compass } from "@phosphor-icons/react/ssr";

const DAYS = [
  ["lun", "Lun"], ["mar", "Mar"], ["mie", "Mié"], ["jue", "Jue"],
  ["vie", "Vie"], ["sab", "Sáb"], ["dom", "Dom"],
] as const;

function readFilters(): OpportunityFilters {
  const params = new URLSearchParams(window.location.search);
  const day = DAYS.some(([value]) => value === params.get("dia")) ? (params.get("dia") ?? "") : "";
  const time = (value: string | null) => (value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : "");
  const start = time(params.get("hora_desde"));
  const end = time(params.get("hora_hasta"));
  const money = (value: string | null) => {
    if (!value || !/^\d+$/.test(value)) return 0;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : 0;
  };
  let minPay = money(params.get("pago_min"));
  let maxPay = money(params.get("pago_max"));
  if (minPay > 0 && maxPay > 0 && minPay > maxPay) { minPay = 0; maxPay = 0; }
  const modalidad = ["planta", "entrada_salida", "ocasional"].includes(params.get("modalidad") ?? "") ? (params.get("modalidad") ?? "") : "";
  return { zona: params.get("zona") ?? "", modalidad, minPay, maxPay, day, start: start && end && start < end ? start : "", end: start && end && start < end ? end : "" };
}

function writeFilters(filters: OpportunityFilters) {
  const params = new URLSearchParams();
  const values: [string, string][] = [
    ["zona", filters.zona], ["modalidad", filters.modalidad],
    ["pago_min", filters.minPay ? String(filters.minPay) : ""], ["pago_max", filters.maxPay ? String(filters.maxPay) : ""],
    ["dia", filters.day], ["hora_desde", filters.start], ["hora_hasta", filters.end],
  ];
  values.forEach(([key, value]) => value && params.set(key, value));
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

function Fields({ filters, onChange }: { filters: OpportunityFilters; onChange: (next: OpportunityFilters) => void }) {
  const update = (change: Partial<OpportunityFilters>) => onChange({ ...filters, ...change });
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
      <label className="flex flex-col gap-1 text-body-sm text-ink-600">
        Zona
        <input value={filters.zona} onChange={(event) => update({ zona: event.target.value })} className="min-h-11 rounded-sm border border-border-strong bg-bg px-3" />
      </label>
      <label className="flex flex-col gap-1 text-body-sm text-ink-600">
        Modalidad
        <select value={filters.modalidad} onChange={(event) => update({ modalidad: event.target.value })} className="min-h-11 rounded-sm border border-border-strong bg-bg px-3">
          <option value="">Todas</option>
          <option value="planta">De planta</option>
          <option value="entrada_salida">Entrada por salida</option>
          <option value="ocasional">Ocasional</option>
        </select>
      </label>
      <fieldset className="sm:col-span-2 xl:col-span-1">
        <legend className="text-body-sm text-ink-600">Rango de pago (MXN)</legend>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <input aria-label="Pago mínimo" type="number" min="0" value={filters.minPay || ""} onChange={(event) => update({ minPay: Number(event.target.value) || 0 })} placeholder="Mínimo" className="min-h-11 min-w-0 rounded-sm border border-border-strong bg-bg px-3" />
          <input aria-label="Pago máximo" type="number" min="0" value={filters.maxPay || ""} onChange={(event) => update({ maxPay: Number(event.target.value) || 0 })} placeholder="Máximo" className="min-h-11 min-w-0 rounded-sm border border-border-strong bg-bg px-3" />
        </div>
      </fieldset>
      <fieldset className="sm:col-span-2 xl:col-span-1">
        <legend className="text-body-sm text-ink-600">Disponibilidad</legend>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <select aria-label="Día" value={filters.day} onChange={(event) => update({ day: event.target.value })} className="min-h-11 rounded-sm border border-border-strong bg-bg px-3">
            <option value="">Cualquier día</option>
            {DAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input aria-label="Desde" type="time" value={filters.start} onChange={(event) => update({ start: event.target.value })} className="min-h-11 rounded-sm border border-border-strong bg-bg px-3" />
          <input aria-label="Hasta" type="time" value={filters.end} onChange={(event) => update({ end: event.target.value })} className="min-h-11 rounded-sm border border-border-strong bg-bg px-3" />
        </div>
      </fieldset>
    </div>
  );
}

export function OpportunityFiltersView({
  opportunities,
  nineraDisponibilidad,
}: {
  opportunities: OpportunityCardData[];
  nineraDisponibilidad: readonly { dia: string; horaInicio: string; horaFin: string }[];
}) {
  const [applied, setApplied] = useState<OpportunityFilters>(EMPTY_OPPORTUNITY_FILTERS);
  const [draft, setDraft] = useState<OpportunityFilters>(EMPTY_OPPORTUNITY_FILTERS);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  // URL state is an external browser concern; sync it after hydration and on browser
  // back/forward navigation so the server render remains deterministic and filtered links
  // can still be opened directly (same pattern as components/familia/candidate-filters.tsx).
  useEffect(() => {
    const syncFromUrl = () => {
      const next = readFilters();
      setApplied(next);
      setDraft(next);
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  // Accessible modal behavior mirroring the already-VERIFIED candidate-filters.tsx: initial
  // focus into the dialog, a Tab-cycle focus trap, Escape-to-close, focus restored to the
  // trigger on close, and background scroll locked while open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () =>
      [...(dialog?.querySelectorAll<HTMLElement>("button, input, select") ?? [])].filter(
        (element) => !element.hasAttribute("disabled"),
      );
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === "Tab") {
        const elements = focusable();
        if (elements.length === 0) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const applyLive = (next: OpportunityFilters) => {
    setApplied(next);
    setDraft(next);
    writeFilters(next);
  };
  const applyDraft = () => {
    applyLive(draft);
    close();
  };
  const clear = () => applyLive(EMPTY_OPPORTUNITY_FILTERS);

  const visible = useMemo(
    () => sortOpportunities(opportunities.filter((item) => opportunityMatchesFilters(item, nineraDisponibilidad, applied))),
    [opportunities, nineraDisponibilidad, applied],
  );
  const hasActiveFilters = Boolean(applied.zona || applied.modalidad || applied.minPay || applied.maxPay || applied.day);

  return (
    <div className="mt-6 flex flex-col gap-6 lg:flex-row">
      <div className="mb-1 flex items-center justify-between lg:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => { setDraft(applied); setOpen(true); }}
          className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border-strong px-4 text-button"
        >
          <Funnel size={18} aria-hidden="true" />
          Filtrar vacantes
        </button>
      </div>

      <aside aria-label="Filtros de vacantes" className="hidden w-64 shrink-0 rounded-md border border-border bg-bg-raised p-4 lg:block">
        <h2 className="text-h2">Filtros</h2>
        <div className="mt-5"><Fields filters={applied} onChange={applyLive} /></div>
        <button type="button" onClick={clear} className="mt-5 min-h-11 text-button text-primary-600">Limpiar</button>
      </aside>

      <section className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-body-sm text-ink-600">{visible.length} vacantes disponibles</p>
          <Link href="/ninera/oportunidades/recibidas" className="inline-flex min-h-11 items-center text-button text-primary-700 underline">Oportunidades recibidas</Link>
        </div>
        {visible.length === 0 ? (
          hasActiveFilters ? (
            <OpportunityEmptyState icon={Compass} headline="No encontramos vacantes con estos filtros" guidance="Intenta ampliar tu zona, modalidad, rango de pago o disponibilidad." actionLabel="Limpiar filtros" onAction={clear} />
          ) : (
            <OpportunityEmptyState icon={Compass} headline="Aún no hay vacantes abiertas" guidance="Las vacantes que publiquen las familias aparecerán aquí. Vuelve pronto." actionLabel="Ver oportunidades recibidas" actionHref="/ninera/oportunidades/recibidas" />
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <OpportunityCard key={item.id} opportunity={item} />)}</div>
        )}
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && close()}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="opportunity-filters-title"
            className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col rounded-t-lg bg-bg-raised"
          >
            <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border-strong" />
            <div className="flex shrink-0 items-center justify-between p-5 pb-0">
              <h2 id="opportunity-filters-title" className="text-h2">Filtros</h2>
              <button type="button" aria-label="Cerrar filtros" onClick={close} className="flex h-11 w-11 items-center justify-center">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <Fields filters={draft} onChange={setDraft} />
            </div>
            <footer className="sticky bottom-0 flex shrink-0 items-center justify-between border-t border-border bg-bg-raised p-5">
              <button type="button" onClick={() => setDraft(EMPTY_OPPORTUNITY_FILTERS)} className="min-h-11 text-button text-primary-600">Limpiar</button>
              <button type="button" onClick={applyDraft} className="min-h-11 rounded-sm bg-primary-600 px-5 text-button text-white">Aplicar filtros</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
