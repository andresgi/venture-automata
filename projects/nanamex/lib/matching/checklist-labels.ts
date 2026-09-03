import type { MatchFactors } from "@/lib/matching/match-score";

/**
 * Translates `pipeline.match_checklist_snapshot` (raw `MatchFactors` keys, English/camelCase
 * -- see lib/matching/match-score.ts) into the plain-Spanish checklist lines FAM-04's
 * `MatchScore` compact density renders (design/UI-SYSTEM.md §4.3: "up to 3 checklist lines
 * ... plain text (e.g. 'Disponible L–V')"). Order mirrors the factors' own weight ordering
 * (highest-weighted first, see MATCH_WEIGHT_* in match-score.ts), so the 3-line cap always
 * surfaces the most heavily-weighted passing factors, not an arbitrary subset.
 */
const FACTOR_ORDER: (keyof MatchFactors)[] = [
  "location",
  "availability",
  "salaryOverlap",
  "childAgeOverlap",
  "experience",
];

const FACTOR_LABELS: Record<keyof MatchFactors, string> = {
  location: "Zona compatible con tu necesidad",
  availability: "Disponibilidad compatible",
  salaryOverlap: "Dentro de tu rango de pago",
  childAgeOverlap: "Experiencia con la edad de tus hijos",
  experience: "Cumple la experiencia mínima requerida",
};

/** Returns only the passed factors' labels, highest-weight first, capped at `max`. */
export function familiaChecklistLabels(checklist: Record<string, boolean>, max = 3): string[] {
  return FACTOR_ORDER.filter((factor) => checklist[factor] === true)
    .map((factor) => FACTOR_LABELS[factor])
    .slice(0, max);
}
