import { z } from "zod";

export const rangoEdadValues = ["0-1", "1-3", "3-6", "6-12", "12+"] as const;
export const diasValues = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora válida.");
const schedule = z.object({ dia: z.enum(diasValues), horaInicio: time, horaFin: time }).strict().superRefine((value, ctx) => {
  if (value.horaInicio >= value.horaFin) ctx.addIssue({ code: "custom", path: ["horaFin"], message: "La hora final debe ser posterior a la inicial." });
});
const children = z.array(z.enum(rangoEdadValues));

export const necesidadDraftSchema = z.object({
  children: children.optional(),
  zonaId: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().uuid("Selecciona una zona válida.").optional()
  ),
  diasHorarios: z.array(schedule).optional(),
  modalidad: z.enum(["planta", "entrada_salida", "ocasional"]).optional(),
  pagoMin: z.number().int().nonnegative("El pago no puede ser negativo.").optional(),
  pagoMax: z.number().int().nonnegative("El pago no puede ser negativo.").optional(),
  fechaInicio: z.string().date("Selecciona una fecha válida.").optional(),
  responsabilidades: z.array(z.string().trim().min(1)).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.pagoMin !== undefined && value.pagoMax !== undefined && value.pagoMin > value.pagoMax) ctx.addIssue({ code: "custom", path: ["pagoMin"], message: "El mínimo no puede ser mayor que el máximo." });
  const today = new Date().toISOString().slice(0, 10);
  if (value.fechaInicio !== undefined && value.fechaInicio < today) ctx.addIssue({ code: "custom", path: ["fechaInicio"], message: "La fecha no puede estar en el pasado." });
});

export type NecesidadDraft = z.infer<typeof necesidadDraftSchema>;

export const necesidadCompleteSchema = z.object({
  children: children.min(1, "Agrega al menos un rango de edad."), zonaId: z.string().uuid(),
  diasHorarios: z.array(schedule).min(1),
  modalidad: z.enum(["planta", "entrada_salida", "ocasional"]), pagoMin: z.number().int().nonnegative(), pagoMax: z.number().int().nonnegative(),
  fechaInicio: z.string().date(), responsabilidades: z.array(z.string().trim().min(1)).min(1),
}).strict().superRefine((value, ctx) => {
  if (value.pagoMin > value.pagoMax) ctx.addIssue({ code: "custom", path: ["pagoMin"], message: "El mínimo no puede ser mayor que el máximo." });
  if (value.fechaInicio < new Date().toISOString().slice(0, 10)) ctx.addIssue({ code: "custom", path: ["fechaInicio"], message: "La fecha no puede estar en el pasado." });
});

export function validateNecesidadDraft(input: unknown) {
  return necesidadDraftSchema.safeParse(input);
}
