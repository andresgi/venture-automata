import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import { ContactRequestForm } from "@/components/familia/contact-request-form";
import { CheckoutReturnBanner } from "@/components/familia/checkout-return-banner";
import { getCheckoutReturnStateAction } from "@/actions/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getFamiliaOnboardingState } from "@/lib/auth/familia-onboarding";

export const dynamic = "force-dynamic";
type Params = { id: string; ninId: string };
type ContactRelation = { pipeline_id?: string };

function isContactRow(value: ContactRelation | null | undefined): value is { pipeline_id: string } {
  return Boolean(value?.pipeline_id);
}

export default async function ContactPage({ params, searchParams }: { params: Promise<Params>; searchParams?: Promise<{ checkout?: string }> }) {
  const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/login");
  const onboarding = await getFamiliaOnboardingState(user.id);
  if (!onboarding.isFamilia) redirect("/familia");
  if (!onboarding.isOnboarded) redirect("/familia/perfil");
  if (!onboarding.profile?.email_verified || !onboarding.profile.phone_verified) redirect("/verificar");
  const { id, ninId } = await params;
  const checkoutSuccess = (await searchParams)?.checkout === "success";
  const db = createServiceRoleClient();
  const { data: need } = await db.from("necesidades").select("id").eq("id", id).eq("familia_id", user.id).eq("estado", "activa").maybeSingle();
  if (!need) redirect(`/familia/necesidad/${id}`);
  // Find the owned pipeline and its durable contacto before checking whether the
  // candidate is still discoverable. Existing contact access survives expiration,
  // later pipeline states, and candidate depublication/deactivation.
  const { data: pipeline } = await db.from("pipeline").select("estado, contacto(pipeline_id)").eq("necesidad_id", id).eq("ninera_id", ninId).maybeSingle();
  const relation = pipeline?.contacto as ContactRelation | ContactRelation[] | null | undefined;
  const contactRow = Array.isArray(relation) ? relation.find(isContactRow) : isContactRow(relation) ? relation : null;
  let candidate: { nombre: string | null } | null = null;
  if (contactRow) {
    const { data } = await db.from("profiles").select("nombre").eq("id", ninId).maybeSingle();
    candidate = data as { nombre: string | null } | null;
  } else {
    // These discovery checks apply only to a new contact. The RPC repeats them at
    // the write trust boundary; this read prevents rendering a stale new-contact
    // surface for an unavailable candidate.
    const { data } = await db.from("profiles")
      .select("nombre, perfil_ninera!inner(profile_id)")
      .eq("id", ninId).eq("role", "ninera").eq("account_status", "activa")
      .eq("perfil_ninera.publicado", true).eq("perfil_ninera.perfil_completo", true)
      .maybeSingle();
    candidate = data as { nombre: string | null } | null;
    if (!candidate) redirect(`/familia/necesidad/${id}`);
  }
  if (!candidate) redirect(`/familia/necesidad/${id}`);
  // Entitlement expiry blocks only a new confirmation. An established contacto (and
  // its phone) remains viewable permanently per architecture §16.2.
  if (!contactRow) {
    const { data: entitlement, error: entitlementError } = await db.from("entitlements")
      .select("id").eq("familia_id", user.id).eq("tier", "contacto_30d")
      .gt("expires_at", new Date().toISOString()).order("expires_at", { ascending: false }).limit(1).maybeSingle();
    if (entitlementError) redirect(`/familia/necesidad/${id}`);
    // Direct FAM-10 access without an active entitlement must use the same FAM-08 flow
    // as the profile's Contactar button. The detail page opens that flow from this marker.
    if (!entitlement) {
      // A Stripe success return can arrive before the webhook commits. Keep the
      // user in a server-backed pending state; never send them back through FAM-08
      // and never expose contact data based on the query parameter.
      if (checkoutSuccess) {
        const paymentState = await getCheckoutReturnStateAction();
        if (paymentState.status === "stale") {
          redirect(`/familia/necesidad/${id}/candidatas/${ninId}?contactar=1`);
        }
        if (paymentState.status !== "ready") {
          return <PendingPaymentPage necesidadId={id} nineraId={ninId} />;
        }
      } else {
        redirect(`/familia/necesidad/${id}/candidatas/${ninId}?contactar=1`);
      }
    }
  }
  let initialPhone: string | null = null;
  if (contactRow) {
    const { data: phoneRow } = await db.from("profiles").select("phone").eq("id", ninId).maybeSingle();
     initialPhone = (phoneRow?.phone as string | null | undefined) ?? null;
  }
  const row = candidate;
  return <main className="mx-auto min-h-screen w-full max-w-[640px] bg-bg px-4 py-6 text-ink-900 sm:px-6 lg:py-12">
    <Link href={`/familia/necesidad/${id}/candidatas/${ninId}`} className="inline-flex min-h-11 items-center gap-2 text-button text-primary-600"><ArrowLeft size={18} />Volver al perfil</Link>
     <div className="mt-8"><CheckoutReturnBanner /></div>
     <p className="mt-8 text-body-sm text-trust-verified-600">Contacto desbloqueado</p>
    <h1 className="mt-2 text-h1">Solicitar entrevista con {row.nombre ?? "la candidata"}</h1>
    <p className="mt-3 text-body text-ink-600">Envía una solicitud breve para iniciar el contacto.</p>
     <ContactRequestForm necesidadId={id} nineraId={ninId} initialPhone={initialPhone} initialContactEstablished={Boolean(contactRow)} cancelHref={`/familia/necesidad/${id}/candidatas/${ninId}`} />
  </main>;
}

function PendingPaymentPage({ necesidadId, nineraId }: { necesidadId: string; nineraId: string }) {
  return <main className="mx-auto min-h-screen w-full max-w-[640px] bg-bg px-4 py-6 text-ink-900 sm:px-6 lg:py-12">
    <Link href={`/familia/necesidad/${necesidadId}/candidatas/${nineraId}`} className="inline-flex min-h-11 items-center gap-2 text-button text-primary-600"><ArrowLeft size={18} />Volver al perfil</Link>
      <div className="mt-8"><CheckoutReturnBanner necesidadId={necesidadId} nineraId={nineraId} autoNavigateTo={`/familia/necesidad/${necesidadId}/candidatas/${nineraId}/contactar`} /></div>
    <h1 className="mt-2 text-h1">Estamos confirmando tu pago</h1>
    <p className="mt-3 text-body text-ink-600">La confirmación puede tardar unos segundos. No cierres esta página; actualiza cuando quieras para continuar con la solicitud.</p>
  </main>;
}
