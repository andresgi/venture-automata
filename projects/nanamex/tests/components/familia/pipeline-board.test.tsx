import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineBoard, type PipelineItem } from "@/components/familia/pipeline-board";

const advancePipelineStateAction = vi.fn();
vi.mock("@/actions/pipeline", () => ({ advancePipelineStateAction: (...args: unknown[]) => advancePipelineStateAction(...args) }));

const items: PipelineItem[] = [
  { id: "p-nueva", nineraId: "nin-1", estado: "nueva", nombre: "Ana", fotoUrl: null, updatedAt: new Date().toISOString() },
  { id: "p-contactada", nineraId: "nin-2", estado: "contactada", nombre: "Bea", fotoUrl: null, updatedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PipelineBoard", () => {
  it("renders desktop kanban columns for all five pipeline states with counts, no manual advance for Nueva", () => {
    render(<PipelineBoard necesidadId="need-1" initialItems={items} />);
    const kanban = screen.getByTestId("pipeline-kanban");
    for (const label of ["Nueva", "Contactada", "Entrevista", "Contratada", "Descartada"]) {
      expect(within(kanban).getByRole("heading", { name: label })).toBeInTheDocument();
    }
    // Nueva's card has "Descartar" but never a manual advance control -- its only forward
    // path is E5-04's paid confirm_contact flow, not this board.
    const nuevaCard = within(kanban).getByText("Ana").closest("article") as HTMLElement;
    expect(within(nuevaCard).queryByRole("button", { name: /entrevista agendada/i })).not.toBeInTheDocument();
    expect(within(nuevaCard).getByRole("button", { name: "Descartar" })).toBeInTheDocument();
    // Contactada's card does show the advance control.
    expect(within(kanban).getByRole("button", { name: "Marcar entrevista agendada" })).toBeInTheDocument();
  });

  it("shows the contactada onward advance control and calls the action with the forward target", async () => {
    advancePipelineStateAction.mockResolvedValue({ ok: true, estado: "entrevista" });
    render(<PipelineBoard necesidadId="need-1" initialItems={items} />);
    const kanban = screen.getByTestId("pipeline-kanban");
    fireEvent.click(within(kanban).getByRole("button", { name: "Marcar entrevista agendada" }));
    await waitFor(() => expect(advancePipelineStateAction).toHaveBeenCalledWith({ pipelineId: "p-contactada", newEstado: "entrevista" }));
    await waitFor(() => expect(screen.getByText("Marcada como Entrevista")).toBeInTheDocument());
  });

  it("discards a candidate from any state and surfaces a failure toast on error", async () => {
    advancePipelineStateAction.mockResolvedValue({ ok: false, message: "No se pudo actualizar el estado. Intenta de nuevo." });
    render(<PipelineBoard necesidadId="need-1" initialItems={items} />);
    const kanban = screen.getByTestId("pipeline-kanban");
    const discardButtons = within(kanban).getAllByRole("button", { name: "Descartar" });
    fireEvent.click(discardButtons[0]);
    await waitFor(() => expect(advancePipelineStateAction).toHaveBeenCalledWith({ pipelineId: "p-nueva", newEstado: "descartada" }));
    await waitFor(() => expect(screen.getByText("No se pudo actualizar el estado. Intenta de nuevo.")).toBeInTheDocument());
  });

  it("renders mobile segmented control tabs with days-in-state rows", () => {
    render(<PipelineBoard necesidadId="need-1" initialItems={items} />);
    const tablist = screen.getByRole("tablist", { name: "Estado del pipeline" });
    expect(within(tablist).getByRole("tab", { name: "Contactada (1)" })).toBeInTheDocument();
    fireEvent.click(within(tablist).getByRole("tab", { name: "Contactada (1)" }));
    expect(screen.getByText("2 días en este estado")).toBeInTheDocument();
    expect(screen.getAllByText("Ver perfil").length).toBeGreaterThan(0);
  });
});
