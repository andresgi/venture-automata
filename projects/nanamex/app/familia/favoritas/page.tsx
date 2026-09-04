import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "@phosphor-icons/react/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { RetryBanner } from "@/components/familia/retry-banner";
import { CandidateCard, type CandidateCardData } from "@/components/familia/candidate-card";
import { familiaChecklistLabels } from "@/lib/matching/checklist-labels";
import type { VerificationStatus } from "@/components/shared/trust-badge";
import { getFamiliaOnboardingState } from "@/lib/auth/familia-onboarding";

// FAM-07 "Favoritas" (design/screen-inventory.md, design/UI-SPEC.md FAM-07): saved niñeras
// across all of this family's necesidades, using the same card component as FAM-04, grouped
// by necesidad when a niñera is favorited under more than one. Forced dynamic for the same
// reason as the rest of `/familia/*`: reads depend on the caller's own session every request.
export const dynamic = "force-dynamic";

type Zona = { alcaldia_municipio: string; colonia: string | null };
type Modalidad = "planta" | "entrada_salida" | "ocasional";
type NecesidadEstado = "borrador" | "activa" | "cerrada_contratada" | "cerrada_cancelada";
type PipelineRow = {
  ninera_id: string;
  match_score_snapshot: number;
  match_checklist_snapshot: Record<string, boolean>;
  es_favorita: boolean;
};
type NecesidadRow = {
  id: string;
  modalidad: Modalidad;
  estado: NecesidadEstado;
  created_at: string;
  zonas: Zona | Zona[] | null;
  pipeline: PipelineRow[] | null;
};
type NineraLiveRow = {
  profile_id: string;
  foto_url: string | null;
  verification_status: VerificationStatus;
  profiles: { nombre: string | null } | { nombre: string | null }[] | null;
};

const MODALIDAD_LABELS: Record<Modalidad, string> = {
  planta: "Planta",
  entrada_salida: "Entrada por salida",
  ocasional: "Ocasional",
};

function zonaLabel(zonas: NecesidadRow["zonas"]): string {
  const zona = Array.isArray(zonas) ? zonas[0] : zonas;
  if (!zona) return "Zona sin especificar";
  return zona.colonia ? `${zona.colonia}, ${zona.alcaldia_municipio}` : zona.alcaldia_municipio;
}

// UI-SYSTEM §5.8 empty-state template, per UI-SPEC FAM-07's specified copy exactly: icon
// inside a primary-50 circular container -> Fraunces headline -> one primary action to the
// first active necesidad's FAM-04 (or, if the family has no active necesidad at all yet,
// back to the dashboard -- there is no FAM-04 to link to in that case).
function EmptyState({ href, label }: { href: string; label: string }) {
  return (
    <section className="mt-8 flex flex-col items-center gap-4 rounded-md border border-border bg-bg-raised px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        <Heart size={28} weight="regular" className="text-primary-600" />
      </span>
      <h2 className="text-headline">Aún no has guardado ninguna niñera</h2>
      <Link
        href={href}
        className="mt-2 inline-flex min-h-11 items-center justify-center rounded-sm bg-primary-600 px-5 py-3 text-button text-white"
      >
        {label}
      </Link>
    </section>
  );
}

type NecesidadGroup = {
  necesidadId: string;
  label: string;
  isClosed: boolean;
  candidates: CandidateCardData[];
};

// Screen-inventory.md's FAM-07 entry shows saved niñeras "across all necesidades," so a
// favorite must not disappear once its necesidad closes (`cerrada_contratada`/
// `cerrada_cancelada`) -- `es_favorita` is permanent per architecture.md §17/database.md §6.
// Closed-necesidad groups are still rendered but de-emphasized (muted label, dimmed cards,
// no "Ver candidatas" link, since FAM-04's necesidad detail page redirects away from any
// non-`activa` necesidad today -- linking there would be a dead end).
function buildGroups(necesidades: NecesidadRow[], liveRows: NineraLiveRow[]): NecesidadGroup[] {
  const liveById = new Map(liveRows.map((row) => [row.profile_id, row]));
  return necesidades
    .map((necesidad) => {
      const isClosed = necesidad.estado !== "activa";
      const candidates = (necesidad.pipeline ?? [])
        .filter((row) => row.es_favorita)
        .map((row): CandidateCardData | null => {
          const live = liveById.get(row.ninera_id);
          if (!live) return null;
          const profile = Array.isArray(live.profiles) ? live.profiles[0] : live.profiles;
          return {
            // `necesidadId` intentionally omitted for a closed necesidad -- both FAM-04's
            // necesidad detail page and FAM-06's candidate detail page redirect away from
            // any non-`activa` necesidad, and `set_candidate_favorite`'s ownership check
            // requires `estado = 'activa'` unconditionally (including the unfavorite
            // direction), so wiring an interactive toggle/link here would silently fail or
            // dead-end. `CandidateCard` already has a disabled-placeholder fallback for a
            // missing `necesidadId` (previously unreachable dead code per Code Review's
            // E4-04 Minor Issue #1) -- this is now that fallback's first real caller.
            necesidadId: isClosed ? undefined : necesidad.id,
            ninera_id: row.ninera_id,
            nombre: profile?.nombre ?? "Niñera",
            fotoUrl: live.foto_url,
            verificationStatus: live.verification_status,
            score: row.match_score_snapshot,
            checklist: familiaChecklistLabels(row.match_checklist_snapshot),
            matchFactors: row.match_checklist_snapshot,
            isFavorite: true,
            disabledReason: isClosed ? "necesidad cerrada" : undefined,
          };
        })
        .filter((candidate): candidate is CandidateCardData => candidate !== null)
        .sort((a, b) => b.score - a.score || a.ninera_id.localeCompare(b.ninera_id));
      return {
        necesidadId: necesidad.id,
        label: `${zonaLabel(necesidad.zonas)} · ${MODALIDAD_LABELS[necesidad.modalidad]}`,
        isClosed,
        candidates,
      };
    })
    .filter((group) => group.candidates.length > 0)
    .sort((a, b) => Number(a.isClosed) - Number(b.isClosed));
}

