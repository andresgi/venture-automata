// FAM-04 loading state (design/UI-SYSTEM.md §5.10): skeleton cards matching the final
// candidate-card geometry (photo circle + 2 text bars + 3 checklist-line placeholders),
// rendered via Next.js's `loading.tsx` route segment convention -- same pattern as
// app/familia/loading.tsx (FAM-02). This narrower, route-specific `loading.tsx` also closes
// the known scope-bleed gap tracked in agent/BACKLOG.md's E2-03 entry: it now takes
// precedence over the parent `/familia/loading.tsx` fallback for this specific route
// segment (`/familia/necesidad/[id]`), instead of transiently showing FAM-02's dashboard
// skeleton shape while this page's data resolves.
export default function MatchesLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando candidatas"
      className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12"
    >
      <div className="h-4 w-40 animate-pulse rounded-sm bg-border" />
      <div className="mt-2 h-7 w-64 animate-pulse rounded-sm bg-border" />
      <div className="mt-6 h-12 animate-pulse rounded-md bg-border" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} data-testid="candidate-skeleton-card" className="min-h-[180px] rounded-md border border-border bg-bg-raised p-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-border lg:h-16 lg:w-16" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-24 animate-pulse rounded-sm bg-border" />
                <div className="h-6 w-28 animate-pulse rounded-full bg-border" />
              </div>
            </div>
            <div className="mt-4 h-8 w-20 animate-pulse rounded-sm bg-border" />
            <div className="mt-3 flex flex-col gap-2">
              <div className="h-3 w-full animate-pulse rounded-sm bg-border" />
              <div className="h-3 w-5/6 animate-pulse rounded-sm bg-border" />
              <div className="h-3 w-2/3 animate-pulse rounded-sm bg-border" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
