import { redirect } from "next/navigation";
import { Compass } from "@phosphor-icons/react/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getNineraOnboardingState } from "@/lib/auth/ninera-onboarding";
import { NineraNavigation } from "@/components/ninera/ninera-navigation";
import { OpportunityCard } from "@/components/ninera/opportunity-card";
import { OpportunityEmptyState } from "@/components/ninera/opportunity-empty-state";
import type { OpportunityCardData, StoredNecesidadForMatching } from "@/lib/ninera/opportunities";
import { sortOpportunities } from "@/lib/ninera/opportunities";

export const dynamic = "force-dynamic";

type Row = { id: string; source: string; estado: string; es_favorita: boolean; created_at: string; match_score_snapshot: number; match_checklist_snapshot: Record<string, boolean> | null; necesidades: StoredNecesidadForMatching & { estado?: string; updated_at: string } | null };

function card(row: Row): OpportunityCardData | null {
  const need = row.necesidades;
  if (!need || need.estado !== "activa" || row.source !== "pushed") return null;
  const zona = Array.isArray(need.zonas) ? need.zonas[0]?.alcaldia_municipio : need.zonas?.alcaldia_municipio;
  return { id: row.id, zona: zona ?? "", modalidad: need.modalidad, pagoMin: need.pago_min, pagoMax: need.pago_max, fechaInicio: need.fecha_inicio, score: row.match_score_snapshot, factors: row.match_checklist_snapshot ?? {}, pushed: true, recency: need.updated_at, diasHorarios: [] };
}

export default async function ReceivedOpportunitiesPage() {
  const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/login");
  const onboarding = await getNineraOnboardingState(user.id);
  if (onboarding.readError) throw new Error("No pudimos validar tu cuenta. Intenta de nuevo.");
  if (!onboarding.isNinera) redirect("/login");
  if (!onboarding.isOnboarded) redirect("/ninera/perfil");

  const db = createServiceRoleClient();
  const result = await db.from("pipeline").select("id,source,estado,es_favorita,match_score_snapshot,match_checklist_snapshot,created_at,necesidades!inner(id,estado,updated_at,dias_horarios,modalidad,pago_min,pago_max,fecha_inicio,zonas(alcaldia_municipio),necesidad_children(rango_edad))").eq("ninera_id", user.id).eq("source", "pushed").eq("estado", "nueva").eq("necesidades.estado", "activa");
  if (result.error) throw new Error("No pudimos cargar tus oportunidades. Intenta de nuevo.");
  const opportunities = sortOpportunities((Array.isArray(result.data) ? result.data : []).map((row) => card(row as unknown as Row)).filter((item): item is OpportunityCardData => item !== null));

  return <><NineraNavigation /><main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 pb-24 text-ink-900 sm:px-6 lg:ml-[248px] lg:w-[calc(100%-248px)] lg:px-10 lg:py-12"><header><h1 className="text-h1">Oportunidades recibidas</h1><p className="mt-2 text-body text-ink-600">Vacantes que coinciden con lo que buscas.</p></header>{opportunities.length === 0 ? <OpportunityEmptyState icon={Compass} headline="Aún no tienes oportunidades" guidance="Mientras te llegan vacantes, explora las que ya están abiertas y muestra interés en las que te convengan." actionLabel="Explorar vacantes" actionHref="/ninera/oportunidades" /> : <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{opportunities.map((item) => <OpportunityCard key={item.id} opportunity={item} />)}</div>}</main></>;
}
