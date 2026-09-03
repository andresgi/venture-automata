"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { perfilFamiliarSchema } from "@/lib/familia/validation";
import { ROLE_HOME_PATH } from "@/lib/auth/roles";

const GENERIC_ERROR = "No se pudo guardar tu perfil. Intenta de nuevo.";
const INVALID_ZONA_MESSAGE = "Selecciona una zona válida de la lista.";

export interface PerfilFamiliarActionState {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialPerfilFamiliarActionState: PerfilFamiliarActionState = { status: "idle" };

function fieldErrorsFromZod(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * FAM-01 "Onboarding perfil familiar" (design/UI-SPEC.md FAM-01; design/journeys.md
 * J-FAM-1 step 4; design/screen-inventory.md; engineering/database.md §2). Writes to two
 * places:
 *
 * - `perfil_familiar.zona_id` — the only field this screen collects that has no home
 *   anywhere else in the schema; this is `database.md` §2's entire reason for existing.
 * - `profiles.nombre` — re-displays/lets the family confirm or correct the nombre already
 *   collected at AUTH-02 registration (`database.md` §1), rather than inventing a second,
 *   schema-less "nombre" concept. Reasoning (flagged for reviewer attention, since the UX/UI
 *   docs are genuinely ambiguous here): `perfil_familiar` (database.md §2) has only
 *   `profile_id`/`zona_id` — no `nombre` column — yet three independent documents
 *   (`journeys.md` J-FAM-1 step 4, `screen-inventory.md`'s FAM-01 row, and `UI-SPEC.md`
 *   FAM-01's "2 fields (nombre, zona)") each explicitly list "nombre" as a FAM-01 field.
 *   That three-for-three consistency across documents authored in different phases reads as
 *   deliberate intent, not a copy-paste artifact, so this action treats FAM-01 as an
 *   editable confirmation step over the existing `profiles.nombre` value rather than
 *   silently dropping the field to match the schema's literal minimum.
 *
 * Role is re-checked server-side (not just inferred from the `/familia/*` route group) since
 * a Server Action is directly reachable as its own POST endpoint, bypassing the page/
 * middleware route gate that would otherwise keep a niñera off this screen entirely.
 */
export async function upsertPerfilFamiliarAction(
  _prevState: PerfilFamiliarActionState,
  formData: FormData
): Promise<PerfilFamiliarActionState> {
  const parsed = perfilFamiliarSchema.safeParse({
    nombre: formData.get("nombre"),
    zonaId: formData.get("zona_id"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return { status: "error", message: GENERIC_ERROR };
  }

  const db = createServiceRoleClient();

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role, nombre")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "familia") {
    return { status: "error", message: GENERIC_ERROR };
  }

  const { nombre, zonaId } = parsed.data;

  // Defense-in-depth (architecture.md §3: "never trust client input"): zona must be a real
  // row from the seeded `zonas` table, never free text — this is the server-layer
  // enforcement of this story's "autocomplete against zonas" acceptance criterion, not just
  // the client-side combobox's own filtering.
  const { data: zona, error: zonaError } = await db
    .from("zonas")
    .select("id")
    .eq("id", zonaId)
    .maybeSingle();

  if (zonaError || !zona) {
    return { status: "error", fieldErrors: { zonaId: INVALID_ZONA_MESSAGE } };
  }

  if (nombre !== profile.nombre) {
    const { error: nombreUpdateError } = await db
      .from("profiles")
      .update({ nombre })
      .eq("id", user.id);

    if (nombreUpdateError) {
      return { status: "error", message: GENERIC_ERROR };
    }
  }

  const { error: upsertError } = await db
    .from("perfil_familiar")
    .upsert({ profile_id: user.id, zona_id: zonaId }, { onConflict: "profile_id" });

  if (upsertError) {
    return { status: "error", message: GENERIC_ERROR };
  }

  // FAM-01's spec redirect target is FAM-03 (Crear necesidad wizard) — Epic 2, not built yet
  // in this codebase. Redirects to the `/familia` dashboard placeholder instead (E0-04/
  // E1-02's existing target) until Epic 2 builds FAM-03 — update this redirect then.
  redirect(ROLE_HOME_PATH.familia);
}
