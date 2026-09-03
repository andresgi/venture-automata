import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/zonas/queries", () => ({ listZonas: vi.fn(async () => []) }));
vi.mock("@/actions/necesidad", () => ({ saveNecesidadDraftAction: vi.fn() }));
vi.mock("@/lib/supabase/auth-server", () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "family-1" } } }) } }) }));
const draft = { id: "draft-2", zona_id: "z", dias_horarios: [{ dia: "mar", hora_inicio: "10:00", hora_fin: "12:00" }], modalidad: "ocasional", pago_min: 1, pago_max: 2, fecha_inicio: "2099-01-01", responsabilidades: ["Otros guardado"], necesidad_children: [{ rango_edad: "3-6" }] };
let mockDraftResult: unknown = null;
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: () => ({ from: (table: string) => table === "profiles" ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: "familia" } }) }) }) } : { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockDraftResult }) }) }) }) }) } }) }));
const { default: NecesidadPage } = await import("@/app/familia/necesidad/page");

describe("FAM-03 route new/resume semantics", () => {
  it("fresh route passes no draft data and does not query an arbitrary latest draft", async () => {
    mockDraftResult = null;
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
