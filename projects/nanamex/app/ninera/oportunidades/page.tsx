import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getNineraOnboardingState } from "@/lib/auth/ninera-onboarding";
import { NineraNavigation } from "@/components/ninera/ninera-navigation";
import { OpportunityFiltersView } from "@/components/ninera/opportunity-filters";
import { scoreNecesidadForNinera, toMatchNinera, type StoredNecesidadForMatching, type OpportunityCardData } from "@/lib/ninera/opportunities";

export const dynamic = "force-dynamic";
type ProfileRow = { disponibilidad: { dia: "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom"; hora_inicio: string; hora_fin: string }[] | null; salario_min: number; salario_max: number; modalidades_aceptadas: ("planta" | "entrada_salida" | "ocasional")[] | null; anos_experiencia: number; ninera_zonas: { zonas: { alcaldia_municipio: string } | null }[] | null; ninera_experiencia_edades: { rango_edad: "0-1" | "1-3" | "3-6" | "6-12" | "12+" }[] | null };

export default async function ExploreOpportunitiesPage() {
  const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/login");
  const onboarding = await getNineraOnboardingState(user.id);
  if (onboarding.readError) throw new Error("No pudimos validar tu cuenta. Intenta de nuevo.");
  if (!onboarding.isNinera) redirect("/login");
  if (!onboarding.isOnboarded) redirect("/ninera/perfil");
  const db = createServiceRoleClient();
  const [profileResult, needsResult] = await Promise.all([
    db.from("perfil_ninera").select("disponibilidad,salario_min,salario_max,modalidades_aceptadas,anos_experiencia,ninera_zonas(zonas(alcaldia_municipio)),ninera_experiencia_edades(rango_edad)").eq("profile_id", user.id).maybeSingle(),
    db.from("necesidades").select("id,estado,updated_at,zona_id,dias_horarios,modalidad,pago_min,pago_max,fecha_inicio,zonas(alcaldia_municipio),necesidad_children(rango_edad)").eq("estado", "activa"),
  ]);
  if (profileResult.error || needsResult.error || !profileResult.data) throw new Error("No pudimos cargar las vacantes. Intenta de nuevo.");
  const profile = profileResult.data as unknown as ProfileRow;
  const ninera = toMatchNinera({ ...profile, zonas: profile.ninera_zonas, edades: profile.ninera_experiencia_edades });
  const opportunities = (Array.isArray(needsResult.data) ? needsResult.data : [])
    .filter((row) => (row as { estado?: string }).estado === "activa")
    .map((row) => scoreNecesidadForNinera(row as unknown as StoredNecesidadForMatching, ninera))
    .filter((item): item is OpportunityCardData => item !== null);
  return (
    <>
      <NineraNavigation />
      <main className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 pb-24 text-ink-900 sm:px-6 lg:ml-[248px] lg:w-[calc(100%-248px)] lg:px-10 lg:py-12">
        <header>
          <h1 className="text-h1">Explorar vacantes</h1>
          <p className="mt-2 text-body text-ink-600">Encuentra oportunidades abiertas que podrían coincidir contigo.</p>
        </header>
        <OpportunityFiltersView opportunities={opportunities} nineraDisponibilidad={ninera.disponibilidad} />
      </main>
    </>
  );
}
