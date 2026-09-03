import Link from "next/link";
import { redirect } from "next/navigation";
import { CaretDown, UsersThree } from "@phosphor-icons/react/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { RetryBanner } from "@/components/familia/retry-banner";
import { familiaChecklistLabels } from "@/lib/matching/checklist-labels";
import type { VerificationStatus } from "@/components/shared/trust-badge";
import { CandidateFiltersView, type CandidateFilterData } from "@/components/familia/candidate-filters";

// FAM-04 "Listado de candidatas" (design/UI-SPEC.md FAM-04) -- replaces E2-02's minimal
// placeholder. Auth/data-fetching/redirect logic for the necesidad itself is unchanged from
// that placeholder (already reviewed/tested); this story rebuilds the rendering into the
// real default/empty/loading/error states, the candidate card (photo/avatar + nombre +
// `TrustBadge`, `MatchScore` compact + checklist, footer affordances), and a collapsible
// necesidad-summary header. Forced dynamic because the necesidad/pipeline/live-verification
// reads depend on the caller's own session on every request (same reasoning as the other
// `/familia/*` pages).
export const dynamic = "force-dynamic";

type Modalidad = "planta" | "entrada_salida" | "ocasional";
type Dia = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";
type DiaHorario = { dia: Dia; hora_inicio: string; hora_fin: string };
type Zona = { alcaldia_municipio: string; colonia: string | null };
type PipelineRow = {
  id: string;
  ninera_id: string;
  match_score_snapshot: number;
  match_checklist_snapshot: Record<string, boolean>;
};
type NecesidadRow = {
  id: string;
  modalidad: Modalidad;
  dias_horarios: DiaHorario[] | null;
  pago_min: number | null;
  pago_max: number | null;
  zonas: Zona | Zona[] | null;
  estado: string;
  pipeline: PipelineRow[] | null;
};
type NineraLiveRow = {
  profile_id: string;
  foto_url: string | null;
  verification_status: VerificationStatus;
  perfil_completo?: boolean;
  created_at?: string;
  salario_min: number | null;
  salario_max: number | null;
  modalidades_aceptadas: string[] | null;
  disponibilidad: { dia: string; hora_inicio: string; hora_fin: string }[] | null;
  zonas_trabajo: { zona_id: string; zonas: { alcaldia_municipio: string } | { alcaldia_municipio: string }[] | null }[] | null;
  profiles: { nombre: string | null; created_at?: string; account_status?: string } | { nombre: string | null; created_at?: string; account_status?: string }[] | null;
};

const MODALIDAD_LABELS: Record<Modalidad, string> = {
  planta: "Planta",
  entrada_salida: "Entrada por salida",
  ocasional: "Ocasional",
};

const DAY_ORDER: Dia[] = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
const DAY_LABELS: Record<Dia, string> = {
  lun: "Lun",
  mar: "Mar",
  mie: "Mié",
  jue: "Jue",
  vie: "Vie",
  sab: "Sáb",
  dom: "Dom",
};

function zonaLabel(zonas: NecesidadRow["zonas"]): string {
  const zona = Array.isArray(zonas) ? zonas[0] : zonas;
  if (!zona) return "Zona sin especificar";
  return zona.colonia ? `${zona.colonia}, ${zona.alcaldia_municipio}` : zona.alcaldia_municipio;
}

function sortedDiasHorarios(diasHorarios: DiaHorario[]): DiaHorario[] {
  return [...diasHorarios].sort((a, b) => DAY_ORDER.indexOf(a.dia) - DAY_ORDER.indexOf(b.dia));
}

function diasSummary(diasHorarios: DiaHorario[]): string {
  if (diasHorarios.length === 0) return "Sin días definidos";
  return sortedDiasHorarios(diasHorarios)
    .map((entry) => DAY_LABELS[entry.dia])
    .join(", ");
}

