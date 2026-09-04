import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: redirectMock, useRouter: vi.fn(() => ({ refresh: vi.fn() })) }));

let authUser: { id: string } | null = { id: "family-1" };
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: authUser } })) },
  })),
}));

let profileRole: string | null = "familia";
let necesidadesResult: { data: unknown; error: unknown } = { data: [], error: null };
let candidatesResult: { data: unknown; error: unknown } = { data: [], error: null };

/** Minimal thenable query-builder mock: every chainable method (`select`/`eq`/`in`/
 * `order`) returns the same builder, and awaiting the builder at any point in the chain
 * (or calling `.maybeSingle()`) resolves with `result` -- mirroring supabase-js's real
 * query builder, which is itself thenable regardless of how many filters were chained. */
function queryBuilder(result: unknown) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    maybeSingle: async () => result,
    then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "profiles") return queryBuilder({ data: profileRole ? { role: profileRole } : null });
      if (table === "necesidades") return queryBuilder(necesidadesResult);
      if (table === "perfil_ninera") return queryBuilder(candidatesResult);
      throw new Error(`Unexpected table: ${table}`);
    }),
  })),
}));

const { default: FavoritasPage } = await import("@/app/familia/favoritas/page");

beforeEach(() => {
  vi.clearAllMocks();
  authUser = { id: "family-1" };
  profileRole = "familia";
  necesidadesResult = { data: [], error: null };
  candidatesResult = { data: [], error: null };
});

describe("FavoritasPage (FAM-07)", () => {
  it("redirects unauthenticated visitors to /login", async () => {
    authUser = null;
    await expect(FavoritasPage()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects non-familia roles to /familia", async () => {
    profileRole = "ninera";
    await expect(FavoritasPage()).rejects.toThrow("REDIRECT:/familia");
  });

  it("renders the empty state with a link to the first active necesidad when there are no favorites", async () => {
    necesidadesResult = {
      data: [{ id: "need-1", modalidad: "planta", estado: "activa", created_at: "2026-01-01", zonas: { alcaldia_municipio: "Monterrey", colonia: null }, pipeline: [] }],
      error: null,
    };
    render(await FavoritasPage());
    expect(screen.getByRole("heading", { name: "Aún no has guardado ninguna niñera" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver candidatas" })).toHaveAttribute("href", "/familia/necesidad/need-1");
  });

  it("falls back to the dashboard link when the family has no active necesidad at all", async () => {
    necesidadesResult = { data: [], error: null };
    render(await FavoritasPage());
    expect(screen.getByRole("link", { name: "Ver mis necesidades" })).toHaveAttribute("href", "/familia");
  });

  it("renders favorited candidates grouped by necesidad", async () => {
    necesidadesResult = {
      data: [
        {
          id: "need-1",
          modalidad: "planta",
          estado: "activa",
          created_at: "2026-01-01",
          zonas: { alcaldia_municipio: "Monterrey", colonia: null },
          pipeline: [
            { ninera_id: "ninera-1", match_score_snapshot: 80, match_checklist_snapshot: { location: true }, es_favorita: true },
            { ninera_id: "ninera-2", match_score_snapshot: 50, match_checklist_snapshot: {}, es_favorita: false },
          ],
        },
      ],
      error: null,
    };
    candidatesResult = {
      data: [{ profile_id: "ninera-1", foto_url: null, verification_status: "verificada", profiles: { nombre: "Ana García" } }],
      error: null,
    };
    render(await FavoritasPage());
    expect(screen.getByRole("heading", { name: "Favoritas" })).toBeInTheDocument();
    expect(screen.getByText("Monterrey · Planta")).toBeInTheDocument();
    expect(screen.getByText("Ana García")).toBeInTheDocument();
  });

  it("drops a favorite that is no longer a currently eligible candidate", async () => {
    necesidadesResult = {
      data: [
        {
          id: "need-1",
          modalidad: "planta",
          estado: "activa",
          created_at: "2026-01-01",
          zonas: { alcaldia_municipio: "Monterrey", colonia: null },
          pipeline: [{ ninera_id: "ninera-1", match_score_snapshot: 80, match_checklist_snapshot: {}, es_favorita: true }],
        },
      ],
      error: null,
    };
    candidatesResult = { data: [], error: null };
    render(await FavoritasPage());
    expect(screen.getByRole("heading", { name: "Aún no has guardado ninguna niñera" })).toBeInTheDocument();
  });

  it("renders a retry banner when reading necesidades fails", async () => {
    necesidadesResult = { data: null, error: { message: "boom" } };
    render(await FavoritasPage());
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar tus favoritas. Intenta de nuevo.");
  });

  it("still shows favorites saved under a closed necesidad, de-emphasized and without a working link", async () => {
    // screen-inventory.md's FAM-07 entry: saved niñeras "across all necesidades," not just
    // active ones -- a closed necesidad (`cerrada_contratada`/`cerrada_cancelada`) must not
    // make its favorites disappear (Code Review E4-04 Important Issue #2).
    necesidadesResult = {
      data: [
        {
          id: "need-closed",
          modalidad: "ocasional",
          estado: "cerrada_contratada",
          created_at: "2026-01-01",
          zonas: { alcaldia_municipio: "Guadalajara", colonia: null },
          pipeline: [{ ninera_id: "ninera-9", match_score_snapshot: 70, match_checklist_snapshot: {}, es_favorita: true }],
        },
      ],
      error: null,
    };
    candidatesResult = {
      data: [{ profile_id: "ninera-9", foto_url: null, verification_status: "verificada", profiles: { nombre: "Lupe Ríos" } }],
      error: null,
    };
    render(await FavoritasPage());
    expect(screen.getByText("Lupe Ríos")).toBeInTheDocument();
    expect(screen.getByText("Necesidad cerrada")).toBeInTheDocument();
    // FAM-04/FAM-06 both redirect away from a non-activa necesidad, so no live "Ver
    // candidatas" group link and no functional "Ver perfil"/"Guardar favorita" for this
    // candidate -- both fall back to their disabled placeholders.
    expect(screen.queryByRole("link", { name: "Ver candidatas" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver perfil" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Guardar favorita/ })).toBeDisabled();
  });

  it("only offers the first active necesidad (not a closed one) as the empty-state CTA target", async () => {
    necesidadesResult = {
      data: [
        { id: "need-closed", modalidad: "planta", estado: "cerrada_cancelada", created_at: "2026-01-01", zonas: { alcaldia_municipio: "CDMX", colonia: null }, pipeline: [] },
        { id: "need-active", modalidad: "planta", estado: "activa", created_at: "2026-01-02", zonas: { alcaldia_municipio: "Monterrey", colonia: null }, pipeline: [] },
      ],
      error: null,
    };
    render(await FavoritasPage());
    expect(screen.getByRole("link", { name: "Ver candidatas" })).toHaveAttribute("href", "/familia/necesidad/need-active");
  });
});
