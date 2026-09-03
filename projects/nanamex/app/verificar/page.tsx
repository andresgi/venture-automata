// AUTH-03 "Verificación de correo/teléfono" placeholder (design/UX-spec.md AUTH-03).
// registerAction redirects here immediately after account creation. The full two-checklist
// (correo + teléfono OTP) screen depends on E0-05's Twilio Verify integration for the
// teléfono leg -- out of scope for E0-04, which only wires the correo leg
// (app/auth/confirm/route.ts) and registration itself.
export default function VerificarPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Verifica tu cuenta</h1>
      <p className="max-w-md text-sm text-zinc-500">
        Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada y sigue
        el enlace. La verificación de teléfono llega en una historia posterior.
      </p>
    </main>
  );
}
