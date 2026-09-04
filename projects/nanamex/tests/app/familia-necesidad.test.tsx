import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }), useRouter: () => ({ push: vi.fn() }) }));
const listZonasMock = vi.fn(async () => []);
const serviceTables: string[] = [];
vi.mock("@/lib/zonas/queries", () => ({ listZonas: listZonasMock }));
vi.mock("@/actions/necesidad", () => ({ saveNecesidadDraftAction: vi.fn() }));
vi.mock("@/lib/supabase/auth-server", () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "family-1" } } }) } }) }));
let onboarded = true;
vi.mock("@/lib/auth/familia-onboarding", () => ({
  getFamiliaOnboardingState: vi.fn(async () => ({
    isFamilia: true,
    isOnboarded: onboarded,
    profile: { role: "familia", account_status: "activa", email_verified: true, phone_verified: true },
  })),
}));
const draft = { id: "draft-2", zona_id: "z", dias_horarios: [{ dia: "mar", hora_inicio: "10:00", hora_fin: "12:00" }], modalidad: "ocasional", pago_min: 1, pago_max: 2, fecha_inicio: "2099-01-01", responsabilidades: ["Otros guardado"], necesidad_children: [{ rango_edad: "3-6" }] };
let mockDraftResult: unknown = null;
const profileQueryMock = vi.fn(async () => ({ data: { role: "familia" } }));
const draftQueryMock = vi.fn(async () => ({ data: mockDraftResult }));
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: () => ({ from: (table: string) => { serviceTables.push(table); return table === "profiles" ? { select: () => ({ eq: () => ({ maybeSingle: profileQueryMock }) }) } : { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: draftQueryMock }) }) }) }) }; } }) }));
const { default: NecesidadPage } = await import("@/app/familia/necesidad/page");

describe("FAM-03 route new/resume semantics", () => {
  beforeEach(() => { onboarded = true; mockDraftResult = null; listZonasMock.mockClear(); profileQueryMock.mockClear(); draftQueryMock.mockClear(); serviceTables.length = 0; });

  it("redirects incomplete families before reading zonas or destination data", async () => {
    onboarded = false;
    await expect(NecesidadPage({ searchParams: Promise.resolve({ draft: "draft-2" }) })).rejects.toThrow("REDIRECT:/familia/perfil");
    expect(listZonasMock).not.toHaveBeenCalled();
    expect(profileQueryMock).not.toHaveBeenCalled();
    expect(draftQueryMock).not.toHaveBeenCalled();
    expect(serviceTables).toEqual([]);
  });

  it("fresh route passes no draft data and does not query an arbitrary latest draft", async () => {
    const jsx = await NecesidadPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByRole("heading", { name: "Niños" })).toBeInTheDocument();
  });

  it("resume route loads only the selected draft query", async () => {
    mockDraftResult = draft;
    const jsx = await NecesidadPage({ searchParams: Promise.resolve({ draft: draft.id }) });
    render(jsx);
    expect(screen.getByRole("heading", { name: "Niños" })).toBeInTheDocument();
  });
});
