import { z } from "zod";
import { normalizeMexicanPhone } from "@/lib/auth/phone";

/**
 * AUTH-02 registration validation (design/UX-spec.md AUTH-02 "Validation": required
 * fields, email format, phone format México +52, password minimum strength, contraseña ==
 * confirmación). Re-run server-side unconditionally (architecture.md §3: "never trust
 * client validation alone") — this schema is the single source of truth for both the
 * registration server action and, eventually, a client-side resolver.
 *
 * Password minimum strength: UX-spec.md does not specify an exact rule, only "password
 * minimum strength" — flagged assumption: at least 8 characters plus at least one letter
 * and one digit (a common, unsurprising baseline; not specified in the UX/UI spec's own
 * text, and stricter than the local Supabase config's `minimum_password_length = 6`
 * default so registration and Supabase Auth agree without a follow-up account creation
 * fail).
 */
export const registerSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio."),
    correo: z.email("Ingresa un correo válido."),
    telefono: z
      .string()
      .trim()
      .min(1, "El teléfono es obligatorio.")
      .transform((value, ctx) => {
        const normalized = normalizeMexicanPhone(value);
        if (!normalized) {
          ctx.addIssue({
            code: "custom",
            message: "Ingresa un teléfono válido de México (10 dígitos).",
          });
          return z.NEVER;
        }
        return normalized;
      }),
    contrasena: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra.")
      .regex(/[0-9]/, "La contraseña debe incluir al menos un número."),
    confirmarContrasena: z.string(),
    role: z.enum(["familia", "ninera"], {
      error: "Selecciona si eres familia o niñera.",
    }),
  })
  .refine((data) => data.contrasena === data.confirmarContrasena, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmarContrasena"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/** AUTH-04 login validation — intentionally minimal (Supabase Auth itself is the source of
 * truth for whether the credentials are correct; this only guards against empty
 * submissions reaching the network call). */
export const loginSchema = z.object({
  correo: z.email("Ingresa un correo válido."),
  contrasena: z.string().min(1, "La contraseña es obligatoria."),
});

export type LoginInput = z.infer<typeof loginSchema>;
