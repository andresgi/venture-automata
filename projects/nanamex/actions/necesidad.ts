"use server";

import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";
import { necesidadCompleteSchema, validateNecesidadDraft } from "@/lib/familia/necesidad-validation";
import { normalizeNecesidadPayload } from "@/lib/familia/necesidad-persistence";
import { computeMatches, type MatchCandidate } from "@/lib/matching/compute-matches";
import type { MatchNecesidad } from "@/lib/matching/match-score";

export type NecesidadActionState = { status: "idle" | "saved" | "published" | "error"; message?: string; draftId?: string; necesidadId?: string };

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

type StoredNecesidad = {
  id: string; familia_id: string; zona_id: string; modalidad: MatchNecesidad["modalidad"];
  pago_min: number; pago_max: number; dias_horarios: { dia: MatchNecesidad["diasHorarios"][number]["dia"]; hora_inicio: string; hora_fin: string }[];
  fecha_inicio: string; responsabilidades: string[]; necesidad_children: { rango_edad: MatchNecesidad["children"][number] }[];
  zonas: { alcaldia_municipio: string } | { alcaldia_municipio: string }[];
};

function toMatchNecesidad(row: StoredNecesidad): MatchNecesidad {
  return {
    zona: Array.isArray(row.zonas) ? row.zonas[0]?.alcaldia_municipio ?? "" : row.zonas.alcaldia_municipio,
    modalidad: row.modalidad,
    pagoMin: row.pago_min,
    pagoMax: row.pago_max,
    children: row.necesidad_children.map((child) => child.rango_edad),
    diasHorarios: row.dias_horarios.map((item) => ({ dia: item.dia, horaInicio: item.hora_inicio, horaFin: item.hora_fin })),
  };
}

/**
 * The schema only stores `perfil_completo` as an all-or-nothing eligibility gate
 * (database.md §3) -- there is no graduated completeness percentage field. E3-02's
 * `MatchCandidate.profileCompleteness` contract expects a 0-100 ranking value (see
 * `lib/matching/compute-matches.ts` and its tests), so the boolean is mapped onto that
 * same 0-100 scale (true -> 100, false -> 0) rather than left unmapped. Every candidate
 * this action considers is already filtered to `perfil_completo = true` for eligibility,
 * so this tie-break is a no-op today given V1's binary completeness signal -- it exists
 * to (a) correctly honor the documented contract instead of silently defaulting to 0,
 * and (b) apply correctly the moment a non-boolean/graduated completeness signal is
 * introduced or this candidate list is reused without the eligibility filter.
 */
function profileCompletenessScore(perfilCompleto: unknown): number {
  return perfilCompleto === true ? 100 : 0;
}

type StoredDisponibilidad = { dia: MatchNecesidad["diasHorarios"][number]["dia"]; hora_inicio: string; hora_fin: string };

function candidateFromRow(row: Record<string, unknown>): MatchCandidate {
  const zones = (row.ninera_zonas as { zonas: { alcaldia_municipio: string } | null }[] | null) ?? [];
  const ages = (row.ninera_experiencia_edades as { rango_edad: MatchNecesidad["children"][number] }[] | null) ?? [];
  const profile = (row.profiles as { created_at?: string } | null) ?? {};
  const disponibilidad = (row.disponibilidad as StoredDisponibilidad[] | null) ?? [];
  return {
    id: String(row.profile_id),
    profileCompleteness: profileCompletenessScore(row.perfil_completo),
    createdAt: String(row.created_at ?? profile.created_at ?? new Date(0).toISOString()),
    ninera: {
      zonasDeTrabajo: zones.flatMap((item) => item.zonas ? [item.zonas.alcaldia_municipio] : []),
      // `perfil_ninera.disponibilidad` is stored snake_case (`hora_inicio`/`hora_fin`, same
      // convention as `necesidad.dias_horarios` -- database.md §3), while `MatchNinera` /
      // `schedulesOverlap` (lib/matching/match-score.ts) expect camelCase `horaInicio`/
      // `horaFin`. This mirrors the translation `toMatchNecesidad` already does for the
      // necesidad side of the same mapping above -- without it, every availability
      // comparison silently reads `undefined` and always scores false (BUG-001).
      disponibilidad: disponibilidad.map((item) => ({ dia: item.dia, horaInicio: item.hora_inicio, horaFin: item.hora_fin })),
      modalidadesAceptadas: (row.modalidades_aceptadas as MatchCandidate["ninera"]["modalidadesAceptadas"]) ?? [],
      salarioMin: Number(row.salario_min), salarioMax: Number(row.salario_max), anosExperiencia: Number(row.anos_experiencia),
      experienciaEdades: ages.map((item) => item.rango_edad),
    },
  };
}

/** Publishes only the authenticated family's complete draft and atomically stores its initial pipeline snapshots. */
export async function publishNecesidadAction(
  _previous: NecesidadActionState,
  formData: FormData,
): Promise<NecesidadActionState> {
  const draftId = z.uuid().safeParse(formData.get("draft_id"));
  if (!draftId.success) return { status: "error", message: "El borrador solicitado no es válido." };
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Tu sesión expiró. Inicia sesión de nuevo." };
  const db = createServiceRoleClient();
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "familia") return { status: "error", message: "No se pudo publicar la necesidad." };
  const { data: necesidad, error: necesidadError } = await db.from("necesidades")
    .select("id, familia_id, zona_id, dias_horarios, modalidad, pago_min, pago_max, fecha_inicio, responsabilidades, necesidad_children(rango_edad), zonas(alcaldia_municipio)")
    .eq("id", draftId.data).eq("familia_id", user.id).eq("estado", "borrador").maybeSingle();
  if (necesidadError) {
    // Logged distinctly server-side so an operational read failure isn't confused with a
    // genuine not-found/authorization case at the point where it happened -- the
    // user-facing copy stays identical for both (no information disclosure about which
    // case occurred), per the reviewer's minor note.
    console.error("publishNecesidadAction: failed to read necesidad", necesidadError);
  }
  if (!necesidad) return { status: "error", message: "No puedes publicar este borrador." };
  const stored = necesidad as unknown as StoredNecesidad;
  const matchNecesidad = toMatchNecesidad(stored);
  const { data: candidates, error: candidateError } = await db.from("perfil_ninera")
    .select("profile_id, disponibilidad, salario_min, salario_max, modalidades_aceptadas, anos_experiencia, perfil_completo, created_at, profiles!inner(account_status), ninera_zonas!inner(zonas(alcaldia_municipio)), ninera_experiencia_edades(rango_edad)")
    .eq("publicado", true).eq("perfil_completo", true).eq("profiles.account_status", "activa");
  if (candidateError) {
    console.error("publishNecesidadAction: failed to read candidate niñeras", candidateError);
    return { status: "error", message: "No se pudieron calcular las candidatas. Intenta de nuevo." };
  }
  const matches = await computeMatches(matchNecesidad, { listPublishedCandidates: () => ((candidates ?? []) as Record<string, unknown>[]).map(candidateFromRow) });
  const rpc = await db.rpc("publish_necesidad_with_matches", {
    p_necesidad_id: stored.id,
    p_familia_id: user.id,
    p_matches: matches.map((match) => ({ ninera_id: match.candidate.id, match_score_snapshot: match.score, match_checklist_snapshot: match.factors })),
  });
  if (rpc.error || !rpc.data) {
    if (rpc.error) console.error("publishNecesidadAction: publish_necesidad_with_matches failed", rpc.error);
    return { status: "error", message: "No se pudo publicar la necesidad. Intenta de nuevo." };
  }
  return { status: "published", necesidadId: stored.id };
}
