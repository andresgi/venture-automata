import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// FAM-11 "Estado de candidatas" (E6-01). Same mocking pattern as
// tests/app/familia-necesidad-id.test.tsx (FAM-04).

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

let onboarded = true;
let isFamilia = true;
vi.mock("@/lib/auth/familia-onboarding", () => ({
  getFamiliaOnboardingState: vi.fn(async () => ({
    isFamilia,
    isOnboarded: onboarded,
    profile: { role: "familia", account_status: "activa", email_verified: true, phone_verified: true },
  })),
}));

vi.mock("@/components/familia/pipeline-board", () => ({
  PipelineBoard: ({ necesidadId, initialItems }: { necesidadId: string; initialItems: unknown[] }) => (
    <div data-testid="pipeline-board" data-necesidad-id={necesidadId} data-item-count={initialItems.length} />
  ),
}));

let mockNecesidadResult: { data: unknown; error: unknown } = { data: null, error: null };
let mockNineraLiveResult: { data: unknown; error: unknown } = { data: [], error: null };
const databaseReads: string[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      databaseReads.push(table);
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
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => mockNineraLiveResult),
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  })),
}));

const { default: PipelinePage } = await import("@/app/familia/necesidad/[id]/pipeline/page");

function params(id = "necesidad-1") {
  return Promise.resolve({ id });
}

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  });
  mockUser = { id: "family-1" };
  onboarded = true;
  isFamilia = true;
  mockNecesidadResult = { data: null, error: null };
  mockNineraLiveResult = { data: [], error: null };
  databaseReads.length = 0;
});

describe("PipelinePage (FAM-11)", () => {
  it("redirects to /login when there is no session", async () => {
    mockUser = null;
    await expect(PipelinePage({ params: params() })).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects non-familia sessions", async () => {
    isFamilia = false;
    await expect(PipelinePage({ params: params() })).rejects.toThrow("REDIRECT:/familia");
  });

  it("redirects incomplete onboarding to /familia/perfil", async () => {
    onboarded = false;
    await expect(PipelinePage({ params: params() })).rejects.toThrow("REDIRECT:/familia/perfil");
  });

  it("redirects to the necesidades list when the necesidad is not owned/found", async () => {
    mockNecesidadResult = { data: null, error: null };
    await expect(PipelinePage({ params: params() })).rejects.toThrow("REDIRECT:/familia/necesidad");
  });

  it("shows a retry banner on a necesidad read error", async () => {
    mockNecesidadResult = { data: null, error: { message: "boom" } };
    render(await PipelinePage({ params: params() }));
    expect(screen.getByText("No se pudo cargar el pipeline. Intenta de nuevo.")).toBeInTheDocument();
  });

  it("renders the empty state pointing back to FAM-04 when there is no pipeline record yet", async () => {
    mockNecesidadResult = { data: { id: "necesidad-1", estado: "activa", pipeline: [] }, error: null };
    render(await PipelinePage({ params: params() }));
    expect(screen.getByRole("heading", { name: "Aún no hay candidatas en tu pipeline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver candidatas" })).toHaveAttribute("href", "/familia/necesidad/necesidad-1");
    expect(screen.queryByTestId("pipeline-board")).not.toBeInTheDocument();
  });

  it("renders the board with merged candidate profile data for each pipeline row", async () => {
    mockNecesidadResult = {
      data: {
        id: "necesidad-1",
        estado: "activa",
        pipeline: [
          { id: "p-1", ninera_id: "nin-1", estado: "nueva", updated_at: "2026-09-01T00:00:00Z" },
          { id: "p-2", ninera_id: "nin-2", estado: "contactada", updated_at: "2026-09-02T00:00:00Z" },
        ],
      },
      error: null,
    };
    mockNineraLiveResult = {
      data: [
        { profile_id: "nin-1", foto_url: null, profiles: { nombre: "Ana" } },
        { profile_id: "nin-2", foto_url: "https://example.com/b.jpg", profiles: [{ nombre: "Bea" }] },
      ],
      error: null,
    };
    render(await PipelinePage({ params: params() }));
    const board = screen.getByTestId("pipeline-board");
    expect(board).toHaveAttribute("data-necesidad-id", "necesidad-1");
    expect(board).toHaveAttribute("data-item-count", "2");
  });

  it("shows a retry banner when the live candidate profile read fails", async () => {
    mockNecesidadResult = {
      data: { id: "necesidad-1", estado: "activa", pipeline: [{ id: "p-1", ninera_id: "nin-1", estado: "nueva", updated_at: "2026-09-01T00:00:00Z" }] },
      error: null,
    };
    mockNineraLiveResult = { data: null, error: { message: "boom" } };
    render(await PipelinePage({ params: params() }));
    expect(screen.getByText("No se pudieron cargar las candidatas del pipeline. Intenta de nuevo.")).toBeInTheDocument();
  });
});
