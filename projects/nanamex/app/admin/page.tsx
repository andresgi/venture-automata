import { Suspense } from "react";
import { UnauthorizedBanner } from "@/components/auth/unauthorized-banner";

// Admin's own "home" for middleware.ts's redirect target (information-architecture.md's
// first real admin route is /admin/verificaciones -- that queue UI is a later BUILD story;
// this placeholder only exists so a role-mismatched redirect has a real destination today).
export default function AdminHomePage() {
  return (
    <main className="flex min-h-screen flex-col gap-4 p-8">
      <Suspense fallback={null}>
        <UnauthorizedBanner />
      </Suspense>
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="max-w-md text-sm text-zinc-500">
        Área admin. Colas de verificación/reportes llegan en una historia de BUILD
        posterior.
      </p>
    </main>
  );
}
