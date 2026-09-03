// FAM-02 loading state (design/UI-SYSTEM.md §5.10: "skeleton blocks matching final layout
// geometry ... for list/detail screens"). Uses Next.js App Router's `loading.tsx` route
// segment convention -- this is the first page in the app whose data fetch (the
// necesidades + embedded zonas/pipeline query) is slow/real enough to warrant a genuine
// loading state, so there was no prior in-app precedent to follow; `loading.tsx` was chosen
// over a hand-rolled inline `<Suspense>` boundary because it requires no restructuring of
// app/familia/page.tsx's existing single-async-component gate+fetch flow (Next.js
// automatically wraps the whole page in a Suspense boundary backed by this fallback while
// the page's data resolves).
export default function FamiliaHomeLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando tus necesidades"
      className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-7 w-48 animate-pulse rounded-sm bg-border" />
        <div className="h-11 w-40 animate-pulse rounded-sm bg-border" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} data-testid="necesidad-skeleton-card" className="rounded-md border border-border bg-bg-raised p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="h-4 w-32 animate-pulse rounded-sm bg-border" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-border" />
            </div>
            <div className="mt-2 h-3 w-24 animate-pulse rounded-sm bg-border" />
            <div className="mt-3 h-3 w-40 animate-pulse rounded-sm bg-border" />
            <div className="mt-4 h-4 w-28 animate-pulse rounded-sm bg-border" />
          </div>
        ))}
      </div>
    </main>
  );
}
