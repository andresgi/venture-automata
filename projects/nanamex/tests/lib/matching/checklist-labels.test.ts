import { describe, expect, it } from "vitest";
import { familiaChecklistLabels } from "@/lib/matching/checklist-labels";

describe("familiaChecklistLabels", () => {
  it("returns only the passed factors, translated to plain Spanish", () => {
    const labels = familiaChecklistLabels({
      location: true,
      availability: false,
      salaryOverlap: true,
      childAgeOverlap: false,
      experience: true,
    });

    expect(labels).toEqual([
      "Zona compatible con tu necesidad",
      "Dentro de tu rango de pago",
      "Cumple la experiencia mínima requerida",
    ]);
  });

  it("orders by the factors' own weight ordering, not insertion order", () => {
    const labels = familiaChecklistLabels({
      experience: true,
      childAgeOverlap: true,
      location: true,
    });

    expect(labels).toEqual([
      "Zona compatible con tu necesidad",
      "Experiencia con la edad de tus hijos",
      "Cumple la experiencia mínima requerida",
    ]);
  });

  it("caps at 3 items even when all 5 factors pass", () => {
    const labels = familiaChecklistLabels({
      location: true,
      availability: true,
      salaryOverlap: true,
      childAgeOverlap: true,
      experience: true,
    });

    expect(labels).toHaveLength(3);
    expect(labels).toEqual([
      "Zona compatible con tu necesidad",
      "Disponibilidad compatible",
      "Dentro de tu rango de pago",
    ]);
  });

  it("returns an empty list when no factors passed", () => {
    expect(familiaChecklistLabels({ location: false, availability: false })).toEqual([]);
  });
});
