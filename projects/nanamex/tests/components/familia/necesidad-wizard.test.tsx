import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NecesidadWizard } from "@/components/familia/necesidad-wizard";

const saveDraft = vi.fn(async () => ({ status: "saved" as const, draftId: "draft-1" }));
vi.mock("@/actions/necesidad", () => ({ saveNecesidadDraftAction: (...args: unknown[]) => saveDraft(...args as []) }));
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => { saveDraft.mockClear(); push.mockClear(); vi.unstubAllGlobals(); Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: undefined }); });

describe("NecesidadWizard step 1", () => {
  it("renders age ranges without numeric or date inputs", () => {
    render(<NecesidadWizard zonas={[]} draft={{ children: ["0-1"] }} />);
    expect(screen.getByRole("heading", { name: "Niños" })).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(expect.arrayContaining(["0-1", "1-3", "3-6", "6-12", "12+"]));
    expect(document.querySelectorAll('input[type="number"], input[type="date"]').length).toBe(0);
  });

  it("keeps Siguiente disabled until every child has a selected range", () => {
    render(<NecesidadWizard zonas={[]} draft={{ children: ["" as "0-1"] }} />);
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("renders editable desktop sections and anchored rail", async () => {
    Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
    render(<NecesidadWizard zonas={[]} draft={{ children: ["0-1"] }} />);
    await waitFor(() => expect(screen.getByTestId("desktop-wizard-sections")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "1. Niños" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Zona" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Pago mínimo en MXN" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Otros" })).toBeInTheDocument();
  });

  it("keeps desktop child and responsibility semantics and rail edits local", async () => {
    Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
    render(<NecesidadWizard zonas={[]} draft={{ children: ["0-1"] }} />);
    await waitFor(() => expect(screen.getByTestId("desktop-wizard-sections")).toBeInTheDocument());

    expect(screen.getByText("Edad del niño 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar niño" }));
    expect(screen.getByText("Edad del niño 2")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "0-1" })).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: "Preparar alimentos" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Otros" })).toBeInTheDocument();

    const minPayment = screen.getByRole("spinbutton", { name: "Pago mínimo en MXN" });
    expect(minPayment).toHaveAttribute("min", "0");
    expect(screen.getByLabelText("Fecha de inicio")).toHaveAttribute("min", expect.any(String));
    fireEvent.change(screen.getByRole("textbox", { name: "Otros" }), { target: { value: "Mascotas" } });
    fireEvent.click(screen.getByRole("button", { name: "7. Responsabilidades" }));
    expect(saveDraft).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Otros" })).toHaveValue("Mascotas");
  });

  it("updates the desktop rail highlight from section visibility and uses Spanish modality labels", async () => {
    Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
    let observerCallback: IntersectionObserverCallback | undefined;
    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) { observerCallback = callback; }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    const { unmount } = render(<NecesidadWizard zonas={[]} draft={{ children: ["0-1"] }} />);
    await waitFor(() => expect(screen.getByTestId("desktop-wizard-sections")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Planta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrada por salida" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "entrada_salida" })).not.toBeInTheDocument();

    observerCallback?.([{ isIntersecting: true, intersectionRatio: 1, target: document.getElementById("step-4")! } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    await waitFor(() => expect(screen.getByRole("button", { name: "4. Modalidad" })).toHaveAttribute("aria-current", "step"));
    unmount();
  });

  it("shows the selected modalidad", async () => {
    render(<NecesidadWizard zonas={[]} draft={{ children: ["0-1"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "4. Modalidad" }));
    fireEvent.click(screen.getByRole("button", { name: "Planta" }));
    expect(screen.getByRole("button", { name: "Planta" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Planta" })).toHaveClass("bg-primary-50");
  });

  it("autosaves before navigating backward", async () => {
    render(<NecesidadWizard zonas={[]} draft={{ children: ["0-1"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Zona" })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Guardado")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("heading", { name: "Niños" })).toBeInTheDocument();
    expect(saveDraft).toHaveBeenCalledTimes(2);
  });

  it("saves before exiting and only navigates after success", async () => {
    render(<NecesidadWizard zonas={[]} draft={{ children: ["0-1"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar y salir" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/familia"));
    expect(saveDraft).toHaveBeenCalled();
  });
});
