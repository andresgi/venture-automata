import { Suspense } from "react";
import { UnauthorizedBanner } from "@/components/auth/unauthorized-banner";

// FAM-02 "Mis necesidades" (dashboard) placeholder. E0-04 only needs a real destination for
// a familia-role session to land on (registration success, login, and the middleware's own
// redirect target) -- the full screen is a later BUILD story (Epic 1+) per
// engineering/implementation-plan.md.
export default function FamiliaHomePage() {
  return (
    <main className="flex min-h-screen flex-col gap-4 p-8">
      <Suspense fallback={null}>
        <UnauthorizedBanner />
      </Suspense>
      <h1 className="text-2xl font-semibold">Mis necesidades</h1>
      <p className="max-w-md text-sm text-zinc-500">
        Área familia. Contenido completo llega en una historia de BUILD posterior.
      </p>
    </main>
  );
}
