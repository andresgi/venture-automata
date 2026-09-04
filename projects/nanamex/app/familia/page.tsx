import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "@phosphor-icons/react/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { UnauthorizedBanner } from "@/components/auth/unauthorized-banner";

// FAM-02 "Mis necesidades" (dashboard) -- design/UI-SPEC.md FAM-02: card grid of every
// non-terminal necesidad (borrador + activa), a compact plain-text pipeline summary per
// activa necesidad, and empty/loading states. Loading is handled by the sibling
// app/familia/loading.tsx via Next.js's route-level Suspense convention (this is the first
// page in the app with a data fetch slow/real enough to need one -- see that file's header
// comment for why this convention was chosen over a hand-rolled inline Suspense boundary).
//
// FAM-01 gate (E1-03): a familia account with no `perfil_familiar` row yet hasn't completed
// FAM-01 "Onboarding perfil familiar" -- redirected there first, enforcing FAM-01's
// "required to proceed" acceptance criterion server-side rather than leaving it reachable
// only by a link a user could otherwise skip (e.g. the /verificar "Continuar" action, or a
// bookmarked URL). Forced dynamic for the same reason as app/verificar/page.tsx: this check
// depends on the caller's own session on every request.
export const dynamic = "force-dynamic";

type Modalidad = "planta" | "entrada_salida" | "ocasional";
type PipelineEstado = "nueva" | "contactada" | "entrevista" | "contratada" | "descartada";

type Zona = { alcaldia_municipio: string; colonia: string | null };

type NecesidadRow = {
  id: string;
  estado: "borrador" | "activa";
  modalidad: Modalidad;
  zonas: Zona | Zona[] | null;
  pipeline: { estado: PipelineEstado }[] | null;
};

const MODALIDAD_LABELS: Record<Modalidad, string> = {
  planta: "Planta",
  entrada_salida: "Entrada por salida",
  ocasional: "Ocasional",
};

// Display order for the pipeline summary line mirrors the pipeline's own lifecycle
// (database.md §6's enum order), so "2 nuevas · 1 en entrevista" always reads left-to-right
// as "earlier stage -> later stage" rather than in arbitrary count/insertion order.
const PIPELINE_ORDER: PipelineEstado[] = ["nueva", "contactada", "entrevista", "contratada", "descartada"];

const PIPELINE_LABELS: Record<PipelineEstado, { singular: string; plural: string }> = {
  nueva: { singular: "nueva", plural: "nuevas" },
  contactada: { singular: "contactada", plural: "contactadas" },
  // "en entrevista" is a prepositional phrase, not an adjective -- it doesn't inflect for
  // number ("1 en entrevista" / "2 en entrevista" are both correct Spanish).
  entrevista: { singular: "en entrevista", plural: "en entrevista" },
  contratada: { singular: "contratada", plural: "contratadas" },
  descartada: { singular: "descartada", plural: "descartadas" },
};

function zonaLabel(zonas: NecesidadRow["zonas"]): string {
  const zona = Array.isArray(zonas) ? zonas[0] : zonas;
  if (!zona) return "Zona sin especificar";
  return zona.colonia ? `${zona.colonia}, ${zona.alcaldia_municipio}` : zona.alcaldia_municipio;
}

/** UI-SPEC FAM-02: "a compact pipeline summary row (small count per state ... plain text,
 * not 5 separate badges)". Returns null when there are no pipeline rows at all yet (an
 * activa necesidad with zero candidates), which the caller renders as its own fallback
 * line rather than an empty string. */
function pipelineSummary(pipeline: { estado: PipelineEstado }[]): string | null {
  const counts = new Map<PipelineEstado, number>();
  for (const row of pipeline) counts.set(row.estado, (counts.get(row.estado) ?? 0) + 1);
  const parts = PIPELINE_ORDER.filter((estado) => (counts.get(estado) ?? 0) > 0).map((estado) => {
    const count = counts.get(estado) as number;
    const label = count === 1 ? PIPELINE_LABELS[estado].singular : PIPELINE_LABELS[estado].plural;
    return `${count} ${label}`;
  });
  return parts.length > 0 ? parts.join(" · ") : null;
}

