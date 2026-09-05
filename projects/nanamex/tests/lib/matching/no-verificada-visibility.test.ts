import { describe, expect, it } from "vitest";
import { computeMatches, type MatchCandidate, type MatchRepository } from "@/lib/matching/compute-matches";
import type { MatchNecesidad } from "@/lib/matching/match-score";

/**
 * E7-01 regression test, explicitly called out by engineering/implementation-plan.md's
 * acceptance criteria: "test confirming a no_verificada, perfil_completo=true niñera
 * appears in computeMatches results" -- the direct, testable expression of the PRD
 * addendum's Critical Issue #2 resolution (design/UX-spec.md Decision 3: all three
 * verification states, including "No verificada," keep a profile fully visible/matchable;
 * none of them hides or deprioritizes a profile).
 *
 * The candidate below is shaped exactly the way `save_perfil_ninera`
 * (db/migrations/20260904000019_perfil_ninera_onboarding.sql) leaves a freshly-onboarded
 * niñera row once NIN-01/02's required fields are all set: `perfil_completo = true` and
 * `publicado = true` (the RPC sets both unconditionally from field completeness), while
 * `verification_status` stays at its schema default, `no_verificada` -- this story never
 * touches that column (verification is Epic 8's separate concern). `MatchCandidate`/
 * `computeMatches` (lib/matching/compute-matches.ts) have no `verification_status` input at
 * all, matching `actions/necesidad.ts`'s real candidate query, which filters only on
 * `publicado`/`perfil_completo`/`account_status` -- never `verification_status`.
 */
describe("E7-01: no_verificada, perfil_completo=true niñera visibility (addendum Critical Issue #2)", () => {
  const necesidad: MatchNecesidad = {
    zona: "Centro",
    diasHorarios: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }],
    modalidad: "ocasional",
    pagoMin: 4500,
    pagoMax: 6500,
    children: ["3-6"],
  };

  // Mirrors a real onboarded-but-unverified niñera: every NIN-01/02 required field
  // populated (zona de trabajo, disponibilidad, modalidades, expectativa salarial,
  // descripción -> perfil_completo, >=1 experiencia_edad), `publicado = true` because the
  // RPC sets it once perfil_completo is true -- verification_status is deliberately absent
  // from this contract (see MatchNinera's type), the same way it's absent from the schema
  // read `actions/necesidad.ts` actually performs.
  const noVerificadaCandidate: MatchCandidate = {
    id: "ninera-no-verificada",
    profileCompleteness: 100,
    createdAt: "2026-09-04T00:00:00.000Z",
    ninera: {
      zonasDeTrabajo: ["Centro"],
      disponibilidad: [{ dia: "lun", horaInicio: "08:00", horaFin: "18:00" }],
      modalidadesAceptadas: ["ocasional"],
      salarioMin: 4000,
      salarioMax: 7000,
      experienciaEdades: ["3-6"],
      anosExperiencia: 3,
    },
  };

  function repository(candidates: readonly MatchCandidate[]): MatchRepository {
    return { listPublishedCandidates: () => candidates };
  }

  it("appears in computeMatches results for a compatible necesidad despite verification_status = no_verificada", async () => {
    const results = await computeMatches(necesidad, repository([noVerificadaCandidate]));

    expect(results).toHaveLength(1);
    expect(results[0].candidate.id).toBe("ninera-no-verificada");
    expect(results[0].compatible).toBe(true);
  });

  it("ranks identically to an otherwise-identical `verificada` candidate (verification never enters scoring/ranking)", async () => {
    const verificadaCandidate: MatchCandidate = { ...noVerificadaCandidate, id: "ninera-verificada" };

    const results = await computeMatches(necesidad, repository([noVerificadaCandidate, verificadaCandidate]));

    expect(results.map((match) => match.score)).toEqual([results[0].score, results[0].score]);
    expect(new Set(results.map((match) => match.candidate.id))).toEqual(
      new Set(["ninera-no-verificada", "ninera-verificada"]),
    );
  });
});
