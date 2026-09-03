import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** Shape the "Zona" autocomplete control (`components/familia/zona-autocomplete.tsx`)
 * needs — a trimmed-down projection of `engineering/database.md` §4's `zonas` table
 * (`lat`/`lng` are for a future map-pin display only, not needed by the list/filter UI
 * itself, so they're left out here). */
export interface ZonaOption {
  id: string;
  alcaldiaMunicipio: string;
  colonia: string | null;
}

/**
 * Fetches the full `zonas` reference table for the FAM-01 (this story) / FAM-03 (future,
 * Epic 2) "Zona" autocomplete control. The seeded table is small and static (36 rows for
 * the Monterrey launch city as of E0-03, `db/seed.sql`) — cheap to fetch in full once per
 * page render and filter client-side, rather than a debounced server-search round trip per
 * keystroke that a dataset this size doesn't need.
 */
export async function listZonas(): Promise<ZonaOption[]> {
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("zonas")
    .select("id, alcaldia_municipio, colonia")
    .order("alcaldia_municipio", { ascending: true })
    .order("colonia", { ascending: true, nullsFirst: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id as string,
    alcaldiaMunicipio: row.alcaldia_municipio as string,
    colonia: (row.colonia as string | null) ?? null,
  }));
}
