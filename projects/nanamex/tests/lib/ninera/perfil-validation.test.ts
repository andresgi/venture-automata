import { describe, expect, it } from "vitest";
import { normalizePerfilNineraPayload, validatePerfilNineraDraft } from "@/lib/ninera/perfil-validation";

describe("validatePerfilNineraDraft", () => {
  it("accepts an empty draft (progressive fill)", () => {
    expect(validatePerfilNineraDraft({}).success).toBe(true);
  });

  it("rejects unknown fields", () => {
    expect(validatePerfilNineraDraft({ edadExacta: 4 }).success).toBe(false);
  });

  it("rejects salarioMin greater than salarioMax", () => {
    const result = validatePerfilNineraDraft({ salarioMin: 500, salarioMax: 100 });
    expect(result.success).toBe(false);
  });

  it("rejects a schedule end time before its start time", () => {
    const result = validatePerfilNineraDraft({
      disponibilidad: [{ dia: "lun", horaInicio: "18:00", horaFin: "09:00" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a descripcion longer than 1000 characters", () => {
    const result = validatePerfilNineraDraft({ descripcion: "a".repeat(1001) });
    expect(result.success).toBe(false);
  });

  it("accepts a fully populated draft", () => {
    const result = validatePerfilNineraDraft({
      fotoUrl: "https://example.com/foto.jpg",
      zonaIds: ["11111111-1111-4111-8111-111111111111"],
      anosExperiencia: 3,
      disponibilidad: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }],
      salarioMin: 4000,
      salarioMax: 6000,
      modalidadesAceptadas: ["ocasional"],
      descripcion: "Me encanta cuidar niños.",
      experienciaEdades: ["0-1", "3-6"],
      referencias: [{ nombre: "Ana", relacion: "Familia anterior", periodo: "2021-2023", contacto: "" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("normalizePerfilNineraPayload", () => {
  it("converts camelCase schedule keys to the database's snake_case contract", () => {
    const result = normalizePerfilNineraPayload({
      disponibilidad: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }],
    });
    expect(result.disponibilidad).toEqual([{ dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" }]);
  });

  it("passes through payloads with no disponibilidad untouched", () => {
    const result = normalizePerfilNineraPayload({ descripcion: "hola" });
    expect(result.disponibilidad).toBeUndefined();
    expect(result.descripcion).toBe("hola");
  });
});
