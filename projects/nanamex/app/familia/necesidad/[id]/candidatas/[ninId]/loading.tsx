import { CandidateDetailActions } from "@/components/familia/candidate-detail-actions";

export default function CandidateProfileLoading() {
  return (
    <main aria-busy="true" aria-label="Cargando perfil de candidata" className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-6 pb-28 text-ink-900 sm:px-6 lg:py-12 lg:pb-12">
      <div className="h-4 w-40 animate-pulse rounded-sm bg-border" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="relative -mx-4 overflow-visible rounded-b-lg bg-border sm:-mx-6 lg:mx-0 lg:rounded-lg">
            <div data-testid="candidate-detail-photo-skeleton" className="aspect-[4/5] animate-pulse rounded-b-lg bg-border lg:rounded-lg lg:aspect-square" />
            <div data-testid="candidate-detail-identity-overlay-skeleton" className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/70 to-transparent p-4 pt-16 lg:hidden">
              <div className="h-8 w-48 animate-pulse rounded-sm bg-bg-raised/70" />
              <div className="mt-2 h-7 w-40 animate-pulse rounded-full bg-bg-raised/70" />
            </div>
          </div>
          <div className="hidden lg:block"><div className="mt-4 h-8 w-48 animate-pulse rounded-sm bg-border" /><div className="mt-2 h-7 w-40 animate-pulse rounded-full bg-border" /></div>
          <CandidateDetailActions />
        </aside>
        <div className="flex flex-col gap-7">
          <section><div className="h-12 w-24 animate-pulse rounded-sm bg-border" /><div className="mt-2 h-4 w-48 animate-pulse rounded-sm bg-border" /><div className="mt-4 flex flex-col gap-2"><div className="h-4 w-56 animate-pulse rounded-sm bg-border" /><div className="h-4 w-64 animate-pulse rounded-sm bg-border" /><div className="h-4 w-48 animate-pulse rounded-sm bg-border" /></div></section>
          {["experience", "availability", "modalities", "salary", "description", "references"].map((section) => <section key={section} data-testid="candidate-detail-section-skeleton" className="border-t border-border pt-6"><div className="h-6 w-44 animate-pulse rounded-sm bg-border" /><div className="mt-3 flex flex-col gap-2"><div className="h-4 w-full animate-pulse rounded-sm bg-border" /><div className="h-4 w-5/6 animate-pulse rounded-sm bg-border" /></div></section>)}
        </div>
      </div>
    </main>
  );
}
