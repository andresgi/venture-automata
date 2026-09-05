import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); });
vi.mock("next/navigation", () => ({ redirect: redirectMock, useSearchParams: () => new URLSearchParams(), useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/ninera" }));

let user: { id: string } | null = { id: "ninera-1" };
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: vi.fn(async () => ({ data: { user } })) } })),
}));

let onboarded = true;
let profile: Record<string, unknown> | null = { nombre: "María" };
let perfil: Record<string, unknown> | null = {
  verification_status: "en_proceso", disponibilidad: [{ dia: "lun" }], salario_min: 3000, salario_max: 5000,
  modalidades_aceptadas: ["planta"], descripcion: "Con experiencia", perfil_completo: true,
};
let zonas: { zona_id: string }[] = [{ zona_id: "z1" }];
let edades: { rango_edad: string }[] = [{ rango_edad: "3-6" }];
let pipelineRows: Record<string, unknown>[] = [];
let analyticsRows: Record<string, unknown>[] = [];
let readError = false;
let authorized = true;

function response(table: string) {
  const value = table === "profiles" ? profile : table === "perfil_ninera" ? perfil : table === "ninera_zonas" ? zonas : table === "ninera_experiencia_edades" ? edades : table === "pipeline" ? pipelineRows : analyticsRows;
  const error = readError ? { message: "database unavailable", code: "XX000" } : null;
  const chain = { eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: value, error })), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: value, error }).then(resolve) };
  chain.eq.mockReturnValue(chain);
  return { select: vi.fn(() => chain) };
}
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({ from: vi.fn((table: string) => response(table)) })),
}));
vi.mock("@/lib/auth/ninera-onboarding", () => ({ getNineraOnboardingState: vi.fn(async () => ({ isNinera: authorized, isOnboarded: onboarded })) }));

const { default: NineraHomePage } = await import("@/app/ninera/page");
const { default: NineraOpportunitiesPage } = await import("@/app/ninera/oportunidades/page");
const { default: NineraHomeLoading } = await import("@/app/ninera/loading");
const { default: NineraError } = await import("@/app/ninera/error");

beforeEach(() => {
  vi.clearAllMocks(); user = { id: "ninera-1" }; onboarded = true; authorized = true; readError = false;
  profile = { nombre: "María" }; perfil = { verification_status: "en_proceso", disponibilidad: [{ dia: "lun" }], salario_min: 3000, salario_max: 5000, modalidades_aceptadas: ["planta"], descripcion: "Con experiencia" }; zonas = [{ zona_id: "z1" }]; edades = [{ rango_edad: "3-6" }]; pipelineRows = []; analyticsRows = [];
});

describe("NIN-03 dashboard", () => {
  it("redirects incomplete onboarding before reading dashboard data", async () => {
    onboarded = false;
    await expect(NineraHomePage()).rejects.toThrow("REDIRECT:/ninera/perfil");
  });

  it("denies non-niñera or inactive accounts before reading dashboard data", async () => {
    authorized = false;
    await expect(NineraHomePage()).rejects.toThrow("REDIRECT:/login");
  });

  it("fails closed when a dashboard read errors", async () => {
    readError = true;
    await expect(NineraHomePage()).rejects.toThrow("No pudimos cargar tu panel");
  });

  it("fails closed when a required profile row is missing", async () => {
    profile = null;
    await expect(NineraHomePage()).rejects.toThrow("No pudimos cargar tu perfil");
  });

  it.each([
    ["no_verificada", "No verificada", "Aún no has subido tu identificación"],
    ["en_proceso", "Verificación en proceso", "24–48 horas"],
    ["verificada", "Identidad verificada", "Tu identidad fue verificada"],
  ] as const)("renders honest %s verification state", async (status, label, copy) => {
    perfil = { verification_status: status, disponibilidad: [], salario_min: null, salario_max: null, modalidades_aceptadas: [], descripcion: "" };
    render(await NineraHomePage());
    expect(screen.getByRole("button", { name: new RegExp(label) })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Estado de verificación" })).getByText(copy === "24–48 horas" ? /Recibimos tu identificación/ : new RegExp(copy))).toBeInTheDocument();
  });

  it("renders completion progress and profile CTA when incomplete", async () => {
    perfil = { verification_status: "no_verificada", disponibilidad: [], salario_min: 0, salario_max: 0, modalidades_aceptadas: [], descripcion: "" };
    zonas = []; edades = [];
    render(await NineraHomePage());
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "17");
    expect(screen.getAllByRole("link", { name: "Completar perfil" })[0]).toHaveAttribute("href", "/ninera/perfil");
  });

  it("renders the truthful empty opportunities state with recovery links", async () => {
    render(await NineraHomePage());
    expect(screen.getByRole("heading", { name: "Oportunidades recientes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Aún no tienes oportunidades" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explorar vacantes" })).toHaveAttribute("href", "/ninera/oportunidades");
  });

  it("renders a populated pushed preview and its NIN-04 navigation", async () => {
    pipelineRows = [
      { id: "p1", source: "pushed", estado: "nueva", es_favorita: false, match_score_snapshot: 92, match_checklist_snapshot: { location: true }, necesidades: { id: "need-1", estado: "activa", updated_at: "2026-09-02T00:00:00Z", modalidad: "planta", pago_min: 3000, pago_max: 5000, fecha_inicio: "2026-10-01", zonas: { alcaldia_municipio: "Monterrey" } } },
      { id: "p2", source: "pushed", estado: "nueva", es_favorita: false, match_score_snapshot: 84, match_checklist_snapshot: { availability: true }, necesidades: { id: "need-2", estado: "activa", updated_at: "2026-09-01T00:00:00Z", modalidad: "planta", pago_min: 3000, pago_max: 5000, fecha_inicio: "2026-10-02", zonas: { alcaldia_municipio: "San Pedro" } } },
    ];
    render(await NineraHomePage());
    expect(screen.getByText("Familia en Monterrey")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todas" })).toHaveAttribute("href", "/ninera/oportunidades/recibidas");
    expect(screen.getByText("Familia en Monterrey").compareDocumentPosition(screen.getByText("Familia en San Pedro")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders the honest opportunities placeholder route", async () => {
    render(await NineraOpportunitiesPage());
    expect(screen.getByRole("heading", { name: "Explorar vacantes" })).toBeInTheDocument();
    expect(screen.getByText("Las vacantes abiertas aparecerán aquí")).toBeInTheDocument();
  });

  it("provides dashboard loading UI", () => {
    render(<NineraHomeLoading />);
    expect(screen.getByRole("main", { name: "Cargando tu panel" })).toHaveAttribute("aria-busy", "true");
  });

  it("provides a retryable read-error state", () => {
    render(<NineraError error={new Error("read failed")} reset={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Intentar de nuevo" })).toBeInTheDocument();
  });
});