function pagoRangeLabel(pagoMin: number | null, pagoMax: number | null): string {
  if (pagoMin === null && pagoMax === null) return "Rango de pago sin especificar";
  return `$${(pagoMin ?? 0).toLocaleString("es-MX")} – $${(pagoMax ?? 0).toLocaleString("es-MX")} MXN/semana`;
}

/** Collapsible necesidad-summary header (UI-SPEC FAM-04): one-line zona/modalidad/días
 * summary, expandable via the native `<details>` element (no client JS needed) for the
 * full schedule + rango de pago detail. */
function NecesidadSummaryHeader({ necesidad }: { necesidad: NecesidadRow }) {
  const diasHorarios = necesidad.dias_horarios ?? [];
  return (
    <details className="group mt-6 rounded-md border border-border bg-bg-raised">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-body text-ink-900">
        <span>
          {zonaLabel(necesidad.zonas)} · {MODALIDAD_LABELS[necesidad.modalidad]} · {diasSummary(diasHorarios)}
        </span>
        <CaretDown size={18} weight="regular" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-4 py-3 text-body-sm text-ink-600">
        <p>{pagoRangeLabel(necesidad.pago_min, necesidad.pago_max)}</p>
        <ul className="mt-2 flex flex-col gap-1">
          {sortedDiasHorarios(diasHorarios).map((entry) => (
            <li key={entry.dia}>
              {DAY_LABELS[entry.dia]} {entry.hora_inicio}–{entry.hora_fin}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

// UI-SYSTEM §5.8 empty-state template: icon inside a primary-50 circular container ->
// Fraunces headline -> one body line of guidance (naming the likely blocking field) -> one
// primary action. Rendered calmly, no error/warning color, per UI-SPEC FAM-04's explicit
// "this is an expected outcome, not a failure" note.
//
// The spec's literal primary action is "Editar necesidad" -> FAM-03 revisión step, but
// editing an already-published (`activa`) necesidad is genuinely unbuilt (E2-04's scope --
// see agent/reviews/code-E2-02-review.md). Reusing E2-02's already-reviewed honest
// placeholder here too: an accurately-labeled button back to the "Mis necesidades"
// dashboard, not a mislabeled "Editar necesidad" that would 404 or open a blank draft.
function EmptyState() {
  return (
    <section className="mt-8 flex flex-col items-center gap-4 rounded-md border border-border bg-bg-raised px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        <UsersThree size={28} weight="regular" className="text-primary-600" />
      </span>
      <h2 className="text-headline">Aún no encontramos candidatas para esta necesidad</h2>
      <p className="max-w-[420px] text-body text-ink-600">
        Intenta ampliar tu zona o tu rango de pago para encontrar más opciones.
      </p>
      <Link
        href="/familia"
        className="mt-2 inline-flex min-h-11 items-center justify-center rounded-sm bg-primary-600 px-5 py-3 text-button text-white"
      >
        Volver a mis necesidades
      </Link>
    </section>
  );
}

type RankedCandidate = CandidateFilterData & { profileCompleteness: number; createdAt: string };

function mergeCandidates(pipeline: PipelineRow[], liveRows: NineraLiveRow[]): RankedCandidate[] {
  const liveById = new Map(liveRows.map((row) => [row.profile_id, row]));
  return pipeline
    .map((row) => {
      const live = liveById.get(row.ninera_id);
      if (!live) return null;
      const profile = Array.isArray(live?.profiles) ? live?.profiles[0] : live?.profiles;
      return {
        ninera_id: row.ninera_id,
        nombre: profile?.nombre ?? "Niñera",
        fotoUrl: live?.foto_url ?? null,
        // Live verification status per architecture §18's badge-integrity design -- if the
        // live row is somehow missing (should not happen for a real published match), fall
        // back to the quietest state rather than fabricating a claim.
        verificationStatus: live?.verification_status ?? "no_verificada",
        score: row.match_score_snapshot,
        checklist: familiaChecklistLabels(row.match_checklist_snapshot),
        zonas: (live.zonas_trabajo ?? []).flatMap((entry) => {
          const zone = Array.isArray(entry.zonas) ? entry.zonas[0] : entry.zonas;
          return zone?.alcaldia_municipio ? [zone.alcaldia_municipio] : [];
        }),
        salarioMin: live.salario_min,
        salarioMax: live.salario_max,
        modalidades: live.modalidades_aceptadas ?? [],
        disponibilidad: live.disponibilidad ?? [],
        profileCompleteness: live.perfil_completo === true ? 100 : 0,
        createdAt: live.created_at ?? "",
      } satisfies CandidateFilterData;
    })
    .filter((candidate): candidate is RankedCandidate => candidate !== null)
    .sort((a, b) => b.score - a.score || b.profileCompleteness - a.profileCompleteness || a.createdAt.localeCompare(b.createdAt) || a.ninera_id.localeCompare(b.ninera_id));
}

export default async function MatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const {
    data: { user },
  } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const db = createServiceRoleClient();

  const { data: necesidad, error: necesidadError } = await db
    .from("necesidades")
    .select(
      "id, modalidad, dias_horarios, pago_min, pago_max, zonas(alcaldia_municipio, colonia), estado, pipeline(id, ninera_id, match_score_snapshot, match_checklist_snapshot)",
    )
    .eq("id", id)
    .eq("familia_id", user.id)
    .maybeSingle();

  // A genuine read failure (network/DB error) is a different case from "not found" --
  // surfacing it as the documented inline retry banner instead of silently redirecting
  // away, which would hide an operational problem behind a misleading "no candidates" or
  // "not found" outcome.
  if (necesidadError) {
    console.error("MatchesPage: failed to read necesidad", necesidadError);
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
        <p className="text-body-sm text-ink-600">Listado de candidatas</p>
        <h1 className="mt-2 text-h1">Candidatas para tu necesidad</h1>
        <RetryBanner message="No se pudo cargar tu necesidad. Intenta de nuevo." />
      </main>
    );
  }

  const row = necesidad as unknown as NecesidadRow | null;
  if (!row || row.estado !== "activa") redirect("/familia/necesidad");

  const pipeline = row.pipeline ?? [];
  const nineraIds = pipeline.map((match) => match.ninera_id);

  let candidates: CandidateFilterData[] = [];
  let liveStatusError = false;

  if (nineraIds.length > 0) {
    // `pipeline.match_score_snapshot`/`match_checklist_snapshot` are frozen at publish
    // time (E2-02), but `perfil_ninera.verification_status` (the `TrustBadge`'s source)
    // can change afterward -- read it fresh here rather than trusting anything frozen, per
    // architecture.md §18's badge-integrity design.
    const { data: liveRows, error: liveError } = await db
      .from("perfil_ninera")
      .select("profile_id, foto_url, verification_status, perfil_completo, created_at, salario_min, salario_max, modalidades_aceptadas, disponibilidad, zonas_trabajo: ninera_zonas(zona_id, zonas(alcaldia_municipio)), profiles!inner(nombre, created_at, account_status)")
      .in("profile_id", nineraIds)
      .eq("publicado", true)
      .eq("perfil_completo", true)
      .eq("profiles.account_status", "activa");

    if (liveError) {
      console.error("MatchesPage: failed to read live niñera verification status", liveError);
      liveStatusError = true;
    } else {
      candidates = mergeCandidates(pipeline, (liveRows ?? []) as NineraLiveRow[]);
      if (pipeline.length > 0 && candidates.length === 0) liveStatusError = true;
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
      <p className="text-body-sm text-ink-600">Listado de candidatas</p>
      <h1 className="mt-2 text-h1">Candidatas para tu necesidad</h1>
      <NecesidadSummaryHeader necesidad={row} />
      {liveStatusError ? (
        <RetryBanner message="No se pudieron cargar las candidatas. Intenta de nuevo." />
      ) : pipeline.length === 0 || candidates.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <CandidateFiltersView candidates={candidates} />
        </div>
      )}
    </main>
  );
}
