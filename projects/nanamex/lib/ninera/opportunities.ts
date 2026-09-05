import { scoreMatch, type MatchNecesidad, type MatchNinera } from "@/lib/matching/match-score";

export type OpportunityFactors = Record<string, boolean>;

export type OpportunityCardData = {
  id: string;
  zona: string;
  modalidad: string;
  pagoMin: number;
  pagoMax: number;
  fechaInicio: string;
  recency: string;
  score: number;
  factors: OpportunityFactors;
  pushed: boolean;
  diasHorarios: { dia: string; horaInicio: string; horaFin: string }[];
};

export type StoredNecesidadForMatching = {
  id: string;
  zona_id: string;
  dias_horarios: { dia: MatchNecesidad["diasHorarios"][number]["dia"]; hora_inicio: string; hora_fin: string }[];
  modalidad: MatchNecesidad["modalidad"];
  pago_min: number;
  pago_max: number;
  fecha_inicio: string;
  updated_at: string;
  zonas: { alcaldia_municipio: string } | { alcaldia_municipio: string }[] | null;
  necesidad_children: { rango_edad: MatchNecesidad["children"][number] }[];
};

export function toMatchNecesidad(row: StoredNecesidadForMatching): MatchNecesidad {
  const zona = Array.isArray(row.zonas) ? row.zonas[0]?.alcaldia_municipio : row.zonas?.alcaldia_municipio;
  return {
    zona: zona ?? "",
    modalidad: row.modalidad,
    pagoMin: row.pago_min,
    pagoMax: row.pago_max,
    children: row.necesidad_children.map((child) => child.rango_edad),
    diasHorarios: row.dias_horarios.map((item) => ({ dia: item.dia, horaInicio: item.hora_inicio, horaFin: item.hora_fin })),
  };
}

export function toMatchNinera(row: {
  zonas: { zonas: { alcaldia_municipio: string } | null }[] | null;
  disponibilidad: { dia: MatchNinera["disponibilidad"][number]["dia"]; hora_inicio: string; hora_fin: string }[] | null;
  modalidades_aceptadas: MatchNinera["modalidadesAceptadas"] | null;
  salario_min: number;
  salario_max: number;
  anos_experiencia: number;
  edades: { rango_edad: MatchNinera["experienciaEdades"][number] }[] | null;
}): MatchNinera {
  return {
    zonasDeTrabajo: (row.zonas ?? []).flatMap((item) => item.zonas ? [item.zonas.alcaldia_municipio] : []),
    disponibilidad: (row.disponibilidad ?? []).map((item) => ({ dia: item.dia, horaInicio: item.hora_inicio, horaFin: item.hora_fin })),
    modalidadesAceptadas: row.modalidades_aceptadas ?? [],
    salarioMin: Number(row.salario_min),
    salarioMax: Number(row.salario_max),
    anosExperiencia: Number(row.anos_experiencia),
    experienciaEdades: (row.edades ?? []).map((item) => item.rango_edad),
  };
}

const LABELS: Record<string, string> = {
  location: "Tu zona",
  availability: "Tu disponibilidad",
  salaryOverlap: "Dentro de tu expectativa salarial",
  childAgeOverlap: "Experiencia con las edades solicitadas",
  experience: "Experiencia suficiente",
};

const FACTOR_ORDER = ["location", "availability", "salaryOverlap", "childAgeOverlap", "experience"];

export function nineraChecklistLabels(factors: OpportunityFactors, max = 3): string[] {
  return FACTOR_ORDER.filter((factor) => factors[factor] === true).map((factor) => LABELS[factor]).slice(0, max);
}

export function scoreNecesidadForNinera(row: StoredNecesidadForMatching, ninera: MatchNinera): OpportunityCardData | null {
  const necesidad = toMatchNecesidad(row);
  const result = scoreMatch(necesidad, ninera);
  if (!result) return null;
  return {
    id: row.id,
    zona: necesidad.zona,
    modalidad: necesidad.modalidad,
    pagoMin: necesidad.pagoMin,
    pagoMax: necesidad.pagoMax,
    fechaInicio: row.fecha_inicio,
    recency: row.updated_at,
    score: result.score,
    factors: result.factors,
    pushed: false,
    diasHorarios: necesidad.diasHorarios.map((item) => ({ dia: item.dia, horaInicio: item.horaInicio, horaFin: item.horaFin })),
  };
}

