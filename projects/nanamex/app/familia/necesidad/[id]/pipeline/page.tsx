import Link from "next/link";
import { redirect } from "next/navigation";
import { UsersThree } from "@phosphor-icons/react/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getFamiliaOnboardingState } from "@/lib/auth/familia-onboarding";
import { RetryBanner } from "@/components/familia/retry-banner";
import { PipelineBoard, type PipelineEstado, type PipelineItem } from "@/components/familia/pipeline-board";

// FAM-11 "Estado de candidatas" (design/UX-spec.md / design/UI-SPEC.md). Entry points:
// FAM-02 necesidad card, FAM-10 post-contact redirect. Forced dynamic for the same reason as
// the other `/familia/*` reads: this depends on the caller's own session on every request.
export const dynamic = "force-dynamic";

type PipelineRow = {
  id: string;
  ninera_id: string;
  estado: PipelineEstado;
  updated_at: string;
};

type NineraProfileRow = {
  profile_id: string;
  foto_url: string | null;
  profiles: { nombre: string | null } | { nombre: string | null }[] | null;
};

function EmptyState({ necesidadId }: { necesidadId: string }) {
  return (
    <section className="mt-8 flex flex-col items-center gap-4 rounded-md border border-border bg-bg-raised px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
        <UsersThree size={28} weight="regular" className="text-primary-600" />
      </span>
      <h2 className="text-headline">Aún no hay candidatas en tu pipeline</h2>
      <p className="max-w-[420px] text-body text-ink-600">
        Guarda una favorita o abre el perfil de una candidata desde tu listado para empezar a
        darle seguimiento aquí.
      </p>
      <Link
        href={`/familia/necesidad/${necesidadId}`}
        className="mt-2 inline-flex min-h-11 items-center justify-center rounded-sm bg-primary-600 px-5 py-3 text-button text-white"
      >
        Ver candidatas
      </Link>
    </section>
  );
}

export default async function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const {
    data: { user },
  } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/login");
  const onboarding = await getFamiliaOnboardingState(user.id);
  if (!onboarding.isFamilia) redirect("/familia");
  if (!onboarding.isOnboarded) redirect("/familia/perfil");

  const { id } = await params;
  const db = createServiceRoleClient();

  const { data: necesidad, error: necesidadError } = await db
    .from("necesidades")
    .select("id, estado, pipeline(id, ninera_id, estado, updated_at)")
    .eq("id", id)
    .eq("familia_id", user.id)
    .maybeSingle();

  if (necesidadError) {
    console.error("PipelinePage: failed to read necesidad", necesidadError);
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
        <p className="text-body-sm text-ink-600">Pipeline de candidatas</p>
        <h1 className="mt-2 text-h1">Estado de candidatas</h1>
        <RetryBanner message="No se pudo cargar el pipeline. Intenta de nuevo." />
      </main>
    );
  }

  const row = necesidad as { id: string; estado: string; pipeline: PipelineRow[] | null } | null;
  if (!row) redirect("/familia/necesidad");

  const pipeline = row.pipeline ?? [];
  const nineraIds = pipeline.map((entry) => entry.ninera_id);

  let candidatesById = new Map<string, { nombre: string; fotoUrl: string | null }>();
  let liveReadError = false;
  if (nineraIds.length > 0) {
    const { data: liveRows, error: liveError } = await db
      .from("perfil_ninera")
      .select("profile_id, foto_url, profiles(nombre)")
      .in("profile_id", nineraIds);
    if (liveError) {
      console.error("PipelinePage: failed to read candidate profiles", liveError);
      liveReadError = true;
    } else {
      candidatesById = new Map(
        (liveRows as NineraProfileRow[] | null ?? []).map((entry) => {
          const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
          return [entry.profile_id, { nombre: profile?.nombre ?? "Niñera", fotoUrl: entry.foto_url ?? null }];
        }),
      );
    }
  }

  const items: PipelineItem[] = pipeline.map((entry) => {
    const candidate = candidatesById.get(entry.ninera_id);
    return {
      id: entry.id,
      nineraId: entry.ninera_id,
      estado: entry.estado,
      nombre: candidate?.nombre ?? "Niñera",
      fotoUrl: candidate?.fotoUrl ?? null,
      updatedAt: entry.updated_at,
    };
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
      <p className="text-body-sm text-ink-600">Pipeline de candidatas</p>
      <h1 className="mt-2 text-h1">Estado de candidatas</h1>
      {liveReadError ? (
        <RetryBanner message="No se pudieron cargar las candidatas del pipeline. Intenta de nuevo." />
      ) : items.length === 0 ? (
        <EmptyState necesidadId={id} />
      ) : (
        <div className="mt-6">
          <PipelineBoard necesidadId={id} initialItems={items} />
        </div>
      )}
    </main>
  );
}
