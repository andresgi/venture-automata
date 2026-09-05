import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { OpportunityFiltersView } from "@/components/ninera/opportunity-filters";
import type { OpportunityCardData } from "@/lib/ninera/opportunities";

const opportunities: OpportunityCardData[] = [
  { id: "a", zona: "Monterrey", modalidad: "planta", pagoMin: 4000, pagoMax: 6000, fechaInicio: "2026-10-01", recency: "2026-09-01", score: 90, factors: {}, pushed: false, diasHorarios: [{ dia: "lun", horaInicio: "09:00", horaFin: "17:00" }] },
  { id: "b", zona: "San Pedro", modalidad: "ocasional", pagoMin: 7000, pagoMax: 9000, fechaInicio: "2026-10-02", recency: "2026-09-02", score: 80, factors: {}, pushed: false, diasHorarios: [{ dia: "sab", horaInicio: "09:00", horaFin: "17:00" }] },
];
const disponibilidad = [{ dia: "lun", horaInicio: "08:00", horaFin: "18:00" }, { dia: "sab", horaInicio: "08:00", horaFin: "18:00" }];

beforeEach(() => { window.history.replaceState(null, "", "/ninera/oportunidades"); });

describe("OpportunityFiltersView (NIN-05)", () => {
  it("applies desktop filters live, without a submit step", () => {
    render(<OpportunityFiltersView opportunities={opportunities} nineraDisponibilidad={disponibilidad} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    const aside = screen.getByRole("complementary", { name: "Filtros de vacantes" });
    fireEvent.change(within(aside).getByRole("spinbutton", { name: "Pago mínimo" }), { target: { value: "6500" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Familia en San Pedro")).toBeInTheDocument();
  });

  it("clears filters via the desktop Limpiar action", () => {
    render(<OpportunityFiltersView opportunities={opportunities} nineraDisponibilidad={disponibilidad} />);
    const aside = screen.getByRole("complementary", { name: "Filtros de vacantes" });
    fireEvent.change(within(aside).getByLabelText("Zona"), { target: { value: "Monterrey" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(within(aside).getByRole("button", { name: "Limpiar" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("opens the mobile sheet as an accessible dialog with a sticky footer and drag handle", () => {
    render(<OpportunityFiltersView opportunities={opportunities} nineraDisponibilidad={disponibilidad} />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar vacantes" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const footer = dialog.querySelector("footer");
    expect(footer).toHaveClass("sticky");
    expect(dialog.querySelector(".rounded-full.bg-border-strong")).toBeInTheDocument();
  });

  it("mobile sheet requires an explicit Aplicar filtros step (draft does not affect results until applied)", () => {
    render(<OpportunityFiltersView opportunities={opportunities} nineraDisponibilidad={disponibilidad} />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar vacantes" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Zona"), { target: { value: "Monterrey" } });
    expect(screen.getAllByRole("article")).toHaveLength(2);
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar filtros" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("restores focus to the trigger when the mobile sheet closes with Escape", () => {
    render(<OpportunityFiltersView opportunities={opportunities} nineraDisponibilidad={disponibilidad} />);
    const trigger = screen.getByRole("button", { name: "Filtrar vacantes" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("shows the base empty state (no vacantes at all) pointing to received opportunities", () => {
    render(<OpportunityFiltersView opportunities={[]} nineraDisponibilidad={disponibilidad} />);
    expect(screen.getByRole("heading", { name: "Aún no hay vacantes abiertas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver oportunidades recibidas" })).toHaveAttribute("href", "/ninera/oportunidades/recibidas");
  });

  it("shows the filtered no-results empty state with a Limpiar filtros action that restores results", () => {
    render(<OpportunityFiltersView opportunities={opportunities} nineraDisponibilidad={disponibilidad} />);
    const aside = screen.getByRole("complementary", { name: "Filtros de vacantes" });
    fireEvent.change(within(aside).getByLabelText("Zona"), { target: { value: "Nowhere" } });
    expect(screen.getByRole("heading", { name: "No encontramos vacantes con estos filtros" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("filters by availability day and time window against the niñera's own disponibilidad", () => {
    render(<OpportunityFiltersView opportunities={opportunities} nineraDisponibilidad={disponibilidad} />);
    const aside = screen.getByRole("complementary", { name: "Filtros de vacantes" });
    fireEvent.change(within(aside).getByLabelText("Día"), { target: { value: "dom" } });
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});
