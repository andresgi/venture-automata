import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { listZonas } from "@/lib/zonas/queries";
import { NecesidadWizard } from "@/components/familia/necesidad-wizard";

export const dynamic = "force-dynamic";

export default async function NecesidadPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/login");
  const { draft: draftId } = await searchParams;
  const db = createServiceRoleClient();
  const [{ data: profile }, zonas, draft] = await Promise.all([
    db.from("profiles").select("role").eq("id", user.id).maybeSingle(), listZonas(),
    draftId ? db.from("necesidades").select("id, zona_id, dias_horarios, modalidad, pago_min, pago_max, fecha_inicio, responsabilidades, necesidad_children(rango_edad)").eq("id", draftId).eq("familia_id", user.id).eq("estado", "borrador").maybeSingle().then((result) => result.data) : Promise.resolve(null),
  ]);
  if (!profile || profile.role !== "familia") redirect("/familia");
  return <NecesidadWizard initialDraftId={draft?.id} zonas={zonas} draft={draft ? { children: (draft.necesidad_children as { rango_edad: "0-1" | "1-3" | "3-6" | "6-12" | "12+" }[]).map((child) => child.rango_edad), zonaId: draft.zona_id, diasHorarios: (draft.dias_horarios as { dia: string; hora_inicio: string; hora_fin: string }[]).map((item) => ({ dia: item.dia as "lun", horaInicio: item.hora_inicio, horaFin: item.hora_fin })), modalidad: draft.modalidad, pagoMin: draft.pago_min, pagoMax: draft.pago_max, fechaInicio: draft.fecha_inicio, responsabilidades: draft.responsabilidades } : undefined} />;
}
