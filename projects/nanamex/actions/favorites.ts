"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// UX-spec.md Decision 4: favoriting is always free/unlimited, never paywall-gated -- this
// action performs no entitlement check, mirroring `record_candidate_profile_view` (E4-03).
const inputSchema = z.object({
  necesidadId: z.uuid(),
  nineraId: z.uuid(),
  favorite: z.boolean(),
  matchScore: z.number().int().min(0).max(100),
  matchChecklist: z.record(z.string(), z.boolean()),
});

export type FavoriteActionInput = z.infer<typeof inputSchema>;
export type FavoriteActionResult = { ok: boolean; isFavorite: boolean; message?: string };

/**
 * Toggles `pipeline.es_favorita` via `set_candidate_favorite` (architecture.md §20's
 * `candidatas: favorite/unfavorite`). Server-side re-validates the caller's role and lets
 * the SECURITY DEFINER RPC re-check necesidad ownership + candidate eligibility -- the same
 * defense-in-depth split `record_candidate_profile_view` (E4-03) already established.
 * `isFavorite` in the returned result always reflects the true post-call state, so a
 * failure lets the optimistic client UI revert correctly.
 */
export async function toggleFavoriteAction(input: FavoriteActionInput): Promise<FavoriteActionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, isFavorite: !input?.favorite, message: "Solicitud inválida." };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, isFavorite: !parsed.data.favorite, message: "Tu sesión expiró. Inicia sesión de nuevo." };

  const db = createServiceRoleClient();
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "familia") {
    return { ok: false, isFavorite: !parsed.data.favorite, message: "No se pudo actualizar la favorita." };
  }

  const rpc = await db.rpc("set_candidate_favorite", {
    p_necesidad_id: parsed.data.necesidadId,
    p_familia_id: user.id,
    p_ninera_id: parsed.data.nineraId,
    p_favorite: parsed.data.favorite,
    p_match_score: parsed.data.matchScore,
    p_match_checklist: parsed.data.matchChecklist,
  });
  if (rpc.error) {
    console.error("toggleFavoriteAction: set_candidate_favorite failed", rpc.error);
    return { ok: false, isFavorite: !parsed.data.favorite, message: "No se pudo actualizar la favorita. Intenta de nuevo." };
  }
  return { ok: true, isFavorite: parsed.data.favorite };
}
