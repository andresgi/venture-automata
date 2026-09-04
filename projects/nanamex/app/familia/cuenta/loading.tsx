export default function FamiliaCuentaLoading() {
  return (
    <main aria-busy="true" aria-label="Cargando tu cuenta" className="mx-auto min-h-screen w-full max-w-[720px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
      <div className="flex items-center justify-between gap-4">
        <div className="h-8 w-32 animate-pulse rounded-sm bg-border" />
        <div className="h-11 w-20 animate-pulse rounded-sm bg-border" />
      </div>
      <div className="mt-8 flex flex-col gap-8">
        {["contact", "entitlement", "payments", "security"].map((section) => (
          <section key={section} aria-hidden="true" data-testid="account-skeleton-section" className="rounded-md border border-border bg-bg-raised p-5">
            <div className="h-6 w-48 animate-pulse rounded-sm bg-border" />
            <div className="mt-4 h-16 w-full animate-pulse rounded-sm bg-border" />
          </section>
        ))}
      </div>
    </main>
  );
}
