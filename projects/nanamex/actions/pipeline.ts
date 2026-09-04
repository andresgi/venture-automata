"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// FAM-11 (design/UX-spec.md): "Avanzar estado" controls apply from Contactada onward only
// -- `nueva -> contactada` remains exclusively E5-04's `confirm_contact` paid flow. This
// schema hard-excludes both `nueva` and `contactada` as a target state at the action layer,
// on top of the `advance_pipeline_state` RPC's own guard, so a manual `nueva -> contactada`
// transition is never even reachable from this action, let alone from the database.
const TARGET_ESTADOS = ["entrevista", "contratada", "descartada"] as const;
export type PipelineTargetEstado = (typeof TARGET_ESTADOS)[number];

const inputSchema = z.object({
  pipelineId: z.uuid(),
  newEstado: z.enum(TARGET_ESTADOS),
});
export type AdvancePipelineStateInput = z.infer<typeof inputSchema>;
export type AdvancePipelineStateResult =
  | { ok: true; estado: PipelineTargetEstado }
  | { ok: false; message: string };

const GENERIC_ERROR_MESSAGE = "No se pudo actualizar el estado. Intenta de nuevo.";

/**
 * FAM-11 "Avanzar estado" / "Descartar" (design/UX-spec.md, engineering/architecture.md
 * §20). Delegates the actual transition rules (allowed forward path, discard-from-any-
 * state) to the `advance_pipeline_state` SECURITY DEFINER RPC (E6-01), which re-checks
 * necesidad ownership -- the same defense-in-depth split the rest of this codebase's
 * pipeline-mutating actions already use (`toggleFavoriteAction`, `confirmContactAction`).
 *
 * Notification handoff: per UX-spec.md every subsequent state change should notify the
 * niñera. Epic 10's Resend/Twilio delivery does not exist yet (same documented scope
 * narrowing as E5-04); this action only performs the durable state transition and its
 * `pipeline_state_advanced` analytics write, not delivery.
 */
export async function advancePipelineStateAction(input: AdvancePipelineStateInput): Promise<AdvancePipelineStateResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Solicitud inválida." };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Tu sesión expiró. Inicia sesión de nuevo." };

  const db = createServiceRoleClient();
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "familia") return { ok: false, message: GENERIC_ERROR_MESSAGE };

  const rpc = await db.rpc("advance_pipeline_state", {
    p_pipeline_id: parsed.data.pipelineId,
    p_familia_id: user.id,
    p_new_estado: parsed.data.newEstado,
  });
  if (rpc.error) {
    console.error("advancePipelineStateAction: advance_pipeline_state failed", { code: rpc.error.code });
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }
  const row = rpc.data as { estado?: PipelineTargetEstado } | null;
  if (!row?.estado) return { ok: false, message: GENERIC_ERROR_MESSAGE };
  return { ok: true, estado: row.estado };
}
