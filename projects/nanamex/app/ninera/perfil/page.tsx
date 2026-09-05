import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { listZonas } from "@/lib/zonas/queries";
import { PerfilNineraWizard } from "@/components/ninera/perfil-ninera-wizard";
import { diasValues } from "@/lib/familia/necesidad-validation";
import type { PerfilNineraDraft } from "@/lib/ninera/perfil-validation";

type StoredSchedule = { dia: string; hora_inicio: string; hora_fin: string };
type DraftSchedule = NonNullable<PerfilNineraDraft["disponibilidad"]>[number];

function isDia(value: string): value is DraftSchedule["dia"] {
  return (diasValues as readonly string[]).includes(value);
}

/**
 * NIN-01/02 "Onboarding perfil" (design/UI-SPEC.md; engineering/database.md §3/§3a/§3b/
 * §3c). Reachable both as first-time onboarding (via `/ninera`'s NIN-01/02 gate) and as a
 * re-visitable resume screen (pre-fills any progress already saved).
 *
 * Forced dynamic for the same reason as app/familia/perfil/page.tsx: reads the caller's own
 * session/profile on every request.
 */
export const dynamic = "force-dynamic";

export default async function NineraPerfilPage() {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const db = createServiceRoleClient();

  const [{ data: perfil }, { data: zonaRows }, { data: edadRows }, { data: referenciaRows }, zonas] = await Promise.all([
    db
      .from("perfil_ninera")
      .select("foto_url, anos_experiencia, disponibilidad, salario_min, salario_max, modalidades_aceptadas, descripcion")
      .eq("profile_id", user.id)
      .maybeSingle(),
    db.from("ninera_zonas").select("zona_id").eq("ninera_id", user.id),
    db.from("ninera_experiencia_edades").select("rango_edad").eq("ninera_id", user.id),
    db.from("referencias").select("nombre, relacion, periodo, contacto").eq("ninera_id", user.id),
    listZonas(),
  ]);

  const disponibilidad: DraftSchedule[] = ((perfil?.disponibilidad as StoredSchedule[] | null) ?? [])
    .filter((item) => isDia(item.dia))
    .map((item) => ({ dia: item.dia as DraftSchedule["dia"], horaInicio: item.hora_inicio, horaFin: item.hora_fin }));

  const draft: Partial<PerfilNineraDraft> = {
    fotoUrl: (perfil?.foto_url as string | null) ?? "",
    zonaIds: (zonaRows ?? []).map((row) => row.zona_id as string),
    anosExperiencia: (perfil?.anos_experiencia as number | null) ?? undefined,
    disponibilidad,
    salarioMin: (perfil?.salario_min as number | null) ?? undefined,
    salarioMax: (perfil?.salario_max as number | null) ?? undefined,
    modalidadesAceptadas: (perfil?.modalidades_aceptadas as PerfilNineraDraft["modalidadesAceptadas"]) ?? [],
    descripcion: (perfil?.descripcion as string | null) ?? "",
    experienciaEdades: (edadRows ?? []).map((row) => row.rango_edad as string) as PerfilNineraDraft["experienciaEdades"],
    referencias: (referenciaRows ?? []).map((row) => ({
      nombre: row.nombre as string,
      relacion: row.relacion as string,
      periodo: row.periodo as string,
      contacto: (row.contacto as string | null) ?? "",
    })),
  };

  return <PerfilNineraWizard zonas={zonas} draft={draft} />;
}
