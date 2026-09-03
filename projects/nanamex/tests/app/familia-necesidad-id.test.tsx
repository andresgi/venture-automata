import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// FAM-04 "Listado de candidatas" (E4-01) -- default/empty/loading/error states, replacing
// E2-02's minimal placeholder. Same mocking pattern as tests/app/familia.test.tsx.

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: redirectMock, useRouter: vi.fn(() => ({ refresh: vi.fn() })) }));

let mockUser: { id: string } | null = { id: "family-1" };
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: mockUser } })) },
  })),
}));

let mockNecesidadResult: { data: unknown; error: unknown } = { data: null, error: null };
let mockNineraLiveResult: { data: unknown; error: unknown } = { data: [], error: null };

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "necesidades") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => mockNecesidadResult),
              })),
            })),
          })),
        };
      }
      if (table === "perfil_ninera") {
        const filtered = { eq: vi.fn() };
        filtered.eq
          .mockImplementationOnce(() => filtered)
          .mockImplementationOnce(() => filtered)
          .mockImplementationOnce(async () => mockNineraLiveResult);
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => filtered),
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  })),
}));

const { default: MatchesPage } = await import("@/app/familia/necesidad/[id]/page");

const baseNecesidad = {
  id: "necesidad-1",
  modalidad: "planta" as const,
  dias_horarios: [
    { dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" },
    { dia: "mie", hora_inicio: "09:00", hora_fin: "17:00" },
  ],
  pago_min: 4000,
  pago_max: 6000,
  zonas: { alcaldia_municipio: "Monterrey", colonia: "Centro" },
  estado: "activa",
};

function params(id = "necesidad-1") {
  return Promise.resolve({ id });
}

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  });
  mockUser = { id: "family-1" };
  mockNecesidadResult = { data: null, error: null };
  mockNineraLiveResult = { data: [], error: null };
});

describe("MatchesPage (FAM-04)", () => {
  it("redirects to /login when there is no session", async () => {
    mockUser = null;
    await expect(MatchesPage({ params: params() })).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /familia/necesidad when the necesidad does not exist or isn't this family's", async () => {
    mockNecesidadResult = { data: null, error: null };
    await expect(MatchesPage({ params: params() })).rejects.toThrow("REDIRECT:/familia/necesidad");
  });

  it("redirects to /familia/necesidad when the necesidad is not yet activa", async () => {
    mockNecesidadResult = { data: { ...baseNecesidad, estado: "borrador", pipeline: [] }, error: null };
    await expect(MatchesPage({ params: params() })).rejects.toThrow("REDIRECT:/familia/necesidad");
  });

  describe("error state", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("renders an inline retry banner (not a redirect) when the necesidad read fails", async () => {
      mockNecesidadResult = { data: null, error: { message: "boom" } };

      render(await MatchesPage({ params: params() }));

      expect(redirectMock).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar tu necesidad. Intenta de nuevo.");
      expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    });

    it("renders an inline retry banner when the live niñera verification-status read fails", async () => {
      mockNecesidadResult = {
        data: {
          ...baseNecesidad,
          pipeline: [{ id: "p1", ninera_id: "ninera-1", match_score_snapshot: 80, match_checklist_snapshot: { location: true } }],
        },
        error: null,
      };
      mockNineraLiveResult = { data: null, error: { message: "boom" } };

      render(await MatchesPage({ params: params() }));

      expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar las candidatas. Intenta de nuevo.");
      // The necesidad summary header still rendered -- only the candidate list failed.
      expect(screen.getByText(/Centro, Monterrey/)).toBeInTheDocument();
      expect(screen.queryByRole("article")).not.toBeInTheDocument();
    });
  });

  it("renders the full empty-state template when there are zero pipeline rows", async () => {
    mockNecesidadResult = { data: { ...baseNecesidad, pipeline: [] }, error: null };

    render(await MatchesPage({ params: params() }));

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Aún no encontramos candidatas para esta necesidad" })).toBeInTheDocument();
    expect(screen.getByText(/Intenta ampliar tu zona o tu rango de pago/)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: "Volver a mis necesidades" });
    expect(cta).toHaveAttribute("href", "/familia");
  });

  it("renders the collapsible necesidad-summary header and disabled Filtrar entry point", async () => {
    mockNecesidadResult = { data: { ...baseNecesidad, pipeline: [] }, error: null };

    render(await MatchesPage({ params: params() }));

    expect(screen.getByText(/Centro, Monterrey/)).toBeInTheDocument();
    expect(screen.getByText(/Planta/)).toBeInTheDocument();
    expect(screen.getByText(/Lun, Mié/)).toBeInTheDocument();
    const filtrar = screen.getByRole("button", { name: "Filtrar" });
    expect(filtrar).toBeDisabled();
  });

  it("renders ranked candidate cards (default state) with live TrustBadge status and Match Score", async () => {
    mockNecesidadResult = {
      data: {
        ...baseNecesidad,
        pipeline: [
          { id: "p1", ninera_id: "ninera-1", match_score_snapshot: 60, match_checklist_snapshot: { location: true, availability: true } },
          {
            id: "p2",
            ninera_id: "ninera-2",
            match_score_snapshot: 90,
            match_checklist_snapshot: { location: true, availability: true, salaryOverlap: true },
          },
        ],
      },
      error: null,
    };
    mockNineraLiveResult = {
      data: [
        { profile_id: "ninera-1", foto_url: null, verification_status: "no_verificada", profiles: { nombre: "Ana" } },
        { profile_id: "ninera-2", foto_url: null, verification_status: "verificada", profiles: { nombre: "Bere" } },
      ],
      error: null,
    };

    render(await MatchesPage({ params: params() }));

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    // Ranked by score descending: Bere (90%) before Ana (60%), regardless of pipeline
    // insertion order.
    expect(cards[0]).toHaveTextContent("Bere");
    expect(cards[0]).toHaveTextContent("90%");
    expect(cards[1]).toHaveTextContent("Ana");
    expect(cards[1]).toHaveTextContent("60%");

    // Live verification status drives the TrustBadge, not anything frozen on the pipeline
    // snapshot.
    expect(screen.getByRole("button", { name: /Identidad verificada/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /No verificada/ })).toBeInTheDocument();

    // Up to 3 checklist lines, translated to plain Spanish.
    expect(screen.getAllByText("Zona compatible con tu necesidad")).toHaveLength(2);
    expect(screen.getAllByText("Disponibilidad compatible")).toHaveLength(2);
    expect(screen.getAllByText("Dentro de tu rango de pago")).toHaveLength(1);
  });

  it("renders a retry state when a pipeline row has no matching live row", async () => {
    mockNecesidadResult = {
      data: {
        ...baseNecesidad,
        pipeline: [{ id: "p1", ninera_id: "ninera-orphan", match_score_snapshot: 70, match_checklist_snapshot: {} }],
      },
      error: null,
    };
    mockNineraLiveResult = { data: [], error: null };

    render(await MatchesPage({ params: params() }));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar las candidatas. Intenta de nuevo.");
  });
});