function StatusChip({ estado }: { estado: NecesidadRow["estado"] }) {
  return (
    <span className="shrink-0 rounded-full border border-border bg-bg px-3 py-1 text-caption text-ink-600">
      {estado === "activa" ? "Activa" : "Borrador"}
    </span>
  );
}

function NecesidadCard({ necesidad }: { necesidad: NecesidadRow }) {
  const isActiva = necesidad.estado === "activa";
  const summary = isActiva ? pipelineSummary(necesidad.pipeline ?? []) : null;

  return (
    <article className="rounded-md border border-border bg-bg-raised p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-body font-medium text-ink-900">{zonaLabel(necesidad.zonas)}</p>
        <StatusChip estado={necesidad.estado} />
      </div>
      <p className="mt-1 text-body-sm text-ink-600">{MODALIDAD_LABELS[necesidad.modalidad] ?? necesidad.modalidad}</p>
      {isActiva && (
        <p className="mt-3 text-body-sm text-ink-600">
          {summary ?? "Aún no hay candidatas para esta necesidad."}
        </p>
      )}
      <Link
        href={isActiva ? `/familia/necesidad/${necesidad.id}` : `/familia/necesidad?draft=${necesidad.id}`}
        className="mt-4 inline-flex min-h-11 items-center text-body-sm font-medium text-primary-600 hover:underline"
      >
        {isActiva ? "Ver candidatas" : "Continuar borrador"}
      </Link>
    </article>
  );
}

// UI-SYSTEM §5.8 empty-state template: icon inside a primary-50 circular container ->
// Fraunces headline -> one body line of guidance -> one primary action.
function EmptyState() {
  return (
    <section className="mt-12 flex flex-col items-center gap-4 rounded-md border border-border bg-bg-raised px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        <Heart size={28} className="text-primary-600" />
      </span>
      <h2 className="text-headline">Encuentra a tu próxima niñera</h2>
      <p className="max-w-[420px] text-body text-ink-600">
        Cuéntanos qué necesitas y te mostraremos niñeras compatibles con tu familia.
      </p>
      <Link
        href="/familia/necesidad"
        className="mt-2 inline-flex min-h-11 items-center justify-center rounded-sm bg-primary-600 px-5 py-3 text-button text-white"
      >
        Crear necesidad
      </Link>
    </section>
  );
}

// Top-of-screen header: h1 + primary "Crear necesidad" button. UI-SPEC FAM-02's literal
// text is sticky-bottom-if-the-list-is-short, inline-top otherwise -- this implementation
// simplifies that to always inline-top (stacked below the h1 on narrow screens, side-by-side
// from `sm:` up), a deliberate MVP simplification rather than a literal reading of the spec,
// to avoid adding a length-based threshold heuristic for a dashboard that will rarely hold
// more than a handful of cards.
function DashboardHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-h1">Mis necesidades</h1>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/familia/favoritas"
          className="inline-flex min-h-11 w-fit items-center gap-2 text-button text-primary-600"
        >
          <Heart size={18} aria-hidden="true" />
          Favoritas
        </Link>
        <Link
          href="/familia/necesidad"
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-sm bg-primary-600 px-5 py-3 text-button text-white"
        >
          Crear necesidad
        </Link>
      </div>
    </div>
  );
}

export default async function FamiliaHomePage() {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
        <Suspense fallback={null}>
          <UnauthorizedBanner />
        </Suspense>
        <DashboardHeader />
      </main>
    );
  }

  const db = createServiceRoleClient();
  const { data: perfilFamiliar } = await db
    .from("perfil_familiar")
    .select("profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!perfilFamiliar) {
    redirect("/familia/perfil");
  }

  const { data: necesidadesData } = await db
    .from("necesidades")
    .select("id, estado, modalidad, zonas(alcaldia_municipio, colonia), pipeline(estado)")
    .eq("familia_id", user.id)
    .in("estado", ["borrador", "activa"])
    .order("updated_at", { ascending: false });

  const necesidades = (necesidadesData ?? []) as NecesidadRow[];

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
      <Suspense fallback={null}>
        <UnauthorizedBanner />
      </Suspense>
      <DashboardHeader />
      {necesidades.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {necesidades.map((necesidad) => (
            <NecesidadCard key={necesidad.id} necesidad={necesidad} />
          ))}
        </div>
      )}
    </main>
  );
}
