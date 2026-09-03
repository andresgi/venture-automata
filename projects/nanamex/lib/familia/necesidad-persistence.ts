export function normalizeNecesidadPayload(payload: Record<string, unknown>) {
  const schedules = Array.isArray(payload.diasHorarios) ? payload.diasHorarios : undefined;
  return { ...payload, diasHorarios: schedules?.map((item) => { const schedule = item as Record<string, unknown>; return { dia: schedule.dia, hora_inicio: schedule.horaInicio, hora_fin: schedule.horaFin }; }) };
}
