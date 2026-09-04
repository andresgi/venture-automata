"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CircleNotch } from "@phosphor-icons/react";
import { advancePipelineStateAction, type PipelineTargetEstado } from "@/actions/pipeline";
import { Toast, type ToastVariant } from "@/components/shared/toast";

export type PipelineEstado = "nueva" | "contactada" | "entrevista" | "contratada" | "descartada";

export type PipelineItem = {
  id: string;
  nineraId: string;
  estado: PipelineEstado;
  nombre: string;
  fotoUrl: string | null;
  updatedAt: string;
};

const PIPELINE_ORDER: PipelineEstado[] = ["nueva", "contactada", "entrevista", "contratada", "descartada"];

const STATE_LABELS: Record<PipelineEstado, string> = {
  nueva: "Nueva",
  contactada: "Contactada",
  entrevista: "Entrevista",
  contratada: "Contratada",
  descartada: "Descartada",
};

// FAM-11 "Avanzar estado" (design/UX-spec.md): manual advance controls apply from
// Contactada onward only -- `nueva` has no manual advance option (its only forward path is
// E5-04's paid `confirm_contact` flow), and `contratada`/`descartada` are terminal.
const ADVANCE_CONFIG: Partial<Record<PipelineEstado, { target: PipelineTargetEstado; label: string }>> = {
  contactada: { target: "entrevista", label: "Marcar entrevista agendada" },
  entrevista: { target: "contratada", label: "Marcar contratada" },
};

function daysInState(updatedAt: string): number {
  const elapsedMs = Date.now() - new Date(updatedAt).getTime();
  return Math.max(0, Math.floor(elapsedMs / (24 * 60 * 60 * 1000)));
}

function PipelineAvatar({ nombre, fotoUrl }: { nombre: string; fotoUrl: string | null }) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- same rationale as CandidateCard.
      <img src={fotoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
    );
  }
  const initial = nombre.trim().charAt(0).toUpperCase() || "?";
  return (
    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-border text-body font-medium text-ink-600">
      {initial}
    </span>
  );
}

function PipelineActions({
  item,
  necesidadId,
  onTransition,
  pending,
  className = "mt-3 flex flex-wrap items-center gap-3",
}: {
  item: PipelineItem;
  necesidadId: string;
  onTransition: (pipelineId: string, target: PipelineTargetEstado, isPending: boolean) => void;
  pending: boolean;
  className?: string;
}) {
  const advance = ADVANCE_CONFIG[item.estado];
  return (
    <div className={className}>
      <Link href={`/familia/necesidad/${necesidadId}/candidatas/${item.nineraId}`} className="min-h-11 inline-flex items-center text-button text-primary-600">
        Ver perfil
      </Link>
      {advance && (
        <button
          type="button"
          disabled={pending}
          onClick={() => onTransition(item.id, advance.target, true)}
          className="min-h-11 inline-flex items-center text-button text-primary-600 disabled:pointer-events-none disabled:opacity-40"
        >
          {advance.label}
        </button>
      )}
      {item.estado !== "descartada" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => onTransition(item.id, "descartada", true)}
          className="min-h-11 inline-flex items-center text-body-sm text-ink-600 underline disabled:pointer-events-none disabled:opacity-40"
        >
          Descartar
        </button>
      )}
      {pending && <CircleNotch size={16} className="animate-spin text-ink-600" aria-hidden="true" />}
    </div>
  );
}

/**
 * FAM-11 pipeline board (design/UI-SPEC.md FAM-11): desktop 5-column kanban (horizontal
 * scroll, no column color-coding), mobile horizontally-scrollable segmented control with
 * denser stacked rows. Both share the same client-side state so a manual transition moves
 * the candidate between columns/tabs immediately, with a success toast per UI-SPEC
 * ("Marcada como Entrevista").
 */
