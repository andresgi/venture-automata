"use client";

import { useActionState } from "react";
import { registerAction, initialRegisterActionState } from "@/actions/auth";
import type { SelfRegisterableRole } from "@/lib/auth/roles";

/**
 * AUTH-02 registration form (design/UX-spec.md AUTH-02). `role` is passed in already
 * resolved (pre-filled from AUTH-01's role selection, per information-architecture.md
 * `/registro` "Auth: registro (role param)") -- the full AUTH-01 landing/role-selection
 * screen itself is a separate story (E1-01); this component only needs the role decided
 * before it renders.
 */
export function RegisterForm({ role }: { role: SelfRegisterableRole }) {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialRegisterActionState
  );

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="role" value={role} />

      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          type="text"
          name="nombre"
          required
          autoComplete="name"
          className="h-11 border border-zinc-300 px-3"
        />
        {state.fieldErrors?.nombre ? (
          <span className="text-xs text-red-700">{state.fieldErrors.nombre}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Correo
        <input
          type="email"
          name="correo"
          required
          autoComplete="email"
          className="h-11 border border-zinc-300 px-3"
        />
        {state.fieldErrors?.correo ? (
          <span className="text-xs text-red-700">{state.fieldErrors.correo}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Teléfono
        <input
          type="tel"
          name="telefono"
          required
          autoComplete="tel"
          placeholder="10 dígitos"
          className="h-11 border border-zinc-300 px-3"
        />
        {state.fieldErrors?.telefono ? (
          <span className="text-xs text-red-700">{state.fieldErrors.telefono}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Contraseña
        <input
          type="password"
          name="contrasena"
          required
          autoComplete="new-password"
          className="h-11 border border-zinc-300 px-3"
        />
        {state.fieldErrors?.contrasena ? (
          <span className="text-xs text-red-700">{state.fieldErrors.contrasena}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Confirmar contraseña
        <input
          type="password"
          name="confirmarContrasena"
          required
          autoComplete="new-password"
          className="h-11 border border-zinc-300 px-3"
        />
        {state.fieldErrors?.confirmarContrasena ? (
          <span className="text-xs text-red-700">{state.fieldErrors.confirmarContrasena}</span>
        ) : null}
      </label>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
          {state.duplicate ? (
            <>
              {" "}
              <a href="/login" className="underline underline-offset-2">
                Iniciar sesión
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-11 bg-zinc-900 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
