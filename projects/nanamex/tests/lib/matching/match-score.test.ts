import { describe, expect, it } from "vitest";
import {
  MATCH_COMPATIBLE_THRESHOLD,
  MATCH_MIN_EXPERIENCE_YEARS,
  MATCH_WEIGHT_AVAILABILITY,
  MATCH_WEIGHT_CHILD_AGE_OVERLAP,
  MATCH_WEIGHT_EXPERIENCE,
  MATCH_WEIGHT_LOCATION,
  MATCH_WEIGHT_SALARY_OVERLAP,
  scoreMatch,
  type MatchNecesidad,
  type MatchNinera,
} from "@/lib/matching/match-score";

const necesidad: MatchNecesidad = {
  zona: "Centro",
  diasHorarios: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }],
  modalidad: "entrada_salida",
  pagoMin: 100,
  pagoMax: 200,
  children: ["0-1", "3-6"],
};

const ninera: MatchNinera = {
  zonasDeTrabajo: ["Centro"],
  disponibilidad: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }],
  modalidadesAceptadas: ["entrada_salida"],
  salarioMin: 100,
  salarioMax: 200,
  experienciaEdades: ["0-1"],
  anosExperiencia: MATCH_MIN_EXPERIENCE_YEARS,
};

const factorNames = ["location", "availability", "salaryOverlap", "childAgeOverlap", "experience"] as const;
type FactorName = (typeof factorNames)[number];

const factorOverrides: Record<FactorName, Partial<MatchNinera>> = {
  location: { zonasDeTrabajo: ["Norte"] },
  availability: { disponibilidad: [] },
  salaryOverlap: { salarioMin: 300, salarioMax: 400 },
  childAgeOverlap: { experienciaEdades: ["12+"] },
  experience: { anosExperiencia: MATCH_MIN_EXPERIENCE_YEARS - 1 },
};

const factorWeights: Record<FactorName, number> = {
  location: MATCH_WEIGHT_LOCATION,
  availability: MATCH_WEIGHT_AVAILABILITY,
  salaryOverlap: MATCH_WEIGHT_SALARY_OVERLAP,
  childAgeOverlap: MATCH_WEIGHT_CHILD_AGE_OVERLAP,
  experience: MATCH_WEIGHT_EXPERIENCE,
};

const factorCombinations = Array.from({ length: 32 }, (_, mask) => {
  const passingFactors = Object.fromEntries(
    factorNames.map((factorName, index) => [factorName, (mask & (1 << index)) !== 0]),
  ) as Record<FactorName, boolean>;
  const candidate = factorNames.reduce<MatchNinera>(
    (candidate, factorName) => passingFactors[factorName] ? candidate : { ...candidate, ...factorOverrides[factorName] },
    ninera,
  );
  const expectedScore = factorNames.reduce(
    (score, factorName) => score + (passingFactors[factorName] ? factorWeights[factorName] : 0),
    0,
  );
  return [passingFactors, candidate, expectedScore] as const;
});

describe("scoreMatch", () => {
  it("returns 100 and all factors passing for a complete match", () => {
    const result = scoreMatch(necesidad, ninera);
    expect(result).toMatchObject({ score: 100, compatible: true });
    expect(result?.factors).toEqual({
      location: true,
      availability: true,
      salaryOverlap: true,
      childAgeOverlap: true,
      experience: true,
    });
  });

  it.each(factorCombinations)("scores every five-factor combination (%j)", (expectedFactors, candidate, expectedScore) => {
    const result = scoreMatch(necesidad, candidate);
    expect(result?.score).toBe(expectedScore);
    expect(result?.factors).toEqual(expectedFactors);
  });

  it.each<[string, Partial<MatchNinera>, number]>([
    ["location", { zonasDeTrabajo: ["Norte"] }, 75],
    ["availability", { disponibilidad: [{ dia: "mar", horaInicio: "09:00", horaFin: "17:00" }] }, 75],
    ["salary overlap", { salarioMin: 300, salarioMax: 400 }, 80],
    ["child age overlap", { experienciaEdades: ["12+"] }, 85],
    ["experience", { anosExperiencia: MATCH_MIN_EXPERIENCE_YEARS - 1 }, 85],
  ])("subtracts only the %s factor when it fails", (_factor, changes, expectedScore) => {
    const result = scoreMatch(necesidad, { ...ninera, ...changes });
    expect(result?.score).toBe(expectedScore);
    expect(Object.values(result?.factors ?? {}).filter(Boolean)).toHaveLength(4);
  });

  it("excludes a candidate whose modalidad does not match", () => {
    expect(scoreMatch(necesidad, { ...ninera, modalidadesAceptadas: ["planta"] })).toBeNull();
  });

  it("uses the threshold inclusively and does not hide lower scores", () => {
    const atThreshold = scoreMatch(necesidad, {
      ...ninera,
      zonasDeTrabajo: ["Norte"],
      anosExperiencia: MATCH_MIN_EXPERIENCE_YEARS - 1,
    });
    expect(atThreshold?.score).toBe(MATCH_COMPATIBLE_THRESHOLD);
    expect(atThreshold?.compatible).toBe(true);

    const belowThreshold = scoreMatch(necesidad, {
      ...ninera,
      zonasDeTrabajo: ["Norte"],
      salarioMin: 300,
      salarioMax: 400,
    });
    expect(belowThreshold?.score).toBe(55);
    expect(belowThreshold?.compatible).toBe(false);
  });

  it("handles boundary overlaps and availability covered by multiple entries", () => {
    const result = scoreMatch(necesidad, {
      ...ninera,
      disponibilidad: [
        { dia: "lun", horaInicio: "08:00", horaFin: "09:00" },
        { dia: "lun", horaInicio: "17:00", horaFin: "18:00" },
      ],
      salarioMin: 200,
      salarioMax: 300,
    });
    expect(result?.factors.availability).toBe(false);
    expect(result?.factors.salaryOverlap).toBe(true);
  });

  it("requires every requested day and treats empty age sets as a failed factor", () => {
    const result = scoreMatch(
      { ...necesidad, diasHorarios: [...necesidad.diasHorarios, { dia: "mar", horaInicio: "09:00", horaFin: "17:00" }], children: [] },
      ninera,
    );
    expect(result?.factors.availability).toBe(false);
    expect(result?.factors.childAgeOverlap).toBe(false);
  });

  it("does not require a verification status to score a candidate", () => {
    const result = scoreMatch(necesidad, ninera);
    expect(result?.score).toBe(100);
  });
});
