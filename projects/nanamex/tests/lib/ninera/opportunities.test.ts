import { describe, expect, it } from "vitest";
import { matchesAvailabilityWindow, nineraChecklistLabels, normalizeOpportunityFilters, scoreNecesidadForNinera, sortOpportunities, toMatchNinera, type StoredNecesidadForMatching } from "@/lib/ninera/opportunities";

const necesidad: StoredNecesidadForMatching = {
  id: "need-1", zona_id: "z1", zonas: { alcaldia_municipio: "Monterrey" }, modalidad: "planta", updated_at: "2026-09-01T00:00:00Z",
  pago_min: 4000, pago_max: 6000, fecha_inicio: "2026-10-01", dias_horarios: [{ dia: "lun", hora_inicio: "08:00", hora_fin: "16:00" }],
  necesidad_children: [{ rango_edad: "3-6" }],
};
const ninera = {
  zonas: [{ zonas: { alcaldia_municipio: "Monterrey" } }], disponibilidad: [{ dia: "lun" as const, hora_inicio: "08:00", hora_fin: "16:00" }],
  modalidades_aceptadas: ["planta" as const], salario_min: 4000, salario_max: 6000, anos_experiencia: 3,
  edades: [{ rango_edad: "3-6" as const }],
};

describe("niñera opportunities", () => {
  it("uses niñera-facing checklist labels and excludes unsupported factor names", () => {
    expect(nineraChecklistLabels({ location: true, availability: true, salaryOverlap: true, childAgeOverlap: true, experience: true })).toEqual([
      "Tu zona", "Tu disponibilidad", "Dentro de tu expectativa salarial",
    ]);
  });

  it("reuses matching rules and hard-excludes a modality mismatch", () => {
    expect(scoreNecesidadForNinera(necesidad, { ...toMatchNinera(ninera), modalidadesAceptadas: ["ocasional"] })).toBeNull();
    expect(scoreNecesidadForNinera(necesidad, toMatchNinera(ninera))).toMatchObject({ id: "need-1", score: 100, pushed: false });
  });

  it("filters by the existing availability factor and applies the conservative pushed rule", () => {
    const opportunity = scoreNecesidadForNinera(necesidad, toMatchNinera(ninera));
    expect(opportunity).not.toBeNull();
    expect(matchesAvailabilityWindow(necesidad, toMatchNinera(ninera), "lun", "09:00", "15:00")).toBe(true);
    expect(matchesAvailabilityWindow(necesidad, toMatchNinera(ninera), "mar", "09:00", "15:00")).toBe(false);
  });

  it("orders equal-score opportunities by stable date and id tie-breakers", () => {
    expect(sortOpportunities([
      { id: "b", score: 80, fechaInicio: "2026-10-02", recency: "2026-01-01T00:00:00Z" },
      { id: "a", score: 80, fechaInicio: "2026-10-02", recency: "2026-01-02T00:00:00Z" },
      { id: "c", score: 90, fechaInicio: "2026-11-01", recency: "2025-01-01T00:00:00Z" },
    ])).toEqual([
      { id: "c", score: 90, fechaInicio: "2026-11-01", recency: "2025-01-01T00:00:00Z" },
      { id: "a", score: 80, fechaInicio: "2026-10-02", recency: "2026-01-02T00:00:00Z" },
      { id: "b", score: 80, fechaInicio: "2026-10-02", recency: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("normalizes malformed day, time, and salary-range query parameters safely", () => {
    expect(normalizeOpportunityFilters({ dia: "funday", hora_desde: "99:99", hora_hasta: "10:00", pago_min: "6000", pago_max: "3000" })).toMatchObject({ day: "", start: "", end: "", minPay: 0, maxPay: 0 });
    expect(normalizeOpportunityFilters({ dia: "lun", hora_desde: "09:00", hora_hasta: "17:00", pago_min: "3000", pago_max: "6000" })).toMatchObject({ day: "lun", start: "09:00", end: "17:00", minPay: 3000, maxPay: 6000 });
  });
});
