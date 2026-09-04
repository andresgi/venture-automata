"use server";

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  createStripeCheckoutSession,
  expireStripeCheckoutSession,
  getStripeCheckoutSession,
  CONTACTO_30D_PRICE_MXN_CENTS,
} from "@/lib/stripe/client";
import { scoreMatch, type MatchModalidad } from "@/lib/matching/match-score";

const inputSchema = z.object({ necesidadId: z.uuid(), nineraId: z.uuid() });
export type CreateCheckoutSessionInput = z.infer<typeof inputSchema>;
export type CreateCheckoutSessionResult =
  | { status: "blocked_unverified"; message: string }
  | { status: "already_entitled"; message: string; expiresAt: string }
  | { status: "checkout_created"; checkoutUrl: string }
  | { status: "error"; message: string };

const GENERIC_ERROR_MESSAGE = "No se pudo iniciar el pago. Intenta de nuevo.";
const UNVERIFIED_MESSAGE = "Confirma tu correo y tu teléfono para poder contactar candidatas.";
const PENDING_MESSAGE = "Ya hay un pago en proceso. Intenta de nuevo en unos segundos.";

type EntitlementResult =
  | { kind: "active"; expiresAt: string }
  | { kind: "none" }
  | { kind: "error" };

type MatchingRow = {
  dia: MatchDayValue;
  hora_inicio: string;
  hora_fin: string;
};
type MatchDayValue = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";
type AgeRow = { rango_edad: "0-1" | "1-3" | "3-6" | "6-12" | "12+" };
type NeedMatchingRow = { zonas: { alcaldia_municipio: string }; dias_horarios: MatchingRow[]; necesidad_children: AgeRow[]; pago_min: number; pago_max: number; modalidad: MatchModalidad };
type CandidateMatchingRow = { ninera_zonas: { zonas: { alcaldia_municipio: string } }[]; disponibilidad: MatchingRow[]; ninera_experiencia_edades: AgeRow[]; modalidades_aceptadas: MatchModalidad[]; salario_min: number; salario_max: number; anos_experiencia: number };

async function getSessionUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function applicationOrigin(): string {
  const configured = process.env.APP_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production") throw new Error("Missing APP_URL");
  const value = configured || "http://localhost:3000";
  try {
    const url = new URL(value);
    const localhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if ((url.protocol !== "https:" && !localhost) || url.username || url.password || url.search || url.hash) {
      throw new Error("invalid APP_URL");
    }
    return url.origin;
  } catch {
    throw new Error("Invalid APP_URL");
  }
}

async function getEntitlement(db: ReturnType<typeof createServiceRoleClient>, familiaId: string): Promise<EntitlementResult> {
  const { data, error } = await db.from("entitlements")
    .select("expires_at").eq("familia_id", familiaId)
    .gt("expires_at", new Date().toISOString()).order("expires_at", { ascending: false })
    .limit(1).maybeSingle();
  if (error) {
    console.error("entitlement query failed", { code: error.code });
    return { kind: "error" };
  }
  return data ? { kind: "active", expiresAt: data.expires_at as string } : { kind: "none" };
}

/** Internal/session-derived only. Deliberately not exported: no arbitrary-family oracle. */
async function authorizePair(db: ReturnType<typeof createServiceRoleClient>, familiaId: string, necesidadId: string, nineraId: string): Promise<boolean> {
  const necesidad = await db.from("necesidades")
    .select("id, familia_id, estado, zona_id, modalidad, pago_min, pago_max, dias_horarios, necesidad_children(rango_edad), zonas!inner(alcaldia_municipio)")
    .eq("id", necesidadId).eq("familia_id", familiaId).eq("estado", "activa").maybeSingle();
  if (necesidad.error || !necesidad.data) return false;
  const candidate = await db.from("perfil_ninera")
    .select("profile_id, publicado, perfil_completo, disponibilidad, salario_min, salario_max, modalidades_aceptadas, anos_experiencia, profiles!inner(role, account_status), ninera_zonas!inner(zona_id, zonas!inner(alcaldia_municipio)), ninera_experiencia_edades(rango_edad)")
    .eq("profile_id", nineraId).eq("publicado", true).eq("perfil_completo", true)
    .eq("ninera_zonas.zona_id", necesidad.data.zona_id)
    .eq("profiles.account_status", "activa")
    .contains("modalidades_aceptadas", [necesidad.data.modalidad]).maybeSingle();
  if (candidate.error || !candidate.data) return false;
  const candidateProfile = Array.isArray(candidate.data.profiles) ? candidate.data.profiles[0] : candidate.data.profiles;
  if (candidateProfile?.role !== "ninera") return false;
  const n = necesidad.data as unknown as NeedMatchingRow;
  const c = candidate.data as unknown as CandidateMatchingRow;
  const result = scoreMatch(
    { zona: n.zonas.alcaldia_municipio, diasHorarios: (n.dias_horarios ?? []).map((x) => ({ dia: x.dia, horaInicio: x.hora_inicio, horaFin: x.hora_fin })), modalidad: n.modalidad as MatchModalidad, pagoMin: n.pago_min, pagoMax: n.pago_max, children: (n.necesidad_children ?? []).map((x) => x.rango_edad) },
    { zonasDeTrabajo: (c.ninera_zonas ?? []).map((x) => x.zonas.alcaldia_municipio), disponibilidad: (c.disponibilidad ?? []).map((x) => ({ dia: x.dia, horaInicio: x.hora_inicio, horaFin: x.hora_fin })), modalidadesAceptadas: c.modalidades_aceptadas, salarioMin: c.salario_min, salarioMax: c.salario_max, experienciaEdades: (c.ninera_experiencia_edades ?? []).map((x) => x.rango_edad), anosExperiencia: c.anos_experiencia },
  );
  return result !== null && Object.values(result.factors).every(Boolean);
}