export function matchesAvailabilityWindow(
  row: StoredNecesidadForMatching,
  ninera: MatchNinera,
  day: string,
  start: string,
  end: string,
): boolean {
  if (!day) return true;
  const requested = row.dias_horarios.filter((item) => item.dia === day);
  const offered = ninera.disponibilidad.filter((item) => item.dia === day);
  if (!requested.length || !offered.length) return false;
  if (!start || !end) return true;
  return requested.some((item) => item.hora_inicio <= start && item.hora_fin >= end) && offered.some((item) => item.horaInicio <= start && item.horaFin >= end);
}

export type OpportunityFilters = { zona: string; modalidad: string; minPay: number; maxPay: number; day: string; start: string; end: string };

export const EMPTY_OPPORTUNITY_FILTERS: OpportunityFilters = { zona: "", modalidad: "", minPay: 0, maxPay: 0, day: "", start: "", end: "" };

/**
 * Client-side counterpart of `matchesAvailabilityWindow` + the zona/modalidad/pay filters
 * applied server-side in `normalizeOpportunityFilters`'s query flow, operating on the
 * already-scored `OpportunityCardData` shape (via its `diasHorarios`) instead of raw
 * necesidad rows -- lets NIN-05 filter live, in the browser, the same way FAM-05's
 * `candidateMatchesFilters` does (`components/familia/candidate-filters.tsx`), rather than
 * requiring a page reload per filter change.
 */
export function opportunityMatchesFilters(
  item: OpportunityCardData,
  nineraDisponibilidad: readonly { dia: string; horaInicio: string; horaFin: string }[],
  filters: OpportunityFilters,
): boolean {
  if (filters.zona && item.zona !== filters.zona) return false;
  if (filters.modalidad && item.modalidad !== filters.modalidad) return false;
  if (filters.minPay > 0 && item.pagoMax < filters.minPay) return false;
  if (filters.maxPay > 0 && item.pagoMin > filters.maxPay) return false;
  if (filters.day) {
    const requested = item.diasHorarios.filter((entry) => entry.dia === filters.day);
    const offered = nineraDisponibilidad.filter((entry) => entry.dia === filters.day);
    if (!requested.length || !offered.length) return false;
    if (filters.start && filters.end) {
      const windowMatches =
        requested.some((entry) => entry.horaInicio <= filters.start && entry.horaFin >= filters.end) &&
        offered.some((entry) => entry.horaInicio <= filters.start && entry.horaFin >= filters.end);
      if (!windowMatches) return false;
    }
  }
  return true;
}

export function sortOpportunities<T extends Pick<OpportunityCardData, "score" | "recency" | "id">>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.score - a.score || b.recency.localeCompare(a.recency) || a.id.localeCompare(b.id));
}

export function normalizeOpportunityFilters(params: Record<string, string | string[] | undefined>) {
  const raw = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const day = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"].includes(raw("dia")) ? raw("dia") : "";
  const time = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : "";
  const start = time(raw("hora_desde"));
  const end = time(raw("hora_hasta"));
  const parseMoney = (value: string) => {
    if (value === "" || !/^\d+$/.test(value)) return 0;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : 0;
  };
  let minPay = parseMoney(raw("pago_min"));
  let maxPay = parseMoney(raw("pago_max"));
  if (minPay > 0 && maxPay > 0 && minPay > maxPay) { minPay = 0; maxPay = 0; }
  const validTimeRange = start && end && start < end;
  return { zona: raw("zona"), modalidad: ["planta", "entrada_salida", "ocasional"].includes(raw("modalidad")) ? raw("modalidad") : "", day, start: validTimeRange ? start : "", end: validTimeRange ? end : "", minPay, maxPay };
}
