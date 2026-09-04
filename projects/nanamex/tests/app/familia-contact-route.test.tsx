import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); });
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
const authUser = { id: "family-1" };
vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: vi.fn(async () => ({ data: { user: authUser } })) } })),
}));
const onboarding = { isFamilia: true, isOnboarded: true, profile: { email_verified: true, phone_verified: true } };
vi.mock("@/lib/auth/familia-onboarding", () => ({ getFamiliaOnboardingState: vi.fn(async () => onboarding) }));
let checkoutState: { status: "ready" | "pending" | "stale" | "unverified" | "error" } = { status: "pending" };
vi.mock("@/actions/entitlements", () => ({
  getCheckoutReturnStateAction: vi.fn(async () => checkoutState),
}));
vi.mock("@/components/familia/contact-request-form", () => ({
  ContactRequestForm: (props: { initialPhone?: string }) => <div data-testid="contact-form" data-phone={props.initialPhone ?? "absent"} />,
}));

let entitlement: unknown = { id: "entitlement-1" };
let pipeline: unknown = { estado: "contactada", contacto: { pipeline_id: "pipeline-1" } };
let candidateAvailable = true;
const reads: string[] = [];
const filters: Array<[string, string, unknown]> = [];
function query(table: string) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain), eq: vi.fn((field: string, value: unknown) => { filters.push([table, field, value]); return chain; }), gt: vi.fn(() => chain), order: vi.fn(() => chain), limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => {
      reads.push(table);
      if (table === "necesidades") return { data: { id: "need-1" }, error: null };
      if (table === "entitlements") return { data: entitlement, error: null };
      if (table === "pipeline") return { data: pipeline, error: null };
      if (table === "profiles") {
        const relation = (pipeline as { contacto?: unknown }).contacto;
        const established = Array.isArray(relation) ? relation.length > 0 : Boolean(relation);
        return { data: established || candidateAvailable ? { nombre: "Ana", phone: "+5215550001" } : null, error: null };
      }
      return { data: null, error: null };
    }),
  };
  return chain;
}
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: vi.fn(() => ({ from: (table: string) => query(table) })) }));

const { default: ContactPage } = await import("@/app/familia/necesidad/[id]/candidatas/[ninId]/contactar/page");
const params = Promise.resolve({ id: "need-1", ninId: "ninera-1" });

beforeEach(() => {
  vi.clearAllMocks(); reads.length = 0; filters.length = 0; candidateAvailable = true;
  onboarding.isFamilia = true; onboarding.isOnboarded = true; onboarding.profile.email_verified = true; onboarding.profile.phone_verified = true;
  entitlement = { id: "entitlement-1" }; pipeline = { estado: "contactada", contacto: { pipeline_id: "pipeline-1" } };
  checkoutState = { status: "pending" };
});

describe("FAM-10 route authorization and disclosure boundary", () => {
  it.each([
    ["non-familia", () => { onboarding.isFamilia = false; }, "/familia"],
    ["incomplete onboarding", () => { onboarding.isOnboarded = false; }, "/familia/perfil"],
    ["unverified contact channel", () => { onboarding.profile.phone_verified = false; }, "/verificar"],
  ])("redirects %s before data reads", async (_label, change, destination) => {
    change();
    await expect(ContactPage({ params })).rejects.toThrow(`REDIRECT:${destination}`);
    expect(reads).toEqual([]);
  });

  it("routes direct non-entitled access through FAM-08 marker before candidate reads", async () => {
    entitlement = null;
    pipeline = { estado: "nueva", contacto: [] };
    await expect(ContactPage({ params })).rejects.toThrow("REDIRECT:/familia/necesidad/need-1/candidatas/ninera-1?contactar=1");
    expect(reads).toEqual(["necesidades", "pipeline", "profiles", "entitlements"]);
  });

  it("keeps a successful return in a pending payment state while the webhook is delayed", async () => {
    entitlement = null;
    pipeline = { estado: "nueva", contacto: [] };
    const page = await ContactPage({ params, searchParams: Promise.resolve({ checkout: "success" }) });
    expect(page.props).toEqual({ necesidadId: "need-1", nineraId: "ninera-1" });
  });

  it("routes a stale successful return back to the new-contact paywall path", async () => {
    entitlement = null;
    pipeline = { estado: "nueva", contacto: [] };
    checkoutState = { status: "stale" };
    await expect(ContactPage({ params, searchParams: Promise.resolve({ checkout: "success" }) })).rejects.toThrow(
      "REDIRECT:/familia/necesidad/need-1/candidatas/ninera-1?contactar=1",
    );
  });

  it("keeps an established contact viewable after entitlement expiry", async () => {
    entitlement = null;
    const page = await ContactPage({ params });
    expect(page.props.children[5].props.initialPhone).toBe("+5215550001");
    expect(reads).not.toContain("entitlements");
  });

  it.each(["entrevista", "contratada", "descartada"])("keeps an established contact viewable in %s", async (estado) => {
    entitlement = null;
    pipeline = { estado, contacto: { pipeline_id: "pipeline-1" } };
    const page = await ContactPage({ params });
    expect(page.props.children[5].props.initialPhone).toBe("+5215550001");
    expect(reads).not.toContain("entitlements");
  });

  it("keeps an established contact viewable when the candidate is no longer discoverable", async () => {
    entitlement = null;
    candidateAvailable = false;
    const page = await ContactPage({ params });
    expect(page.props.children[5].props.initialPhone).toBe("+5215550001");
    expect(reads).not.toContain("entitlements");
  });

  it("does not render FAM-10 for an unavailable candidate", async () => {
    candidateAvailable = false;
    pipeline = { estado: "nueva", contacto: [] };
    await expect(ContactPage({ params })).rejects.toThrow("REDIRECT:/familia/necesidad/need-1");
    expect(filters).toEqual(expect.arrayContaining([
      ["profiles", "role", "ninera"],
      ["profiles", "account_status", "activa"],
      ["profiles", "perfil_ninera.publicado", true],
      ["profiles", "perfil_ninera.perfil_completo", true],
    ]));
  });

  it("does not pass phone before a positively established contacto relation", async () => {
    pipeline = { estado: "contactada", contacto: [] };
    const page = await ContactPage({ params });
    expect(page.props.children[5].props.initialPhone).toBeNull();
    expect(reads.filter((table) => table === "profiles")).toHaveLength(1);
  });

  it("passes phone for object and array-shaped established contacto relations", async () => {
    for (const relation of [{ pipeline_id: "pipeline-1" }, [{ pipeline_id: "pipeline-1" }]]) {
      pipeline = { estado: "contactada", contacto: relation };
      const page = await ContactPage({ params });
    expect(page.props.children[5].props.initialPhone).toBe("+5215550001");
    expect(page.props.children[5].props.initialContactEstablished).toBe(true);
    }
  });
});
