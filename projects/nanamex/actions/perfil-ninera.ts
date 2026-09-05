"use server";

import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validatePerfilNineraDraft, normalizePerfilNineraPayload } from "@/lib/ninera/perfil-validation";

export type PerfilNineraActionState = {
  status: "idle" | "saved" | "error";
  message?: string;
  perfilCompleto?: boolean;
};

const GENERIC_ERROR = "No se pudo guardar tu perfil. Intenta de nuevo.";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * NIN-01/NIN-02 onboarding persistence (design/UI-SPEC.md; engineering/database.md §3/§3a/
 * §3b/§3c). Delegates the actual upsert + completeness/`publicado` computation to the
 * atomic `save_perfil_ninera` RPC (db/migrations/20260904000019_perfil_ninera_onboarding.sql)
 * so every write to `perfil_ninera` and its three join tables is transactional, mirroring
 * `actions/necesidad.ts`'s `save_necesidad_draft` pattern.
 *
 * Role is re-checked server-side (not just inferred from the `/ninera/*` route group)
 * since a Server Action is directly reachable as its own POST endpoint.
 */
export async function savePerfilNineraDraftAction(
  _previous: PerfilNineraActionState,
  formData: FormData
): Promise<PerfilNineraActionState> {
  let value: unknown;
  try {
    value = JSON.parse(String(formData.get("draft")));
  } catch {
    return { status: "error", message: "Los datos del perfil no son válidos." };
  }

  const parsed = validatePerfilNineraDraft(value);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Completa los datos requeridos." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Tu sesión expiró. Inicia sesión de nuevo." };

  const db = createServiceRoleClient();
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "ninera") return { status: "error", message: GENERIC_ERROR };

  const zonaIds = parsed.data.zonaIds ?? [];
  if (zonaIds.length > 0) {
    const { data: zonas } = await db.from("zonas").select("id").in("id", zonaIds);
    if (!zonas || zonas.length !== zonaIds.length) {
      return { status: "error", message: "Selecciona zonas válidas de la lista." };
    }
  }

  const rpc = await db.rpc("save_perfil_ninera", {
    p_ninera_id: user.id,
    p_payload: normalizePerfilNineraPayload(parsed.data),
  });
  if (rpc.error) {
    console.error("savePerfilNineraDraftAction: save_perfil_ninera failed", rpc.error);
    return { status: "error", message: GENERIC_ERROR };
  }

  return { status: "saved", perfilCompleto: Boolean(rpc.data) };
}

export type UploadFotoState = { status: "idle" | "uploaded" | "error"; message?: string; fotoUrl?: string };

export type IdentityUploadState = { status: "idle" | "uploaded" | "error"; message?: string };
const MAX_IDENTITY_BYTES = 10 * 1024 * 1024;
const IDENTITY_TYPES: Record<string, string[]> = { "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"] };

function hasImageSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  return bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}

async function enqueueIdentityCleanup(db: ReturnType<typeof createServiceRoleClient>, path: string, reason: string) {
  try {
    const { error } = await db.from("identity_document_cleanup_queue").insert({ document_storage_path: path, reason });
    if (error) console.error("submitIdentityDocumentAction: durable cleanup queue insert failed", error);
  } catch (error) {
    console.error("submitIdentityDocumentAction: durable cleanup queue insert threw", error);
  }
}

