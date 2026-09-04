import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); });
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

let authUser: { id: string } | null = { id: "family-1" };
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: authUser } })) },
  })),
}));

let candidateResult: { data: unknown; error: unknown } = { data: null, error: null };
let rpcResult: { error: unknown } = { error: null };

function queryResult(table: string, selection: string) {
  if (table === "profiles") return { data: { role: "familia" }, error: null };
  if (selection.startsWith("id, zona_id")) {
    return {
      data: {
        id: "need-1", modalidad: "planta", dias_horarios: [{ dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" }],
        pago_min: 4000, pago_max: 6000, necesidad_children: [{ rango_edad: "1-3" }],
        zonas: { alcaldia_municipio: "Monterrey" }, pipeline: [],
      }, error: null,
    };
  }
  return candidateResult;
}

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn((selection: string) => {
        const result = queryResult(table, selection);
        const chain: Record<string, unknown> = {};
        chain.eq = vi.fn(() => chain);
        chain.maybeSingle = vi.fn(async () => result);
        return chain;
      }),
    })),
    rpc: vi.fn(async () => rpcResult),
  })),
}));

const { default: CandidateProfilePage } = await import("@/app/familia/necesidad/[id]/candidatas/[ninId]/page");

const params = Promise.resolve({ id: "need-1", ninId: "ninera-1" });

beforeEach(() => {
  vi.clearAllMocks();
  authUser = { id: "family-1" };
  candidateResult = { data: null, error: null };
  rpcResult = { error: null };
});

describe("CandidateProfilePage FAM-06 state distinction", () => {
  it("renders unavailable only when the candidate record is absent", async () => {
    render(await CandidateProfilePage({ params }));
    expect(screen.getByRole("heading", { name: "Esta candidata ya no está disponible" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("renders a retry-capable error when the candidate query fails", async () => {
    candidateResult = { data: null, error: { message: "database unavailable" } };
    render(await CandidateProfilePage({ params }));
    expect(screen.getByRole("heading", { name: "No se pudo cargar el perfil" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar este perfil. Intenta de nuevo.");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("renders a retry-capable error when recording the profile view fails", async () => {
    candidateResult = {
      data: {
        foto_url: null, anos_experiencia: 3, disponibilidad: [{ dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" }],
        salario_min: 4000, salario_max: 6000, modalidades_aceptadas: ["planta"], descripcion: "Experiencia.",
        verification_status: "no_verificada", ninera_experiencia_edades: [{ rango_edad: "1-3" }],
        ninera_zonas: [{ zonas: { alcaldia_municipio: "Monterrey" } }], referencias: [], profiles: { nombre: "Ana" },
      }, error: null,
    };
    rpcResult = { error: { message: "rpc unavailable" } };
    render(await CandidateProfilePage({ params }));
    expect(screen.getByRole("heading", { name: "No se pudo cargar el perfil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
