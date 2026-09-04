import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// FAM-02 dashboard ("Mis necesidades") + FAM-01 gate on /familia (E1-03/E2-03): a familia
// session with no perfil_familiar row yet is redirected to /familia/perfil before the
// dashboard renders. Same mocking pattern as tests/app/verificar.test.tsx /
// tests/app/familia-perfil.test.tsx.

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

// The rendered tree includes <UnauthorizedBanner /> (a client component using
// useSearchParams), so next/navigation needs both `redirect` and `useSearchParams` mocked --
// not just `redirect` alone.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    redirect: redirectMock,
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({ replace: vi.fn() }),
  };
});

let mockUser: { id: string } | null = { id: "user-1" };
const getUserMock = vi.fn(async () => ({ data: { user: mockUser } }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: getUserMock } })),
}));

type NecesidadFixture = {
  id: string;
  estado: "borrador" | "activa";
  modalidad: "planta" | "entrada_salida" | "ocasional";
  zonas: { alcaldia_municipio: string; colonia: string | null } | null;
  pipeline: { estado: string }[];
};

let mockPerfilFamiliar: { profile_id: string } | null = null;
let mockNecesidades: NecesidadFixture[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "necesidades") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockNecesidades })),
              })),
            })),
          })),
        };
      }
      if (table !== "perfil_familiar") throw new Error(`Unexpected table: ${table}`);
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: mockPerfilFamiliar })),
          })),
        })),
      };
    }),
  })),
}));

const { default: FamiliaHomePage } = await import("@/app/familia/page");

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  });
  mockUser = { id: "user-1" };
  mockPerfilFamiliar = null;
  mockNecesidades = [];
});

describe("FamiliaHomePage (FAM-02 dashboard, FAM-01 gate)", () => {
  it("redirects to /familia/perfil when no perfil_familiar row exists yet", async () => {
    mockPerfilFamiliar = null;

    await expect(FamiliaHomePage()).rejects.toThrow("REDIRECT:/familia/perfil");
  });

  it("renders the empty state when the family has zero necesidades", async () => {
    mockPerfilFamiliar = { profile_id: "user-1" };
    mockNecesidades = [];

    const jsx = await FamiliaHomePage();
    render(jsx);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Mis necesidades" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Encuentra a tu próxima niñera" })).toBeInTheDocument();
    expect(screen.getByText(/Cuéntanos qué necesitas/)).toBeInTheDocument();
    // The header's top "Crear necesidad" button and the empty state's own primary action
    // both exist -- two links, not one.
    expect(screen.getAllByRole("link", { name: "Crear necesidad" })).toHaveLength(2);
  });

  it("renders a card with the correct status chip, zona/modalidad, and resume link for a draft", async () => {
    mockPerfilFamiliar = { profile_id: "user-1" };
    mockNecesidades = [
      {
        id: "draft-1",
        estado: "borrador",
        modalidad: "planta",
        zonas: { alcaldia_municipio: "Monterrey", colonia: "Centro" },
        pipeline: [],
      },
    ];

    render(await FamiliaHomePage());

    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(screen.getByText("Centro, Monterrey")).toBeInTheDocument();
    expect(screen.getByText("Planta")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continuar borrador" })).toHaveAttribute(
      "href",
      "/familia/necesidad?draft=draft-1",
    );
    expect(screen.getByRole("link", { name: "Crear necesidad" })).toHaveAttribute("href", "/familia/necesidad");
    // Drafts have no pipeline yet -- no summary line should render for them.
    expect(screen.queryByText(/candidatas/)).not.toBeInTheDocument();
  });

  it("renders a mix of draft and active necesidades with correct actions and pipeline summaries", async () => {
    mockPerfilFamiliar = { profile_id: "user-1" };
    mockNecesidades = [
      {
        id: "activa-1",
        estado: "activa",
        modalidad: "entrada_salida",
        zonas: { alcaldia_municipio: "San Pedro", colonia: null },
        pipeline: [
          { estado: "nueva" },
          { estado: "nueva" },
          { estado: "entrevista" },
          { estado: "descartada" },
        ],
      },
      {
        id: "draft-2",
        estado: "borrador",
        modalidad: "ocasional",
        zonas: null,
        pipeline: [],
      },
    ];

    render(await FamiliaHomePage());

    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("San Pedro")).toBeInTheDocument();
    // Order follows the pipeline lifecycle (nueva -> entrevista -> descartada), only
    // non-zero counts included, singular/plural applied per count.
    expect(screen.getByText("2 nuevas · 1 en entrevista · 1 descartada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver candidatas" })).toHaveAttribute("href", "/familia/necesidad/activa-1");
    expect(screen.getByRole("link", { name: "Ver pipeline" })).toHaveAttribute("href", "/familia/necesidad/activa-1/pipeline");

    expect(screen.getByText("Zona sin especificar")).toBeInTheDocument();
    expect(screen.getByText("Ocasional")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continuar borrador" })).toHaveAttribute(
      "href",
      "/familia/necesidad?draft=draft-2",
    );
  });

  it("shows a fallback line for an active necesidad with zero pipeline rows", async () => {
    mockPerfilFamiliar = { profile_id: "user-1" };
    mockNecesidades = [
      {
        id: "activa-2",
        estado: "activa",
        modalidad: "planta",
        zonas: { alcaldia_municipio: "Monterrey", colonia: null },
        pipeline: [],
      },
    ];

    render(await FamiliaHomePage());

    expect(screen.getByText("Aún no hay candidatas para esta necesidad.")).toBeInTheDocument();
  });

  it("does not attempt the perfil_familiar check (and does not redirect) when there is no session", async () => {
    mockUser = null;

    const jsx = await FamiliaHomePage();
    render(jsx);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Mis necesidades" })).toBeInTheDocument();
  });
});