export async function submitIdentityDocumentAction(_previous: IdentityUploadState, formData: FormData): Promise<IdentityUploadState> {
  let db: ReturnType<typeof createServiceRoleClient> | undefined;
  let bucket: ReturnType<ReturnType<typeof createServiceRoleClient>["storage"]["from"]> | undefined;
  let path: string | undefined;
  let uploaded = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "Tu sesión expiró. Inicia sesión de nuevo." };
    db = createServiceRoleClient();
    const { data: profile } = await db.from("profiles").select("role, account_status").eq("id", user.id).maybeSingle();
    if (!profile || profile.role !== "ninera" || profile.account_status !== "activa") return { status: "error", message: "No se pudo subir tu identificación." };
    const file = formData.get("documento");
    if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Selecciona una foto de tu identificación." };
    const extension = file.name.toLowerCase().split(".").pop();
    if (file.size > MAX_IDENTITY_BYTES) return { status: "error", message: "La identificación no puede superar 10 MB." };
    const acceptedExtensions = IDENTITY_TYPES[file.type];
    if (!acceptedExtensions || !extension || !acceptedExtensions.includes(extension)) return { status: "error", message: "Formato no permitido. Usa JPG, PNG o WEBP." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasImageSignature(bytes, file.type)) return { status: "error", message: "El archivo no parece ser una imagen JPG, PNG o WEBP válida." };
    const canonicalExtension = file.type === "image/jpeg" ? "jpg" : extension;
    path = `${user.id}/${crypto.randomUUID()}.${canonicalExtension}`;
    bucket = db.storage.from("identity-documents");
    const { error: uploadError } = await bucket.upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("submitIdentityDocumentAction: identity document upload returned an error", uploadError);
      return { status: "error", message: "No se pudo subir tu identificación. Intenta de nuevo." };
    }
    uploaded = true;
    const { error: submitError } = await db.rpc("submit_identity_verification", { p_ninera_id: user.id, p_document_storage_path: path });
    if (submitError) {
      if (uploaded && path) {
        try {
          const { error: cleanupError } = await bucket.remove([path]);
          if (cleanupError) {
            console.error("submitIdentityDocumentAction: uploaded document cleanup failed", cleanupError);
            await enqueueIdentityCleanup(db, path, "submission_rpc_rejected");
          }
        } catch (cleanupError) {
          console.error("submitIdentityDocumentAction: uploaded document cleanup threw", cleanupError);
          await enqueueIdentityCleanup(db, path, "submission_rpc_rejected");
        }
      }
      if (submitError.message === "identity_verification_already_in_process") {
        return { status: "error", message: "Tu identificación ya está en revisión." };
      }
      console.error("submitIdentityDocumentAction: submission RPC failed", submitError);
      return { status: "error", message: "No se pudo registrar tu identificación. Intenta de nuevo." };
    }
    return { status: "uploaded", message: "Recibimos tu identificación y ya está en revisión." };
  } catch (error) {
    if (uploaded && db && bucket && path) {
      try {
        const { error: cleanupError } = await bucket.remove([path]);
        if (cleanupError) {
          console.error("submitIdentityDocumentAction: uploaded document cleanup failed", cleanupError);
          await enqueueIdentityCleanup(db, path, "submission_exception");
        }
      } catch (cleanupError) {
        console.error("submitIdentityDocumentAction: uploaded document cleanup threw", cleanupError);
        await enqueueIdentityCleanup(db, path, "submission_exception");
      }
    }
    console.error("submitIdentityDocumentAction: identity document upload failed", error);
    return { status: "error", message: uploaded ? "No se pudo registrar tu identificación. Intenta de nuevo." : "No se pudo subir tu identificación. Intenta de nuevo." };
  }
}

/**
 * Uploads a niñera's profile photo to the public `profile-photos` bucket
 * (db/migrations/20260904000020_profile_photos_storage.sql; architecture.md §8) under her
 * own `{profile_id}/` path. Type/size are validated server-side even though the client
 * input also restricts `accept`/size, per architecture.md §8's "uploads are authenticated
 * and size/type-validated server-side" requirement -- never trust a client-side-only check.
 */
export async function uploadPerfilFotoAction(_previous: UploadFotoState, formData: FormData): Promise<UploadFotoState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Tu sesión expiró. Inicia sesión de nuevo." };

  const db = createServiceRoleClient();
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "ninera") return { status: "error", message: "No se pudo subir la foto." };

  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecciona una foto." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { status: "error", message: "La foto no puede superar 5 MB." };
  }
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return { status: "error", message: "Formato no permitido. Usa JPG, PNG o WEBP." };
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${Date.now()}.${extension}`;
  const { error: uploadError } = await db.storage
    .from("profile-photos")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
  if (uploadError) {
    console.error("uploadPerfilFotoAction: storage upload failed", uploadError);
    return { status: "error", message: "No se pudo subir la foto. Intenta de nuevo." };
  }

  const { data: publicUrl } = db.storage.from("profile-photos").getPublicUrl(path);
  return { status: "uploaded", fotoUrl: publicUrl.publicUrl };
}
