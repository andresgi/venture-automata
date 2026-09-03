"use client";

import { useActionState } from "react";
import {
  loginAction,
  resendConfirmationEmailAction,
} from "@/actions/auth";

/** AUTH-04's "reenviar correo" action (design/UX-spec.md, added 2026-09-02 alongside the
 * correo hard-gate decision) -- rendered only when a login attempt fails specifically
 * because the account's correo isn't confirmed yet (`state.unconfirmedEmail`). A separate
 * component so its own `useActionState` hook doesn't have to be called conditionally
 * inside `LoginForm`. */
function ResendConfirmationEmail({ correo }: { correo: string }) {
  const [state, formAction, isPending] = useActionState(
    resendConfirmationEmailAction,
    { status: "idle" }
  );

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="correo" value={correo} />
      <button
        type="submit"
        disabled={isPending || state.status === "sent"}
        className="text-left text-sm text-zinc-600 underline underline-offset-2 disabled:no-underline disabled:opacity-60"
      >
        {state.status === "sent"
          ? "Correo reenviado"
          : isPending
            ? "Reenviando…"
            : "Reenviar correo"}
      </button>
      {state.status === "error" ? (
        <span className="text-xs text-red-700">{state.message}</span>
      ) : null}
    </form>
  );
}

/** AUTH-04 login form. Shared by the public `/login` (familia/niñera) and `/admin/login`
 * entry points (information-architecture.md §3) -- the actual destination is decided
 * server-side by the account's own `profiles.role`, not by which page was used to log in. */
export function LoginForm({ next, registerHref }: { next?: string; registerHref?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, { status: "idle" });

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <label className="flex flex-col gap-1 text-sm">
        Correo
        <input
          type="email"
          name="correo"
          required
          autoComplete="email"
          className="h-11 border border-zinc-300 px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Contraseña
        <input
          type="password"
          name="contrasena"
          required
          autoComplete="current-password"
          className="h-11 border border-zinc-300 px-3"
        />
      </label>

      {state.status === "error" ? (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-sm text-red-700">
            {state.message}
          </p>
          {state.unconfirmedEmail ? (
            <ResendConfirmationEmail correo={state.unconfirmedEmail} />
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-11 bg-zinc-900 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Ingresando…" : "Ingresar"}
      </button>

      {registerHref ? (
        <a href={registerHref} className="text-sm text-zinc-600 underline underline-offset-2">
          Crear cuenta
        </a>
      ) : null}
    </form>
  );
}
