import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase } from "@phosphor-icons/react/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getNineraOnboardingState } from "@/lib/auth/ninera-onboarding";
import { UnauthorizedBanner } from "@/components/auth/unauthorized-banner";
import { NineraNavigation } from "@/components/ninera/ninera-navigation";
import { TrustBadge, type VerificationStatus } from "@/components/shared/trust-badge";
import { OpportunityCard } from "@/components/ninera/opportunity-card";
import { sortOpportunities, type OpportunityCardData, type StoredNecesidadForMatching } from "@/lib/ninera/opportunities";

// NIN-01/02 gate (E7-01), mirroring FAM-01's gate on `/familia`
// (app/familia/page.tsx): a niñera account whose `perfil_ninera` isn't yet
// `perfil_completo` hasn't finished onboarding -- redirected to `/ninera/perfil` first,
// enforcing NIN-01/02's "required to be discoverable" acceptance criterion server-side
// rather than leaving it reachable only via a link a user could skip. Forced dynamic for
// the same reason as app/familia/page.tsx: this check depends on the caller's own session
// on every request.
export const dynamic = "force-dynamic";

type ProfileData = {
  nombre: string | null;
  perfil: {
    verification_status: VerificationStatus;
    disponibilidad: unknown;
    salario_min: number | null;
    salario_max: number | null;
    modalidades_aceptadas: string[] | null;
    descripcion: string | null;
  } | null;
  zonas: { zona_id: string }[] | null;
  edades: { rango_edad: string }[] | null;
};

function completionPercentage(data: ProfileData): number {
  const perfil = data.perfil;
  if (!perfil) return 0;
  const completed = [
    (data.zonas?.length ?? 0) > 0,
    Array.isArray(perfil.disponibilidad) && perfil.disponibilidad.length > 0,
    (perfil.modalidades_aceptadas?.length ?? 0) > 0,
    perfil.salario_min !== null && perfil.salario_max !== null,
    Boolean(perfil.descripcion?.trim()),
    (data.edades?.length ?? 0) > 0,
  ].filter(Boolean).length;
  return Math.round((completed / 6) * 100);
}

function VerificationBanner({ status }: { status: VerificationStatus }) {
  const copy = {
    no_verificada: "Aún no has subido tu identificación. Puedes enviarla para que el equipo de Clin la revise.",
    en_proceso: "Recibimos tu identificación y la estamos revisando. Normalmente toma 24–48 horas.",
    verificada: "Tu identidad fue verificada por el equipo de Clin.",
  }[status];
  return (
    <section className={`flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:gap-5 ${status === "en_proceso" ? "border-trust-pending-600/40 bg-trust-pending-50" : status === "verificada" ? "border-trust-verified-600/40 bg-trust-verified-50" : "border-border bg-bg-raised"}`} aria-label="Estado de verificación">
      <TrustBadge status={status} size="banner" />
      <p className="max-w-2xl text-body text-ink-600">{copy}</p>
      {status !== "verificada" && (
        <Link href="/ninera/perfil/identificacion" className="inline-flex min-h-11 shrink-0 items-center text-button text-primary-700 underline">
          {status === "en_proceso" ? "Ver estado" : "Subir identificación"}
        </Link>
      )}
    </section>
  );
}

function EmptyOpportunities({ incomplete }: { incomplete: boolean }) {
  return (
    <section className="mt-8 border-t border-border pt-8" aria-labelledby="opportunities-heading">
      <div className="flex items-center gap-3">
        <Briefcase size={22} className="text-ink-600" aria-hidden="true" />
        <h2 id="opportunities-heading" className="text-h2">Oportunidades recientes</h2>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <h3 className="text-body font-medium text-ink-900">Aún no tienes oportunidades</h3>
        <p className="text-body-sm text-ink-600">
          {incomplete ? "Completa tu perfil para estar lista cuando aparezcan oportunidades compatibles." : "Las oportunidades compatibles aparecerán aquí cuando estén disponibles. También puedes explorar vacantes abiertas."}
        </p>
        {incomplete && <Link href="/ninera/perfil" className="inline-flex min-h-11 items-center text-button text-primary-700 underline">Completar perfil</Link>}
        <Link href="/ninera/oportunidades" className="inline-flex min-h-11 items-center text-button text-primary-700 underline">Explorar vacantes</Link>
      </div>
    </section>
  );
}

type PushedOpportunityRow = {
  id: string;
  source: string;
  estado: string;
  es_favorita: boolean;
  match_score_snapshot: number;
  match_checklist_snapshot: Record<string, boolean> | null;
  created_at: string;
  necesidades: StoredNecesidadForMatching & { estado?: string } | null;
};

