"use server";

import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";
import { necesidadCompleteSchema, validateNecesidadDraft } from "@/lib/familia/necesidad-validation";
import { normalizeNecesidadPayload } from "@/lib/familia/necesidad-persistence";

export type NecesidadActionState = { status: "idle" | "saved" | "error"; message?: string; draftId?: string };

export const initialNecesidadActionState: NecesidadActionState = { status: "idle" };

/** Saves only drafts. Publishing/matching deliberately belongs to E2-02. */
export async function saveNecesidadDraftAction(
  _previous: NecesidadActionState,
  formData: FormData
): Promise<NecesidadActionState> {
  let value: unknown;
  try { value = JSON.parse(String(formData.get("draft"))); } catch { return { status: "error", message: "Los datos de la necesidad no son válidos." }; }
  const stepResult = z.coerce.number().int().min(1).max(7).safeParse(formData.get("step"));
  if (!stepResult.success) return { status: "error", message: "El paso solicitado no es válido." };
  const step = stepResult.data;
  const parsed = validateNecesidadDraft(value);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Completa los datos requeridos." };
  if (!parsed.data.children?.length) return { status: "error", message: "Agrega al menos un rango de edad." };
  if (step === 7) {
    const complete = necesidadCompleteSchema.safeParse(parsed.data);
    if (!complete.success) return { status: "error", message: complete.error.issues[0]?.message ?? "Completa los datos requeridos." };
  }
  const required = [parsed.data.children?.length ? null : "Agrega al menos un rango de edad.", !parsed.data.zonaId ? "Selecciona una zona válida." : null, !parsed.data.diasHorarios?.length ? "Selecciona un día y horario." : null, !parsed.data.modalidad ? "Selecciona una modalidad." : null, parsed.data.pagoMin === undefined || parsed.data.pagoMax === undefined ? "Completa el rango de pago." : null, !parsed.data.fechaInicio ? "Selecciona una fecha de inicio." : null, !parsed.data.responsabilidades?.length ? "Selecciona una responsabilidad." : null];
  const needs = required[step - 1];
  if (needs) return { status: "error", message: needs };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Tu sesión expiró. Inicia sesión de nuevo." };

  const db = createServiceRoleClient();
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "familia") return { status: "error", message: "No se pudo guardar la necesidad." };
  if (parsed.data.zonaId) {
    const { data: zona } = await db.from("zonas").select("id").eq("id", parsed.data.zonaId).maybeSingle();
    if (!zona) return { status: "error", message: "Selecciona una zona válida." };
  }

  const rawDraftId = formData.get("draft_id");
  const draftId = rawDraftId ? z.uuid().safeParse(rawDraftId) : { success: true as const, data: undefined };
  if (!draftId.success) return { status: "error", message: "El borrador solicitado no es válido." };
  if (draftId.data) {
    const { data: existing } = await db.from("necesidades").select("id, familia_id, estado").eq("id", draftId.data).maybeSingle();
    if (!existing || existing.familia_id !== user.id || existing.estado !== "borrador") return { status: "error", message: "No puedes editar este borrador." };
  }
  const rpc = await db.rpc("save_necesidad_draft", {
    p_draft_id: draftId.data ?? null, p_familia_id: user.id, p_payload: normalizeNecesidadPayload(parsed.data),
  });
  if (rpc.error || !rpc.data) return { status: "error", message: "No se pudo guardar el borrador. Intenta de nuevo." };
  return { status: "saved", draftId: rpc.data as string };
}