export function PipelineBoard({ necesidadId, initialItems }: { necesidadId: string; initialItems: PipelineItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [activeTab, setActiveTab] = useState<PipelineEstado>(() => PIPELINE_ORDER.find((estado) => initialItems.some((item) => item.estado === estado)) ?? "nueva");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);
  const [isPending, startTransition] = useTransition();

  const byState = new Map<PipelineEstado, PipelineItem[]>();
  for (const estado of PIPELINE_ORDER) byState.set(estado, []);
  for (const item of items) byState.get(item.estado)?.push(item);

  function handleTransition(pipelineId: string, target: PipelineTargetEstado) {
    setPendingId(pipelineId);
    setToast(null);
    startTransition(async () => {
      try {
        const result = await advancePipelineStateAction({ pipelineId, newEstado: target });
        if (result.ok) {
          setItems((current) => current.map((item) => (item.id === pipelineId ? { ...item, estado: result.estado } : item)));
          setToast({ message: `Marcada como ${STATE_LABELS[result.estado]}`, variant: "success" });
        } else {
          setToast({ message: result.message, variant: "error" });
        }
      } catch {
        setToast({ message: "No se pudo actualizar el estado. Intenta de nuevo.", variant: "error" });
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div>
      {/* Desktop: kanban, columns fixed width, horizontal scroll rather than shrinking. */}
      <div className="hidden gap-4 overflow-x-auto pb-4 lg:flex" data-testid="pipeline-kanban">
        {PIPELINE_ORDER.map((estado) => {
          const columnItems = byState.get(estado) ?? [];
          return (
            <section key={estado} className="w-[220px] shrink-0 rounded-md border border-border bg-bg-raised p-3">
              <header className="flex items-baseline justify-between gap-2">
                <h2 className="text-body font-medium text-ink-900">{STATE_LABELS[estado]}</h2>
                <span className="text-body-sm text-ink-400">{columnItems.length}</span>
              </header>
              <div className="mt-3 flex flex-col gap-3">
                {columnItems.map((item) => (
                  <article key={item.id} className="rounded-sm border border-border bg-bg p-3">
                    <div className="flex items-center gap-2">
                      <PipelineAvatar nombre={item.nombre} fotoUrl={item.fotoUrl} />
                      <p className="min-w-0 truncate text-body-sm font-medium text-ink-900">{item.nombre}</p>
                    </div>
                    <PipelineActions item={item} necesidadId={necesidadId} onTransition={handleTransition} pending={isPending && pendingId === item.id} />
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Mobile: horizontally-scrollable segmented control replacing columns. */}
      <div className="lg:hidden">
        <div role="tablist" aria-label="Estado del pipeline" className="flex gap-2 overflow-x-auto pb-2">
          {PIPELINE_ORDER.map((estado) => {
            const count = (byState.get(estado) ?? []).length;
            const selected = activeTab === estado;
            return (
              <button
                key={estado}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(estado)}
                className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-body-sm ${selected ? "border-primary-600 bg-primary-50 text-primary-600" : "border-border text-ink-600"}`}
              >
                {STATE_LABELS[estado]} ({count})
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {(byState.get(activeTab) ?? []).map((item) => (
            <article key={item.id} className="rounded-sm border border-border bg-bg-raised p-3">
              <div className="flex items-center gap-3">
                <PipelineAvatar nombre={item.nombre} fotoUrl={item.fotoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium text-ink-900">{item.nombre}</p>
                  <p className="text-caption text-ink-400">{daysInState(item.updatedAt)} días en este estado</p>
                </div>
              </div>
              <PipelineActions
                item={item}
                necesidadId={necesidadId}
                onTransition={handleTransition}
                pending={isPending && pendingId === item.id}
                className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3"
              />
            </article>
          ))}
          {(byState.get(activeTab) ?? []).length === 0 && <p className="text-body-sm text-ink-600">Sin candidatas en este estado.</p>}
        </div>
      </div>

      {toast ? <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
