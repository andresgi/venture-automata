import { describe, expect, it } from "vitest";
import { computeMatches, type MatchCandidate, type MatchRepository } from "@/lib/matching/compute-matches";
import { type MatchNecesidad, type MatchNinera } from "@/lib/matching/match-score";

const necesidad: MatchNecesidad = {
  zona: "Centro",
  diasHorarios: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }],
  modalidad: "entrada_salida",
  pagoMin: 100,
  pagoMax: 200,
  children: ["3-6"],
};

const baseNinera: MatchNinera = {
  zonasDeTrabajo: ["Centro"],
  disponibilidad: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }],
  modalidadesAceptadas: ["entrada_salida"],
  salarioMin: 100,
  salarioMax: 200,
  experienciaEdades: ["3-6"],
  anosExperiencia: 3,
};

function candidate(id: string, overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    id,
    profileCompleteness: 100,
    createdAt: "2026-01-01T00:00:00.000Z",
    ninera: baseNinera,
    ...overrides,
  };
}

function repository(candidates: readonly MatchCandidate[]): MatchRepository {
  return { listPublishedCandidates: () => candidates };
}

describe("computeMatches", () => {
  it("sorts by score, completeness, oldest creation time, then id", async () => {
    const results = await computeMatches(
      necesidad,
      repository([
        candidate("newer", { createdAt: "2026-02-01T00:00:00.000Z" }),
        candidate("less-complete", { profileCompleteness: 80 }),
        candidate("best", { profileCompleteness: 100, createdAt: "2025-12-01T00:00:00.000Z" }),
        candidate("lower-score", { ninera: { ...baseNinera, zonasDeTrabajo: ["Norte"] } }),
      ]),
    );

    expect(results.map(({ candidate: item }) => item.id)).toEqual([
      "best",
      "newer",
      "less-complete",
      "lower-score",
    ]);
    expect(results[0]).toMatchObject({ score: 100, compatible: true, factors: {
      location: true,
      availability: true,
      salaryOverlap: true,
      childAgeOverlap: true,
      experience: true,
    } });
  });

  it("does not use verification status to order otherwise equal candidates", async () => {
    const first = { ...candidate("first"), verification_status: "no_verificada" };
    const second = { ...candidate("second"), verification_status: "verificada" };

    const results = await computeMatches(necesidad, repository([first, second]));
    expect(results.map(({ candidate: item }) => item.id)).toEqual(["first", "second"]);

    const reversed = await computeMatches(necesidad, repository([second, first]));
    expect(reversed.map(({ candidate: item }) => item.id)).toEqual(["first", "second"]);
  });

  it("excludes candidates rejected by the modalidad hard filter", async () => {
    const results = await computeMatches(
      necesidad,
      repository([
        candidate("eligible"),
        candidate("excluded", { ninera: { ...baseNinera, modalidadesAceptadas: ["planta"] } }),
      ]),
    );

    expect(results.map(({ candidate: item }) => item.id)).toEqual(["eligible"]);
  });

  it("can read candidates through an asynchronous repository", async () => {
    const results = await computeMatches(necesidad, {
      listPublishedCandidates: async () => [candidate("one")],
    });

    expect(results).toHaveLength(1);
  });
});
