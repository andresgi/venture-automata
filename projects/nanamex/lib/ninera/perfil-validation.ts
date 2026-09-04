import { z } from "zod";
import { diasValues, rangoEdadValues } from "@/lib/familia/necesidad-validation";

export const modalidadValues = ["planta", "entrada_salida", "ocasional"] as const;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora válida.");
const schedule = z
  .object({ dia: z.enum(diasValues), horaInicio: time, horaFin: time })
  .strict()
  .superRefine((value, ctx) => {
    if (value.horaInicio >= value.horaFin) {
      ctx.addIssue({ code: "custom", path: ["horaFin"], message: "La hora final debe ser posterior a la inicial." });
    }
  });

const referencia = z
  .object({
    nombre: z.string().trim().min(1, "Agrega un nombre."),
    relacion: z.string().trim().min(1, "Agrega una relación."),
    periodo: z.string().trim().min(1, "Agrega un periodo."),
    contacto: z.string().trim().optional(),
  })
  .strict();

/**
 * Progressive-fill draft shape for NIN-01/02 (mirrors `necesidad-validation.ts`'s
 * `necesidadDraftSchema` pattern) -- every field optional so each wizard step can persist
 * partial progress; `perfil_completo`'s exact required-field list (database.md §3) is
 * enforced separately by `save_perfil_ninera` (the source of truth), not here.
 */
export const perfilNineraDraftSchema = z
  .object({
    fotoUrl: z.string().trim().url().optional().or(z.literal("")),
    zonaIds: z.array(z.string().uuid()).optional(),
    anosExperiencia: z.number().int().nonnegative("Los años de experiencia no pueden ser negativos.").optional(),
    disponibilidad: z.array(schedule).optional(),
    salarioMin: z.number().int().nonnegative("El salario no puede ser negativo.").optional(),
    salarioMax: z.number().int().nonnegative("El salario no puede ser negativo.").optional(),
    modalidadesAceptadas: z.array(z.enum(modalidadValues)).optional(),
    descripcion: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional(),
    experienciaEdades: z.array(z.enum(rangoEdadValues)).optional(),
    referencias: z.array(referencia).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.salarioMin !== undefined && value.salarioMax !== undefined && value.salarioMin > value.salarioMax) {
      ctx.addIssue({ code: "custom", path: ["salarioMin"], message: "El mínimo no puede ser mayor que el máximo." });
    }
  });

export type PerfilNineraDraft = z.infer<typeof perfilNineraDraftSchema>;

export function validatePerfilNineraDraft(input: unknown) {
  return perfilNineraDraftSchema.safeParse(input);
}

/** Normalizes client camelCase schedule keys to the database's snake_case contract, same
 * translation `necesidad-persistence.ts` performs for `necesidades.dias_horarios`. */
export function normalizePerfilNineraPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const schedules = Array.isArray(payload.disponibilidad) ? payload.disponibilidad : undefined;
  return {
    ...payload,
    disponibilidad: schedules?.map((item) => {
      const entry = item as Record<string, unknown>;
      return { dia: entry.dia, hora_inicio: entry.horaInicio, hora_fin: entry.horaFin };
    }),
  };
}
