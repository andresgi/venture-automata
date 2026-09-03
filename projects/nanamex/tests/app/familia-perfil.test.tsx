import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// FAM-01 "Onboarding perfil familiar" (E1-03, design/UI-SPEC.md FAM-01). Exercises the real
// `/familia/perfil` Server Component end-to-end (session lookup -> profile/perfil_familiar
// lookup -> render), mocking only the Supabase-touching seams -- same pattern as
// tests/app/verificar.test.tsx.

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

let mockUser: { id: string } | null = { id: "user-1" };
const getUserMock = vi.fn(async () => ({ data: { user: mockUser } }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: getUserMock } })),
}));

let mockProfile: { nombre: string } | null = null;
let mockPerfilFamiliar: { zona_id: string } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: mockProfile })),
            })),
          })),
        };
      }
      if (table === "perfil_familiar") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: mockPerfilFamiliar })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  })),
}));

vi.mock("@/lib/zonas/queries", () => ({
  listZonas: vi.fn(async () => [
    { id: "zona-monterrey", alcaldiaMunicipio: "Monterrey", colonia: null },
    { id: "zona-centro", alcaldiaMunicipio: "Monterrey", colonia: "Centro" },
  ]),
}));

const { default: FamiliaPerfilPage } = await import("@/app/familia/perfil/page");

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  });
  mockUser = { id: "user-1" };
  mockProfile = null;
  mockPerfilFamiliar = null;
});

describe("FamiliaPerfilPage (FAM-01)", () => {
  it("redirects to /login with no session", async () => {
    mockUser = null;

    await expect(FamiliaPerfilPage()).rejects.toThrow("REDIRECT:/login");
  });

  it("renders the h1 and the form pre-filled with the existing nombre, no zona selected yet", async () => {
    mockProfile = { nombre: "Ana Test" };
    mockPerfilFamiliar = null;

    const jsx = await FamiliaPerfilPage();
    render(jsx);

    expect(
      screen.getByRole("heading", { level: 1, name: "Cuéntanos un poco de tu familia" })
    ).toBeInTheDocument();

    const nombreInput = screen.getByLabelText("Nombre") as HTMLInputElement;
    expect(nombreInput.value).toBe("Ana Test");

    const zonaInput = screen.getByRole("combobox", { name: "Zona" });
    expect(zonaInput).toHaveValue("");

    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
  });

  it("pre-fills the zona when a perfil_familiar row already exists (re-visiting to edit)", async () => {
    mockProfile = { nombre: "Ana Test" };
    mockPerfilFamiliar = { zona_id: "zona-centro" };

    const jsx = await FamiliaPerfilPage();
    render(jsx);

    const zonaInput = screen.getByRole("combobox", { name: "Zona" });
    expect(zonaInput).toHaveValue("Centro, Monterrey");
  });
});
