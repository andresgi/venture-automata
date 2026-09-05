import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { PerfilNineraEdit } from "@/components/ninera/perfil-ninera-edit";
import type { ZonaOption } from "@/lib/zonas/queries";
import { diasValues } from "@/lib/familia/necesidad-validation";
import { NineraNavigation } from "@/components/ninera/ninera-navigation";
export const dynamic = "force-dynamic";
export default async function NineraPerfilPage() {
  const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/login");
  const db = createServiceRoleClient();
  const [{ data: profile, error: profileError }, { data: perfil, error: perfilError }, { data: zonas, error: zonasError }, { data: edades, error: edadesError }, { data: referencias, error: referenciasError }, { data: zonaRows, error: zonaError }] = await Promise.all([
    db.from("profiles").select("nombre").eq("id", user.id).maybeSingle(),
    db.from("perfil_ninera").select("foto_url,verification_status,anos_experiencia,disponibilidad,salario_min,salario_max,modalidades_aceptadas,descripcion").eq("profile_id", user.id).maybeSingle(),
    db.from("ninera_zonas").select("zona_id").eq("ninera_id", user.id), db.from("ninera_experiencia_edades").select("rango_edad").eq("ninera_id", user.id), db.from("referencias").select("nombre,relacion,periodo,contacto").eq("ninera_id", user.id), db.from("zonas").select("id, alcaldia_municipio, colonia").order("alcaldia_municipio", { ascending: true }).order("colonia", { ascending: true, nullsFirst: true }),
  ]);
  if (profileError || perfilError || zonasError || edadesError || referenciasError || zonaError || !profile || !perfil) redirect("/ninera");
  const zonaOptions: ZonaOption[] = (zonaRows ?? []).map((row) => ({ id: row.id, alcaldiaMunicipio: row.alcaldia_municipio, colonia: row.colonia }));
  const disponibilidad = ((perfil.disponibilidad ?? []) as { dia: string; hora_inicio: string; hora_fin: string }[]).filter((x) => (diasValues as readonly string[]).includes(x.dia)).map((x) => ({ dia: x.dia as typeof diasValues[number], horaInicio: x.hora_inicio, horaFin: x.hora_fin }));
  return <><NineraNavigation /><div className="lg:pl-[248px]"><PerfilNineraEdit zonas={zonaOptions} initial={{ nombre: profile?.nombre ?? "", fotoUrl: perfil.foto_url ?? "", verificationStatus: perfil.verification_status, zonaIds: (zonas ?? []).map((x) => x.zona_id), anosExperiencia: perfil.anos_experiencia ?? 0, disponibilidad, salarioMin: perfil.salario_min ?? 0, salarioMax: perfil.salario_max ?? 0, modalidadesAceptadas: perfil.modalidades_aceptadas ?? [], experienciaEdades: (edades ?? []).map((x) => x.rango_edad), descripcion: perfil.descripcion ?? "", referencias: referencias ?? [] }} /></div></>;
}
