import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

// ADM-01 admin login (information-architecture.md §3: "/admin/login" -- admin-only,
// no self-registration entry point per security.md §1). Reuses the shared login form/action
// -- the actual post-login destination is always decided by the account's real
// `profiles.role`, so a non-admin account submitting this form is simply sent to its own
// home, never given a misleading "access granted" state for `/admin`.
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Admin — Iniciar sesión</h1>
      <Suspense fallback={null}>
        <LoginForm next={next} />
      </Suspense>
    </main>
  );
}