function pushedOpportunityFromRow(row: PushedOpportunityRow): OpportunityCardData | null {
  const necesidad = row.necesidades;
  if (!necesidad || necesidad.estado !== "activa" || row.source !== "pushed") return null;
  return {
    id: row.id,
    zona: Array.isArray(necesidad.zonas) ? necesidad.zonas[0]?.alcaldia_municipio ?? "" : necesidad.zonas?.alcaldia_municipio ?? "",
    modalidad: necesidad.modalidad,
    pagoMin: necesidad.pago_min,
    pagoMax: necesidad.pago_max,
    fechaInicio: necesidad.fecha_inicio,
    score: row.match_score_snapshot,
    factors: row.match_checklist_snapshot ?? {},
    pushed: true,
    recency: necesidad.updated_at,
  };
}

export default async function NineraHomePage() {
  const {
    data: { user },
  } = await (await createServerSupabaseClient()).auth.getUser();

  if (!user) redirect("/login");
  const onboarding = await getNineraOnboardingState(user.id);
  if (onboarding.readError) {
    throw new Error("No pudimos validar tu cuenta. Intenta de nuevo.");
  }
  if (!onboarding.isNinera) {
    redirect("/login");
  }
  if (!onboarding.isOnboarded) {
    redirect("/ninera/perfil");
  }

  const db = createServiceRoleClient();
  const [profileResult, perfilResult, zonasResult, edadesResult, pushedResult] = await Promise.all([
    db.from("profiles").select("nombre").eq("id", user!.id).maybeSingle(),
    db.from("perfil_ninera").select("verification_status,disponibilidad,salario_min,salario_max,modalidades_aceptadas,descripcion").eq("profile_id", user!.id).maybeSingle(),
    db.from("ninera_zonas").select("zona_id").eq("ninera_id", user!.id),
    db.from("ninera_experiencia_edades").select("rango_edad").eq("ninera_id", user!.id),
    db.from("pipeline").select("id,source,estado,es_favorita,created_at,match_score_snapshot,match_checklist_snapshot,necesidades!inner(id,estado,updated_at,dias_horarios,modalidad,pago_min,pago_max,fecha_inicio,zonas(alcaldia_municipio),necesidad_children(rango_edad))").eq("ninera_id", user!.id).eq("source", "pushed").eq("estado", "nueva").eq("necesidades.estado", "activa"),
  ]);
  if (profileResult.error || perfilResult.error || zonasResult.error || edadesResult.error || pushedResult.error) {
    throw new Error("No pudimos cargar tu panel. Intenta de nuevo.");
  }
  if (!profileResult.data || !perfilResult.data) {
    throw new Error("No pudimos cargar tu perfil. Intenta de nuevo.");
  }
  const { data: profile } = profileResult;
  const { data: perfil } = perfilResult;
  const { data: zonas } = zonasResult;
  const { data: edades } = edadesResult;
  const pushedOpportunities = sortOpportunities((Array.isArray(pushedResult.data) ? pushedResult.data : [])
    .map((row) => pushedOpportunityFromRow(row as unknown as PushedOpportunityRow))
    .filter((row): row is OpportunityCardData => row !== null)).slice(0, 3);
  const data: ProfileData = { nombre: profile?.nombre ?? null, perfil, zonas, edades };
  const percentage = completionPercentage(data);
  const incomplete = percentage < 100;

  return <><NineraNavigation /><main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 pb-24 text-ink-900 sm:px-6 lg:ml-[248px] lg:w-[calc(100%-248px)] lg:px-10 lg:py-12">
    <UnauthorizedBanner />
    <header className="mb-8"><h1 className="text-h1">Inicio</h1><p className="mt-2 text-body text-ink-600">Hola{data.nombre ? `, ${data.nombre}` : ""}. Este es tu espacio para seguir tu perfil y tus oportunidades.</p></header>
    <VerificationBanner status={data.perfil?.verification_status ?? "no_verificada"} />
    <section className="mt-8 rounded-md border border-border bg-bg-raised p-5" aria-labelledby="completion-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="completion-heading" className="text-h2">Perfil completo</h2><strong className="text-body font-semibold text-primary-700">{percentage}%</strong></div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-primary-50" role="progressbar" aria-label="Porcentaje de perfil completo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><div className="h-full bg-primary-600 transition-[width]" style={{ width: `${percentage}%` }} /></div>
      {incomplete && <p className="mt-3 text-body-sm text-ink-600">Completa los datos que faltan para que tu perfil pueda mostrarse a las familias.</p>}
      {incomplete && <Link href="/ninera/perfil" className="mt-3 inline-flex min-h-11 items-center text-button text-primary-700 underline">Completar perfil</Link>}
    </section>
    {pushedOpportunities.length > 0 ? <section className="mt-8 border-t border-border pt-8" aria-labelledby="opportunities-heading"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Briefcase size={22} className="text-ink-600" aria-hidden="true" /><h2 id="opportunities-heading" className="text-h2">Oportunidades recientes</h2></div><Link href="/ninera/oportunidades/recibidas" className="inline-flex min-h-11 items-center text-button text-primary-700 underline">Ver todas</Link></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{pushedOpportunities.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} />)}</div><Link href="/ninera/oportunidades" className="mt-4 inline-flex min-h-11 items-center text-button text-primary-700 underline">Explorar vacantes</Link></section> : <EmptyOpportunities incomplete={incomplete} />}
  </main></>;
}
