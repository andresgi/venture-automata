"use client";

import { useActionState } from "react";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react/ssr";
import {
  upsertPerfilFamiliarAction,
} from "@/actions/perfil-familiar";
import { ZonaAutocomplete } from "@/components/familia/zona-autocomplete";
import type { ZonaOption } from "@/lib/zonas/queries";

/**
 * FAM-01 "Onboarding perfil familiar" form (design/UI-SPEC.md FAM-01: "Standard short form
 * pattern (same as AUTH-02)"). Mirrors `components/auth/register-form.tsx`'s structure/
 * styling follows the approved UI-SYSTEM short-form pattern.
 */
export function PerfilFamiliarForm({
  zonas,
  defaultNombre,
  defaultZonaId,
}: {
  zonas: ZonaOption[];
  defaultNombre: string;
  defaultZonaId: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    upsertPerfilFamiliarAction,
    { status: "idle" }
  );

  return (
    <form action={formAction} className="flex w-full max-w-[420px] flex-col gap-6">
      <label className="flex flex-col gap-2 text-body-sm text-ink-900">
        Nombre
        <input
          type="text"
          name="nombre"
          required
          autoComplete="name"
          defaultValue={defaultNombre}
          aria-invalid={state.fieldErrors?.nombre ? true : undefined}
          aria-describedby={state.fieldErrors?.nombre ? "nombre-error" : undefined}
          className={`h-11 rounded-sm border bg-bg-raised px-3 text-body outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-600/25 ${state.fieldErrors?.nombre ? "border-danger-600" : "border-border-strong"}`}
        />
        {state.fieldErrors?.nombre ? (
          <span id="nombre-error" className="flex items-center gap-1 text-body-sm text-danger-600">
            <WarningCircle size={16} weight="fill" aria-hidden />
            {state.fieldErrors.nombre}
          </span>
        ) : null}
      </label>

      <ZonaAutocomplete
        zonas={zonas}
        name="zona_id"
        defaultZonaId={defaultZonaId}
        error={state.fieldErrors?.zonaId}
      />

      {state.status === "error" && state.message ? (
        <p role="alert" className="flex items-center gap-1 text-body-sm text-danger-600">
          <WarningCircle size={16} weight="fill" aria-hidden />
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 items-center justify-center gap-2 rounded-sm bg-primary-600 px-4 text-button text-white transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600/40 disabled:pointer-events-none disabled:opacity-40"
      >
        {isPending ? <SpinnerGap size={16} className="animate-spin" aria-label="Guardando" /> : "Continuar"}
      </button>
    </form>
  );
}
