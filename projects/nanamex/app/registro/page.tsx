import { RegisterForm } from "@/components/auth/register-form";
import { isSelfRegisterableRole } from "@/lib/auth/roles";

// AUTH-02 (design/UX-spec.md AUTH-02). Role arrives pre-filled via the `role` query param
// from AUTH-01's role selection (information-architecture.md §3: "/registro Auth: registro
// (role param)") -- AUTH-01's own landing/marketing page is a separate story (E1-01), so
// this falls back to two plain role-selection links when no valid role is present, purely
// so this screen is independently reachable/testable before E1-01 exists.
export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const roleParam = typeof params.role === "string" ? params.role : undefined;

  if (!isSelfRegisterableRole(roleParam)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>
        <p className="text-sm text-zinc-500">¿Eres familia o niñera?</p>
        <div className="flex gap-4">
          <a href="/registro?role=familia" className="underline underline-offset-2">
            Soy familia
          </a>
          <a href="/registro?role=ninera" className="underline underline-offset-2">
            Soy niñera
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">
        Crear cuenta — {roleParam === "familia" ? "Familia" : "Niñera"}
      </h1>
      <RegisterForm role={roleParam} />
      <a
        href={`/registro?role=${roleParam === "familia" ? "ninera" : "familia"}`}
        className="text-sm text-zinc-600 underline underline-offset-2"
      >
        {roleParam === "familia" ? "¿Eres niñera?" : "¿Eres familia?"}
      </a>
      <a href="/login" className="text-sm text-zinc-600 underline underline-offset-2">
        Ya tengo cuenta
      </a>
    </main>
  );
}
