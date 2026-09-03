/**
 * The V1 matching rules are deliberately kept independent of persistence and
 * authentication. E3-02 can use this service after loading the two records.
 */

export const MATCH_WEIGHT_LOCATION = 25;
export const MATCH_WEIGHT_AVAILABILITY = 25;
export const MATCH_WEIGHT_SALARY_OVERLAP = 20;
export const MATCH_WEIGHT_CHILD_AGE_OVERLAP = 15;
export const MATCH_WEIGHT_EXPERIENCE = 15;
export const MATCH_MIN_EXPERIENCE_YEARS = 2;
export const MATCH_COMPATIBLE_THRESHOLD = 60;

export type MatchDay = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";
export type MatchModalidad = "planta" | "entrada_salida" | "ocasional";
export type MatchAgeRange = "0-1" | "1-3" | "3-6" | "6-12" | "12+";

export type MatchScheduleEntry = {
  dia: MatchDay;
  horaInicio: string;
  horaFin: string;
};

export type MatchNecesidad = {
  zona: string;
  diasHorarios: readonly MatchScheduleEntry[];
  modalidad: MatchModalidad;
  pagoMin: number;
  pagoMax: number;
  children: readonly MatchAgeRange[];
};

export type MatchNinera = {
  zonasDeTrabajo: readonly string[];
  disponibilidad: readonly MatchScheduleEntry[];
  modalidadesAceptadas: readonly MatchModalidad[];
  salarioMin: number;
  salarioMax: number;
  experienciaEdades: readonly MatchAgeRange[];
  anosExperiencia: number;
};

export type MatchFactors = {
  location: boolean;
  availability: boolean;
  salaryOverlap: boolean;
  childAgeOverlap: boolean;
  experience: boolean;
};

export type MatchScoreResult = {
  score: number;
  factors: MatchFactors;
  compatible: boolean;
};

function rangesOverlap(firstMin: number, firstMax: number, secondMin: number, secondMax: number): boolean {
  return firstMin <= secondMax && secondMin <= firstMax;
}

function schedulesOverlap(first: MatchScheduleEntry, second: MatchScheduleEntry): boolean {
  return first.dia === second.dia && first.horaInicio < second.horaFin && second.horaInicio < first.horaFin;
}

function availabilityCovers(
  requested: readonly MatchScheduleEntry[],
  offered: readonly MatchScheduleEntry[],
): boolean {
  return requested.every((requestedEntry) =>
    offered.some((offeredEntry) => schedulesOverlap(requestedEntry, offeredEntry)),
  );
}

function hasIntersection(first: readonly string[], second: readonly string[]): boolean {
  return first.some((value) => second.includes(value));
}

/**
 * Scores one candidate for one necesidad. A modalidad mismatch is the sole
 * hard filter and returns null; all other mismatches only reduce the score.
 */
export function scoreMatch(necesidad: MatchNecesidad, ninera: MatchNinera): MatchScoreResult | null {
  if (!ninera.modalidadesAceptadas.includes(necesidad.modalidad)) {
    return null;
  }

  const factors: MatchFactors = {
    location: ninera.zonasDeTrabajo.includes(necesidad.zona),
    availability: availabilityCovers(necesidad.diasHorarios, ninera.disponibilidad),
    salaryOverlap: rangesOverlap(necesidad.pagoMin, necesidad.pagoMax, ninera.salarioMin, ninera.salarioMax),
    childAgeOverlap: hasIntersection(necesidad.children, ninera.experienciaEdades),
    experience: ninera.anosExperiencia >= MATCH_MIN_EXPERIENCE_YEARS,
  };

  const score =
    (factors.location ? MATCH_WEIGHT_LOCATION : 0) +
    (factors.availability ? MATCH_WEIGHT_AVAILABILITY : 0) +
    (factors.salaryOverlap ? MATCH_WEIGHT_SALARY_OVERLAP : 0) +
    (factors.childAgeOverlap ? MATCH_WEIGHT_CHILD_AGE_OVERLAP : 0) +
    (factors.experience ? MATCH_WEIGHT_EXPERIENCE : 0);

  return { score, factors, compatible: score >= MATCH_COMPATIBLE_THRESHOLD };
}
