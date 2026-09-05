import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PerfilNineraWizard } from "@/components/ninera/perfil-ninera-wizard";

const saveDraft = vi.fn(async () => ({ status: "saved" as const, perfilCompleto: false }));
vi.mock("@/actions/perfil-ninera", () => ({
  savePerfilNineraDraftAction: (...args: unknown[]) => saveDraft(...(args as [])),
  uploadPerfilFotoAction: vi.fn(async () => ({ status: "uploaded" as const, fotoUrl: "https://cdn.test/foto.jpg" })),
}));
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  saveDraft.mockClear();
  push.mockClear();
});

const zona = { id: "zona-1", alcaldiaMunicipio: "Centro", colonia: null };

describe("PerfilNineraWizard step 1", () => {
  it("keeps Siguiente disabled until a zona de trabajo is selected", () => {
    render(<PerfilNineraWizard zonas={[zona]} />);
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("enables Siguiente once a zona is selected and autosaves on navigation", async () => {
    render(<PerfilNineraWizard zonas={[zona]} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Centro" } });
    fireEvent.click(screen.getByRole("option", { name: "Centro" }));
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Disponibilidad y referencias" })).toBeInTheDocument());
  });

  it("increments/decrements años de experiencia with the numeric stepper", () => {
    render(<PerfilNineraWizard zonas={[zona]} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar año de experiencia" }));
    expect(screen.getByText("1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quitar año de experiencia" }));
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

describe("PerfilNineraWizard step 2", () => {
  async function goToStep2() {
    render(<PerfilNineraWizard zonas={[zona]} draft={{ zonaIds: [zona.id] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Disponibilidad y referencias" })).toBeInTheDocument());
  }

  it("keeps Finalizar disabled until every required paso 2 field is set", async () => {
    await goToStep2();
    expect(screen.getByRole("button", { name: "Finalizar" })).toBeDisabled();
  });

  it("shows the identity-upload prompt after a complete finish", async () => {
    render(
      <PerfilNineraWizard
        zonas={[zona]}
        draft={{
          zonaIds: [zona.id],
          disponibilidad: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }],
          modalidadesAceptadas: ["ocasional"],
          salarioMin: 4000,
          salarioMax: 6000,
          descripcion: "Cuidadora responsable.",
          experienciaEdades: ["0-1"],
        }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Finalizar" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Sube tu identificación" })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Subir ahora" })).toHaveAttribute("href", "/ninera/perfil/identificacion");
    fireEvent.click(screen.getByRole("button", { name: "Más tarde" }));
    expect(push).toHaveBeenCalledWith("/ninera");
  });

  it("adds and removes referencia rows", async () => {
    await goToStep2();
    expect(screen.queryByText("Quitar referencia")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar referencia" }));
    expect(screen.getByRole("button", { name: "Quitar referencia" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quitar referencia" }));
    expect(screen.queryByText("Quitar referencia")).not.toBeInTheDocument();
  });

  it("shows a running character-count helper for the descripción textarea", async () => {
    await goToStep2();
    const textarea = screen.getByRole("textbox", { name: "Descripción personal" });
    expect(screen.getByText("0/1000")).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: "Hola" } });
    expect(screen.getByText("4/1000")).toBeInTheDocument();
  });
});

describe("PerfilNineraWizard desktop shell", () => {
  afterEach(() => {
    Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: undefined });
  });

  function stubDesktop() {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
  }

  // Mirrors necesidad-wizard.test.tsx's IntersectionObserver stub -- jsdom never fires real
  // intersection callbacks, so the rail-highlight/step state needs to be driven manually to
  // exercise the step-2 section (and its action-bar label change to "Finalizar").
  function stubIntersectionObserver() {
    let observerCallback: IntersectionObserverCallback | undefined;
    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    return () =>
      observerCallback?.(
        [{ isIntersecting: true, intersectionRatio: 1, target: document.getElementById("step-2")! } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
  }

  it("renders an anchored side-rail with both sections and a static (non-sticky) action bar at desktop widths", async () => {
    stubDesktop();
    render(<PerfilNineraWizard zonas={[zona]} />);

    await waitFor(() => expect(screen.getByTestId("desktop-wizard-sections")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "1. Perfil y zona" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2. Disponibilidad y referencias" })).toBeInTheDocument();
    // Both sections' fields are present simultaneously on desktop (no per-step hiding).
    expect(screen.getByLabelText("Zona de trabajo")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Descripción personal" })).toBeInTheDocument();
    const actionBar = screen.getByRole("button", { name: "Siguiente" }).parentElement;
    expect(actionBar).toHaveClass("lg:static");
  });

  it("shows the identity-upload prompt attached inside the step-2 section on desktop, not as a separate screen", async () => {
    stubDesktop();
    const triggerStep2Visible = stubIntersectionObserver();
    render(
      <PerfilNineraWizard
        zonas={[zona]}
        draft={{
          zonaIds: [zona.id],
          disponibilidad: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }],
          modalidadesAceptadas: ["ocasional"],
          salarioMin: 4000,
          salarioMax: 6000,
          descripcion: "Cuidadora responsable.",
          experienciaEdades: ["0-1"],
        }}
      />
    );
    await waitFor(() => expect(screen.getByTestId("desktop-wizard-sections")).toBeInTheDocument());
    triggerStep2Visible();
    await waitFor(() => expect(screen.getByRole("button", { name: "Finalizar" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Sube tu identificación" })).toBeInTheDocument());
    // Still inside the same wizard shell -- the anchored rail remains present alongside the prompt.
    expect(screen.getByRole("button", { name: "2. Disponibilidad y referencias" })).toBeInTheDocument();
  });
});
