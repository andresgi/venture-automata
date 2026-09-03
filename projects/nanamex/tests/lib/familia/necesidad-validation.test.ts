import { describe, expect, it } from "vitest";
import { necesidadCompleteSchema, necesidadDraftSchema, validateNecesidadDraft } from "@/lib/familia/necesidad-validation";

const valid = { children: ["0-1"], zonaId: "11111111-1111-4111-8111-111111111111", diasHorarios: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }], modalidad: "ocasional", pagoMin: 100, pagoMax: 200, fechaInicio: "2099-01-01", responsabilidades: ["Jugar y acompañar"] };

describe("necesidadDraftSchema", () => {
  it("accepts only the fixed age-range enum", () => {
    expect(validateNecesidadDraft(valid).success).toBe(true);
    expect(validateNecesidadDraft({ ...valid, children: [4] }).success).toBe(false);
    expect(validateNecesidadDraft({ ...valid, children: ["4 años"] }).success).toBe(false);
    expect(validateNecesidadDraft({ ...valid, children: ["2020-01-01"] }).success).toBe(false);
  });

  it("rejects reversed payment ranges and past start dates server-side", () => {
    expect(validateNecesidadDraft({ ...valid, pagoMin: 201, pagoMax: 200 }).success).toBe(false);
    expect(validateNecesidadDraft({ ...valid, fechaInicio: "2000-01-01" }).success).toBe(false);
    expect(validateNecesidadDraft({ ...valid, diasHorarios: [{ dia: "lun", horaInicio: "17:00", horaFin: "09:00" }] }).success).toBe(false);
  });

  it("rejects unknown exact-age and birthdate keys", () => {
    expect(validateNecesidadDraft({ ...valid, edad: 4 }).success).toBe(false);
    expect(validateNecesidadDraft({ ...valid, fechaNacimiento: "2020-01-01" }).success).toBe(false);
  });

  it("requires at least one age range for a complete necesidad", () => {
    const result = necesidadDraftSchema.safeParse({ ...valid, children: [] });
    expect(result.success).toBe(true); // an empty draft is allowed between wizard steps
    expect(necesidadCompleteSchema.safeParse({ ...valid, children: [] }).success).toBe(false);
  });

  it("allows the empty zone value used while saving the first wizard step", () => {
    expect(validateNecesidadDraft({ children: ["0-1"], zonaId: "" }).success).toBe(true);
  });
});
