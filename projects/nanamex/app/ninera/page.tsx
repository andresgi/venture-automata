import { Suspense } from "react";
import { UnauthorizedBanner } from "@/components/auth/unauthorized-banner";

// NIN-03 "Inicio" (dashboard) placeholder -- see app/familia/page.tsx for why this exists
// as a minimal stand-in rather than the full screen (a later BUILD story).
export default function NineraHomePage() {
  return (
    <main className="flex min-h-screen flex-col gap-4 p-8">
      <Suspense fallback={null}>
        <UnauthorizedBanner />
      </Suspense>
      <h1 className="text-2xl font-semibold">Inicio</h1>
      <p className="max-w-md text-sm text-zinc-500">
        Área niñera. Contenido completo llega en una historia de BUILD posterior.
      </p>
    </main>
  );
}