export default async function FavoritasPage() {
  const {
    data: { user },
  } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/login");

  const onboarding = await getFamiliaOnboardingState(user.id);
  if (!onboarding.isFamilia) redirect("/familia");
  if (!onboarding.isOnboarded) redirect("/familia/perfil");

  const db = createServiceRoleClient();

  // Intentionally not scoped to `estado = 'activa'` -- screen-inventory.md's FAM-07 entry
  // covers saved niñeras across all of the family's necesidades, including closed ones
  // (see `buildGroups`'s de-emphasis handling below).
  const { data: necesidadesData, error: necesidadesError } = await db
    .from("necesidades")
    .select("id, modalidad, estado, created_at, zonas(alcaldia_municipio, colonia), pipeline(ninera_id, match_score_snapshot, match_checklist_snapshot, es_favorita)")
    .eq("familia_id", user.id)
    .order("created_at", { ascending: true });

  if (necesidadesError) {
    console.error("FavoritasPage: failed to read necesidades", necesidadesError);
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
        <h1 className="mt-2 text-h1">Favoritas</h1>
        <RetryBanner message="No se pudieron cargar tus favoritas. Intenta de nuevo." />
      </main>
    );
  }

  const necesidades = (necesidadesData ?? []) as NecesidadRow[];
  const favoriteNineraIds = [...new Set(necesidades.flatMap((n) => (n.pipeline ?? []).filter((p) => p.es_favorita).map((p) => p.ninera_id)))];

  let liveRows: NineraLiveRow[] = [];
  let liveError = false;
  if (favoriteNineraIds.length > 0) {
    // Same "read verification/publish status live, never trust the frozen snapshot for it"
    // rule as FAM-04 (architecture.md §18) -- a favorite that's no longer a currently
    // eligible published/complete/active candidate simply drops out of this list.
    const { data, error } = await db
      .from("perfil_ninera")
      .select("profile_id, foto_url, verification_status, profiles!inner(nombre)")
      .in("profile_id", favoriteNineraIds)
      .eq("publicado", true)
      .eq("perfil_completo", true)
      .eq("profiles.account_status", "activa");
    if (error) {
      console.error("FavoritasPage: failed to read live niñera status", error);
      liveError = true;
    } else {
      liveRows = (data ?? []) as NineraLiveRow[];
    }
  }

  if (liveError) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
        <h1 className="mt-2 text-h1">Favoritas</h1>
        <RetryBanner message="No se pudieron cargar tus favoritas. Intenta de nuevo." />
      </main>
    );
  }

  const groups = buildGroups(necesidades, liveRows);

  if (groups.length === 0) {
    const firstActive = necesidades.find((n) => n.estado === "activa");
    const href = firstActive ? `/familia/necesidad/${firstActive.id}` : "/familia";
    const label = firstActive ? "Ver candidatas" : "Ver mis necesidades";
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
        <h1 className="mt-2 text-h1">Favoritas</h1>
        <EmptyState href={href} label={label} />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
      <h1 className="mt-2 text-h1">Favoritas</h1>
      <div className="mt-8 flex flex-col gap-10">
        {groups.map((group) => (
          <section key={group.necesidadId} aria-labelledby={`group-${group.necesidadId}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 id={`group-${group.necesidadId}`} className={group.isClosed ? "text-h2 text-ink-400" : "text-h2"}>
                {group.label}
                {group.isClosed ? <span className="ml-2 text-caption text-ink-400">Necesidad cerrada</span> : null}
              </h2>
              {group.isClosed ? null : (
                <Link href={`/familia/necesidad/${group.necesidadId}`} className="min-h-11 inline-flex items-center text-button text-primary-600">
                  Ver candidatas
                </Link>
              )}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.candidates.map((candidate) => (
                <CandidateCard key={candidate.ninera_id} candidate={candidate} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
