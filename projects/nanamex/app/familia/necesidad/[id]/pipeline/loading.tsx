// FAM-11 loading state (design/UI-SYSTEM.md §5.10): skeleton kanban columns matching the
// final board's geometry, rendered via Next.js's `loading.tsx` route segment convention --
// same pattern as the sibling `/familia/necesidad/[id]/loading.tsx` (FAM-04).
export default function PipelineLoading() {
  return (
    <main aria-busy="true" aria-label="Cargando pipeline" className="mx-auto min-h-screen w-full max-w-[1120px] bg-bg px-4 py-8 text-ink-900 sm:px-6 lg:py-12">
      <div className="h-4 w-40 animate-pulse rounded-sm bg-border" />
      <div className="mt-2 h-7 w-64 animate-pulse rounded-sm bg-border" />
      <div className="mt-6 hidden gap-4 lg:flex">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} data-testid="pipeline-column-skeleton" className="w-[220px] shrink-0 rounded-md border border-border bg-bg-raised p-3">
            <div className="h-5 w-24 animate-pulse rounded-sm bg-border" />
            <div className="mt-3 flex flex-col gap-3">
              <div className="h-16 animate-pulse rounded-sm bg-border" />
              <div className="h-16 animate-pulse rounded-sm bg-border" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3 lg:hidden">
        <div className="h-10 w-full animate-pulse rounded-full bg-border" />
        <div className="h-16 animate-pulse rounded-sm bg-border" />
        <div className="h-16 animate-pulse rounded-sm bg-border" />
      </div>
    </main>
  );
}
