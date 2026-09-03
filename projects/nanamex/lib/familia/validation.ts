import { z } from "zod";

/**
 * FAM-01 "Onboarding perfil familiar" validation (design/UI-SPEC.md FAM-01;
 * design/journeys.md J-FAM-1 step 4; engineering/database.md §2). Re-run server-side
 * unconditionally (architecture.md §3: "never trust client validation alone"), same
 * pattern as `lib/auth/validation.ts`'s `registerSchema`.
 *
 * `nombre` re-validates the same field already collected at AUTH-02 registration
 * (`profiles.nombre`) — this screen lets the family confirm/correct it, not collect a
 * second, schema-less copy of it. See `actions/perfil-familiar.ts`'s doc comment and the
 * E1-03 developer report for the full reasoning on why this field exists here at all
 * despite `perfil_familiar` having no `nombre` column of its own.
 *
 * `zonaId` must be a real row id from the seeded `zonas` table (database.md §4) — this
 * schema only checks the shape (a UUID); `actions/perfil-familiar.ts` re-checks that the id
 * actually exists, which is the real "not free text" enforcement this story's acceptance
 * criterion calls for.
 */
export const perfilFamiliarSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  zonaId: z.uuid("Selecciona una zona de la lista."),
});

export type PerfilFamiliarInput = z.infer<typeof perfilFamiliarSchema>;
