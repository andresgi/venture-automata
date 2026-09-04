import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle, Circle, LockKey } from "@phosphor-icons/react/ssr";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getFamiliaOnboardingState } from "@/lib/auth/familia-onboarding";
import { RetryBanner } from "@/components/familia/retry-banner";

export const dynamic = "force-dynamic";

type PaymentStatus = "pendiente" | "exitoso" | "fallido";
type Payment = { id: string; amount: number; status: PaymentStatus; created_at: string };
type Entitlement = { activated_at: string; expires_at: string };

const paymentStatusLabels: Record<PaymentStatus, string> = {
  pendiente: "Pendiente",
  exitoso: "Exitoso",
  fallido: "Fallido",
};

function money(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount / 100);
}

const PRODUCT_TIME_ZONE = "America/Monterrey";

export function formatAccountDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: PRODUCT_TIME_ZONE }).format(new Date(value));
}

export function daysRemaining(expiresAt: string, now = Date.now()) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 86_400_000));
}

function ContactStatus({ label, verified }: { label: string; verified: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <span className="flex items-center gap-3 text-body">
        {verified ? <CheckCircle size={22} weight="fill" aria-hidden="true" /> : <Circle size={22} aria-hidden="true" />}
        {label}
      </span>
      <span className="text-body-sm text-ink-600">{verified ? "Verificado" : "Pendiente"}</span>
    </li>
  );
}

export default async function FamiliaCuentaPage() {
  const auth = await createServerSupabaseClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const onboarding = await getFamiliaOnboardingState(user.id);
  if (!onboarding.isFamilia) redirect("/familia");
  if (!onboarding.isOnboarded) redirect("/familia/perfil");

  const db = createServiceRoleClient();

  const [entitlementResult, paymentsResult] = await Promise.all([
    db.from("entitlements").select("activated_at, expires_at").eq("familia_id", user.id).order("expires_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("payments").select("id, amount, status, created_at").eq("familia_id", user.id).order("created_at", { ascending: false }),
  ]);

  if (entitlementResult.error || paymentsResult.error) {
    console.error("FamiliaCuentaPage: failed to load account data", {
      entitlement: entitlementResult.error?.code,
      payments: paymentsResult.error?.code,
    });
    return (
      <main className="mx-auto min-h-screen w-full max-w-[720px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
        <h1 className="text-h1">Cuenta</h1>
        <RetryBanner message="No se pudo cargar tu cuenta. Intenta de nuevo." />
      </main>
    );
  }

  const entitlement = entitlementResult.data as Entitlement | null;
  // This is a request-time calculation in a Server Component, not client render state.
  // eslint-disable-next-line react-hooks/purity
  const active = entitlement ? new Date(entitlement.expires_at).getTime() > Date.now() : false;
  const payments = (paymentsResult.data ?? []) as Payment[];

  return (
    <main className="mx-auto min-h-screen w-full max-w-[720px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h1">Cuenta</h1>
        <Link href="/familia" className="min-h-11 inline-flex items-center text-button text-primary-600">Volver</Link>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        <section aria-labelledby="contact-verification">
          <h2 id="contact-verification" className="text-h2">Verificación de contacto</h2>
          <ul className="mt-3 rounded-md border border-border bg-bg-raised px-4">
             <ContactStatus label="Correo" verified={Boolean(onboarding.profile?.email_verified)} />
             <ContactStatus label="Teléfono" verified={Boolean(onboarding.profile?.phone_verified)} />
          </ul>
        </section>

        <section aria-labelledby="entitlement-status">
          <h2 id="entitlement-status" className="text-h2">Desbloqueo de contacto</h2>
          <div className="mt-3 rounded-md border border-border bg-bg-raised p-5">
            <p className="text-body font-medium">{active ? "Activo" : entitlement ? "Expirado" : "Sin desbloqueo activo"}</p>
            <p className="mt-1 text-body-sm text-ink-600">
              {active && entitlement
                ? `${daysRemaining(entitlement.expires_at)} días restantes · vence el ${formatAccountDate(entitlement.expires_at)}`
                : entitlement
                  ? `0 días restantes · venció el ${formatAccountDate(entitlement.expires_at)}`
                  : "Puedes desbloquear el contacto de candidatas por 30 días al solicitar una entrevista."}
            </p>
          </div>
        </section>

        <section aria-labelledby="payment-history">
          <h2 id="payment-history" className="text-h2">Historial de pagos</h2>
          {payments.length === 0 ? (
            <p className="mt-3 rounded-md border border-border bg-bg-raised p-5 text-body-sm text-ink-600">Aún no tienes pagos.</p>
          ) : (
             <div className="mt-3 rounded-md border border-border bg-bg-raised sm:overflow-x-auto">
               <div data-testid="payment-history-mobile" className="divide-y divide-border sm:hidden">
                 {payments.map((payment) => (
                   <dl key={payment.id} className="grid grid-cols-2 gap-x-4 gap-y-2 p-4 text-body-sm">
                     <dt className="text-ink-600">Fecha</dt><dd className="text-right">{formatAccountDate(payment.created_at)}</dd>
                     <dt className="text-ink-600">Concepto</dt><dd className="text-right">Contacto · 30 días</dd>
                     <dt className="text-ink-600">Importe</dt><dd className="text-right">{money(payment.amount)}</dd>
                     <dt className="text-ink-600">Estado</dt><dd className="text-right">{paymentStatusLabels[payment.status] ?? "No disponible"}</dd>
                   </dl>
                 ))}
               </div>
               <table data-testid="payment-history-table" className="hidden w-full min-w-[420px] text-left text-body-sm sm:table">
                <caption className="sr-only">Historial de pagos</caption>
                <thead className="border-b border-border text-caption text-ink-600">
                  <tr><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 font-medium">Concepto</th><th className="px-4 py-3 text-right font-medium">Importe</th><th className="px-4 py-3 font-medium">Estado</th></tr>
                </thead>
                <tbody>
                   {payments.map((payment) => <tr key={payment.id} className="border-b border-border last:border-b-0"><td className="whitespace-nowrap px-4 py-3">{formatAccountDate(payment.created_at)}</td><td className="px-4 py-3">Contacto · 30 días</td><td className="whitespace-nowrap px-4 py-3">{money(payment.amount)}</td><td className="px-4 py-3">{paymentStatusLabels[payment.status] ?? "No disponible"}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="security">
          <h2 id="security" className="text-h2">Seguridad</h2>
          <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-bg-raised p-5 text-body-sm text-ink-600">
            <LockKey size={22} aria-hidden="true" />
            <span>Cambiar contraseña estará disponible próximamente.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
