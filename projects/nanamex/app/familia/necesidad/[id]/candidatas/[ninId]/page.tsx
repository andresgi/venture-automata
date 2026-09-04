/* eslint-disable @next/next/no-img-element -- profile photo URLs are Supabase-managed. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check } from "@phosphor-icons/react/ssr";
import { CandidateDetailActions } from "@/components/familia/candidate-detail-actions";
import { RetryBanner } from "@/components/familia/retry-banner";
import { ReferenceList, type Reference } from "@/components/familia/reference-list";
import { TrustBadge, type VerificationStatus } from "@/components/shared/trust-badge";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { familiaChecklistLabels } from "@/lib/matching/checklist-labels";
import { scoreMatch, type MatchNecesidad, type MatchNinera } from "@/lib/matching/match-score";

export const dynamic = "force-dynamic";

type Params = { id: string; ninId: string };
type Pipeline = { ninera_id: string; match_score_snapshot: number; match_checklist_snapshot: Record<string, boolean>; es_favorita: boolean };
type Row = {
  foto_url: string | null;
  anos_experiencia: number;
  disponibilidad: { dia: string; hora_inicio: string; hora_fin: string }[];
  salario_min: number;
  salario_max: number;
  modalidades_aceptadas: string[];
  descripcion: string | null;
  verification_status: VerificationStatus;
  ninera_experiencia_edades: { rango_edad: string }[];
  ninera_zonas: { zonas: { alcaldia_municipio: string } | null }[];
  referencias: Reference[];
  profiles: { nombre: string | null } | null;
};

const modalityLabels: Record<string, string> = {
  planta: "Planta",
  entrada_salida: "Entrada por salida",
  ocasional: "Ocasional",
};
const dayLabels: Record<string, string> = {
  lun: "Lun",
  mar: "Mar",
  mie: "Mié",
  jue: "Jue",
  vie: "Vie",
  sab: "Sáb",
  dom: "Dom",
};

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="text-h2">{title}</h2>
      <div className="mt-3 text-body text-ink-600">{children}</div>
    </section>
  );
}

export default async function CandidateProfilePage({ params }: { params: Promise<Params> }) {
  const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/login");
  const { id, ninId } = await params;
  const db = createServiceRoleClient();
  const { data: viewerProfile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!viewerProfile || viewerProfile.role !== "familia") redirect("/familia");

  const { data: necesidad, error: necesidadError } = await db
    .from("necesidades")
    .select("id, zona_id, modalidad, dias_horarios, pago_min, pago_max, necesidad_children(rango_edad), zonas(alcaldia_municipio), pipeline(ninera_id, match_score_snapshot, match_checklist_snapshot, es_favorita)")
    .eq("id", id).eq("familia_id", user.id).eq("estado", "activa").maybeSingle();
  if (necesidadError || !necesidad) redirect(`/familia/necesidad/${id}`);

  const { data: candidate, error: candidateError } = await db
    .from("perfil_ninera")
    .select("foto_url, anos_experiencia, disponibilidad, salario_min, salario_max, modalidades_aceptadas, descripcion, verification_status, ninera_experiencia_edades(rango_edad), ninera_zonas(zonas(alcaldia_municipio)), referencias(id, nombre, relacion, periodo, contacto), profiles!inner(nombre, account_status)")
    .eq("profile_id", ninId).eq("publicado", true).eq("perfil_completo", true)
    .eq("profiles.account_status", "activa").maybeSingle();
  if (candidateError) {
    console.error("CandidateProfilePage: failed to load candidate", candidateError);
    return <CandidateProfileError />;
  }
  if (!candidate) return <Unavailable href={`/familia/necesidad/${id}`} />;

  const row = candidate as unknown as Row;
  const need = necesidad as unknown as {
    modalidad: MatchNecesidad["modalidad"];
    dias_horarios: { dia: MatchNecesidad["diasHorarios"][number]["dia"]; hora_inicio: string; hora_fin: string }[];
    pago_min: number;
    pago_max: number;
    necesidad_children: { rango_edad: MatchNecesidad["children"][number] }[];
    zonas: { alcaldia_municipio: string } | null;
    pipeline: Pipeline[];
  };
  const saved = need.pipeline.find((item) => item.ninera_id === ninId);
  const matchNinera: MatchNinera = {
    zonasDeTrabajo: row.ninera_zonas.flatMap((x) => x.zonas ? [x.zonas.alcaldia_municipio] : []),
    disponibilidad: row.disponibilidad.map((x) => ({ dia: x.dia as MatchNinera["disponibilidad"][number]["dia"], horaInicio: x.hora_inicio, horaFin: x.hora_fin })),
    modalidadesAceptadas: row.modalidades_aceptadas as MatchNinera["modalidadesAceptadas"],
    salarioMin: row.salario_min, salarioMax: row.salario_max,
    experienciaEdades: row.ninera_experiencia_edades.map((x) => x.rango_edad) as MatchNinera["experienciaEdades"],
    anosExperiencia: row.anos_experiencia,
  };
  const matchNeed: MatchNecesidad = {
    zona: need.zonas?.alcaldia_municipio ?? "", modalidad: need.modalidad,
    diasHorarios: need.dias_horarios.map((x) => ({ dia: x.dia, horaInicio: x.hora_inicio, horaFin: x.hora_fin })),
    pagoMin: need.pago_min, pagoMax: need.pago_max,
    children: need.necesidad_children.map((x) => x.rango_edad),
  };
  const liveMatch = scoreMatch(matchNeed, matchNinera);
  if (!saved && !liveMatch) return <Unavailable href={`/familia/necesidad/${id}`} />;
  const snapshot = saved ?? { match_score_snapshot: liveMatch!.score, match_checklist_snapshot: liveMatch!.factors };
  const rpc = await db.rpc("record_candidate_profile_view", {
    p_necesidad_id: id, p_familia_id: user.id, p_ninera_id: ninId,
    p_match_score: snapshot.match_score_snapshot, p_match_checklist: snapshot.match_checklist_snapshot,
  });
  if (rpc.error) {
    console.error("CandidateProfilePage: failed to record profile view", rpc.error);
    return <CandidateProfileError />;
  }
  const nombre = row.profiles?.nombre ?? "Niñera";

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-6 pb-28 text-ink-900 sm:px-6 lg:py-12 lg:pb-12">
      <Link href={`/familia/necesidad/${id}`} className="inline-flex min-h-11 items-center gap-2 text-button text-primary-600"><ArrowLeft size={18} />Volver al listado</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="relative -mx-4 overflow-visible rounded-b-lg bg-border sm:-mx-6 lg:mx-0 lg:rounded-lg">
              <div className="overflow-hidden rounded-b-lg lg:rounded-lg">
               {row.foto_url ? <img src={row.foto_url} alt={`Foto de ${nombre}`} className="aspect-[4/5] w-full object-cover lg:aspect-square" /> : <div className="flex aspect-[4/5] items-center justify-center text-7xl text-ink-600 lg:aspect-square">{nombre.charAt(0).toUpperCase()}</div>}
             </div>
             <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-16 lg:hidden"><h1 className="text-h1 text-white">{nombre}</h1><div className="mt-2"><TrustBadge status={row.verification_status} size="detail" /></div></div>
           </div>
          <div className="hidden lg:block"><h1 className="mt-4 text-h1">{nombre}</h1><div className="mt-2"><TrustBadge status={row.verification_status} size="detail" /></div></div>
          <CandidateDetailActions
            necesidadId={id}
            nineraId={ninId}
            score={snapshot.match_score_snapshot}
            checklist={snapshot.match_checklist_snapshot}
            initialFavorite={saved?.es_favorita ?? false}
          />
        </aside>
        <div className="flex flex-col gap-7">
          <section><h2 className="sr-only">Match Score</h2><p className="text-numeral-lg text-primary-600">{snapshot.match_score_snapshot}%</p><p className="text-body text-ink-600">compatible con tu necesidad</p><ul className="mt-3 flex flex-col gap-2">{familiaChecklistLabels(snapshot.match_checklist_snapshot, 5).map((label) => <li key={label} className="flex gap-2 text-body text-ink-600"><Check size={18} aria-hidden="true" />{label}</li>)}</ul></section>
          <DetailSection title="Experiencia"><p>{row.anos_experiencia} años de experiencia</p><p>Experiencia con: {row.ninera_experiencia_edades.map((x) => x.rango_edad).join(", ") || "No especificada"}</p></DetailSection>
          <DetailSection title="Disponibilidad"><ul>{row.disponibilidad.map((slot) => <li key={`${slot.dia}-${slot.hora_inicio}`}>{dayLabels[slot.dia] ?? slot.dia}: {slot.hora_inicio}–{slot.hora_fin}</li>)}</ul></DetailSection>
          <DetailSection title="Modalidades aceptadas"><p>{row.modalidades_aceptadas.map((modality) => modalityLabels[modality] ?? modality).join(", ")}</p></DetailSection>
          <DetailSection title="Expectativa salarial"><p>${row.salario_min.toLocaleString("es-MX")}–${row.salario_max.toLocaleString("es-MX")} MXN</p></DetailSection>
          {row.descripcion && <DetailSection title="Sobre mí"><p className="whitespace-pre-wrap">{row.descripcion}</p></DetailSection>}
          <ReferenceList references={row.referencias} />
        </div>
      </div>
    </main>
  );
}

function Unavailable({ href }: { href: string }) { return <main className="mx-auto flex min-h-screen max-w-[640px] flex-col items-center justify-center gap-4 px-6 text-center"><h1 className="text-h1">Esta candidata ya no está disponible</h1><p className="text-body text-ink-600">No pudimos cargar este perfil. Puedes volver al listado.</p><Link href={href} className="inline-flex min-h-11 items-center rounded-sm bg-primary-600 px-5 text-button text-white">Volver al listado</Link></main>; }

function CandidateProfileError() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[640px] bg-bg px-4 py-6 text-ink-900 sm:px-6 lg:py-12">
      <h1 className="text-h1">No se pudo cargar el perfil</h1>
      <RetryBanner message="No se pudo cargar este perfil. Intenta de nuevo." />
    </main>
  );
}
