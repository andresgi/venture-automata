import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CandidateFiltersView, type CandidateFilterData } from "@/components/familia/candidate-filters";

const candidates: CandidateFilterData[] = [
  { ninera_id: "a", nombre: "Ana", fotoUrl: null, verificationStatus: "verificada", score: 90, checklist: [], zonas: ["Monterrey"], salarioMin: 4000, salarioMax: 6000, modalidades: ["planta"], disponibilidad: [{ dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" }] },
  { ninera_id: "b", nombre: "Berenice", fotoUrl: null, verificationStatus: "no_verificada", score: 80, checklist: [], zonas: ["San Pedro"], salarioMin: 7000, salarioMax: 9000, modalidades: ["ocasional"], disponibilidad: [{ dia: "sab", hora_inicio: "09:00", hora_fin: "17:00" }] },
];

beforeEach(() => { window.history.replaceState(null, "", "/familia/necesidad/1"); });

describe("CandidateFiltersView (FAM-05)", () => {
  it("filters candidates in place by pay range and preserves the URL state", () => {
    render(<CandidateFiltersView candidates={candidates} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Pago mínimo" }), { target: { value: "6500" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar filtros" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Berenice")).toBeInTheDocument();
    expect(window.location.search).toContain("pagoMin=6500");
  });

  it("opens as a mobile sheet and clears draft values before applying", () => {
    render(<CandidateFiltersView candidates={candidates} />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Limpiar" }));
    expect(within(screen.getByRole("dialog")).getByRole("spinbutton", { name: "Pago mínimo" })).toHaveValue(null);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar filtros" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ignores malformed URL filters and canonicalizes the URL", () => {
    window.history.replaceState(null, "", "/familia/necesidad/1?modalidad=unknown&pagoMin=abc&dias=wat,lun");
    render(<CandidateFiltersView candidates={candidates} />);

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(window.location.search).toBe("?dias=lun");
  });

  it("restores focus when the mobile sheet closes with Escape", () => {
    render(<CandidateFiltersView candidates={candidates} />);
    const trigger = screen.getByRole("button", { name: "Filtrar" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });
});
