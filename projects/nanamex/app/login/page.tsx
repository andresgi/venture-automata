import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

// AUTH-04 (design/screen-inventory.md: "simple/self-explanatory... follow standard
// patterns", no dedicated UX-spec.md deep-dive).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
      <Suspense fallback={null}>
        <LoginForm next={next} registerHref="/registro" />
      </Suspense>
    </main>
  );
}
