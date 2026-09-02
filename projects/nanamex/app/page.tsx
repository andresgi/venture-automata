// Foundations-only placeholder. Real screens land in later BUILD stories per
// engineering/implementation-plan.md (Epic 1+) — this page only exists so E0-01's
// lint/typecheck/test/build scaffold has something real to compile and render.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">Clin</h1>
      <p className="max-w-md text-sm text-zinc-500">
        Foundations scaffold. Screens and features land in later BUILD stories.
      </p>
    </main>
  );
}
