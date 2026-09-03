// Placeholder destination for AUTH-01's footer "Aviso de privacidad" link
// (design/UI-SPEC.md AUTH-01: "footer (legal links)"). No legal-content story exists
// yet anywhere in engineering/implementation-plan.md -- this stub exists only so the
// footer link isn't a dead 404, not as an attempt to author real legal copy. Flagged in
// this story's report for human/legal follow-up before RELEASE_GATE (also relevant to
// the still-open identity-document retention/deletion policy decision, config/
// CONSTRAINTS.md "Legal / Data Constraints").
export default function PrivacidadPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-6 py-16">
      <h1 className="text-h1 font-semibold text-ink-900">Aviso de privacidad</h1>
      <p className="text-body text-ink-600">
        Estamos preparando el contenido legal de Clin. Vuelve pronto.
      </p>
    </main>
  );
}