export async function createCheckoutSessionAction(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: GENERIC_ERROR_MESSAGE };
  const userId = await getSessionUserId();
  if (!userId) return { status: "error", message: "Tu sesión expiró. Inicia sesión de nuevo." };

  const db = createServiceRoleClient();
  const { data: profile, error: profileError } = await db.from("profiles")
    .select("role, account_status, email_verified, phone_verified").eq("id", userId).maybeSingle();
  if (profileError || !profile || profile.role !== "familia" || profile.account_status !== "activa") return { status: "error", message: GENERIC_ERROR_MESSAGE };
  if (!profile.email_verified || !profile.phone_verified) return { status: "blocked_unverified", message: UNVERIFIED_MESSAGE };

  // Resource authorization precedes any payment persistence or provider call.
  if (!(await authorizePair(db, userId, parsed.data.necesidadId, parsed.data.nineraId))) {
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }
  const entitlement = await getEntitlement(db, userId);
  if (entitlement.kind === "error") return { status: "error", message: GENERIC_ERROR_MESSAGE };
  if (entitlement.kind === "active") return { status: "already_entitled", message: "Ya tienes acceso para contactar candidatas.", expiresAt: entitlement.expiresAt };

  // Validate the redirect boundary before reading or mutating payment state. A bad
  // deployment configuration must not leave a pending row behind.
  let origin: string;
  try {
    origin = applicationOrigin();
  } catch (error) {
    console.error("Invalid checkout application origin", { name: error instanceof Error ? error.name : "unknown" });
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }

  // The row is the durable boundary. A partial unique index permits only one pending
  // purchase per family; retries reuse its idempotency key instead of creating another charge.
  let boundary: { id: string; idempotency_key: string; checkout_url?: string | null; provider_payment_id?: string | null; provider_session_status?: string; provider_session_expires_at?: string | null } | null = null;
  let existingBoundary = false;
  const existing = await db.from("payments").select("id, idempotency_key, checkout_url, provider_payment_id, provider_session_status, provider_session_expires_at")
    .eq("familia_id", userId).eq("status", "pendiente").maybeSingle();
  if (existing.error) return { status: "error", message: GENERIC_ERROR_MESSAGE };
  boundary = existing.data;
  existingBoundary = Boolean(boundary);
  if (!boundary) {
    const inserted = await db.from("payments").insert({
      familia_id: userId, provider: "stripe", amount: CONTACTO_30D_PRICE_MXN_CENTS, status: "pendiente",
    }).select("id, idempotency_key, checkout_url, provider_payment_id, provider_session_status, provider_session_expires_at").single();
    if (inserted.error) {
      // Another request may have won the unique pending-family race. Re-read and reuse it.
      const raced = await db.from("payments").select("id, idempotency_key, checkout_url, provider_payment_id, provider_session_status, provider_session_expires_at")
        .eq("familia_id", userId).eq("status", "pendiente").maybeSingle();
      if (raced.error || !raced.data) return { status: "error", message: PENDING_MESSAGE };
      boundary = raced.data;
      existingBoundary = true;
    } else boundary = inserted.data;
  }
  if (!boundary) return { status: "error", message: GENERIC_ERROR_MESSAGE };
  if (boundary.checkout_url && boundary.provider_payment_id) {
    try {
      const remote = await getStripeCheckoutSession(boundary.provider_payment_id);
      if (remote.state === "open" && remote.expiresAt && remote.expiresAt > new Date().toISOString()) {
        return { status: "checkout_created", checkoutUrl: boundary.checkout_url };
      }
      if (remote.state === "complete") return { status: "error", message: PENDING_MESSAGE };
      const rotatedKey = randomUUID();
      const rotated = await db.from("payments").update({ provider_session_status: "expired", checkout_url: null, idempotency_key: rotatedKey, checkout_claimed_at: null }).eq("id", boundary.id).eq("status", "pendiente").select("id").single();
      if (rotated.error) return { status: "error", message: PENDING_MESSAGE };
      boundary = { ...boundary, checkout_url: null, provider_session_status: "expired", idempotency_key: rotatedKey };
    } catch {
      return { status: "error", message: PENDING_MESSAGE };
    }
  }

  // A short database lease ensures only one concurrent caller makes the provider call.
  // Stripe's durable idempotency key remains the second safety net.
  const claim = await db.from("payments").update({ checkout_claimed_at: new Date().toISOString() })
    .eq("id", boundary.id).eq("status", "pendiente")
    .or(`checkout_claimed_at.is.null,checkout_claimed_at.lt.${new Date(Date.now() - 120_000).toISOString()}`)
    .select("id").single();
  if (claim.error) return { status: "error", message: PENDING_MESSAGE };

  const returnPath = `/familia/necesidad/${parsed.data.necesidadId}/candidatas/${parsed.data.nineraId}`;
  let session: { sessionId: string; url: string; expiresAt: string | null };
  try {
    session = await createStripeCheckoutSession({
      familiaId: userId, paymentBoundaryId: boundary.id, idempotencyKey: boundary.idempotency_key,
      successUrl: `${origin}${returnPath}?checkout=success`, cancelUrl: `${origin}${returnPath}?checkout=cancel`,
    });
  } catch (error) {
    console.error("Stripe checkout creation failed", { name: error instanceof Error ? error.name : "unknown" });
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }

  let verifiedExpiry = session.expiresAt;
  if (existingBoundary) {
    // A retry can receive a provider-created session from Stripe's idempotency
    // boundary even when the previous request could not persist its recovery state.
    // Never return or link that URL without re-reading the provider's state.
    try {
      const remote = await getStripeCheckoutSession(session.sessionId);
      if (remote.state !== "open" || !remote.expiresAt || remote.expiresAt <= new Date().toISOString()) {
        return { status: "error", message: PENDING_MESSAGE };
      }
      verifiedExpiry = remote.expiresAt;
    } catch {
      return { status: "error", message: PENDING_MESSAGE };
    }
  }

  const link = { provider_payment_id: session.sessionId, checkout_url: session.url, provider_session_status: "open", provider_session_expires_at: verifiedExpiry, checkout_claimed_at: null };
  const linked = await db.from("payments").update(link)
    .eq("id", boundary.id).eq("status", "pendiente").select("id").single();
  if (linked.error || !linked.data) {
    const reread = await db.from("payments").select("status, provider_payment_id, checkout_url").eq("id", boundary.id).maybeSingle();
    if (reread.data?.status !== "pendiente") return { status: "error", message: PENDING_MESSAGE };
    const recovered = await db.from("payments").update(link).eq("id", boundary.id).eq("status", "pendiente").select("id").single();
    if (!recovered.error && recovered.data) return { status: "checkout_created", checkoutUrl: session.url };
    let expired = true;
    try { await expireStripeCheckoutSession(session.sessionId); } catch (compensationError) {
      expired = false;
      console.error("Stripe checkout compensation failed", { name: compensationError instanceof Error ? compensationError.name : "unknown" });
    }
    // Never rotate the idempotency key while compensation is unknown: doing so could
    // create a second chargeable session beside the first. Keep the provider ID/URL
    // discoverable so the next retry can re-check its actual state.
    const recoveryState = expired
      ? { provider_payment_id: session.sessionId, checkout_url: null, provider_session_status: "expired", provider_session_expires_at: session.expiresAt, checkout_claimed_at: null, idempotency_key: randomUUID() }
      : { provider_payment_id: session.sessionId, checkout_url: session.url, provider_session_status: "unknown", provider_session_expires_at: session.expiresAt, checkout_claimed_at: null };
    const recoveredState = await db.from("payments").update(recoveryState).eq("id", boundary.id).eq("status", "pendiente").select("id").single();
    if (recoveredState.error || !recoveredState.data) {
      // Stripe metadata plus the unchanged idempotency key is the durable
      // provider-side fallback. The next retry must recreate idempotently and
      // retrieve/verify the session before it can link or return its URL.
      console.error("Stripe checkout recovery state persistence failed", {
        paymentBoundaryId: boundary.id,
        providerSessionId: session.sessionId,
        code: recoveredState.error?.code ?? "zero_rows",
      });
    }
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }
  return { status: "checkout_created", checkoutUrl: session.url };
}
