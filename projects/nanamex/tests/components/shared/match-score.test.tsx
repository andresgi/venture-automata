import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MatchScoreCompact } from "@/components/shared/match-score";

describe("MatchScoreCompact", () => {
  it("renders the numeral and up to 3 checklist lines", () => {
    render(<MatchScoreCompact score={92} checklist={["Zona compatible", "Disponibilidad compatible", "Dentro de tu rango de pago"]} />);

    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("compatible")).toBeInTheDocument();
    expect(screen.getByText("Zona compatible")).toBeInTheDocument();
    expect(screen.getByText("Disponibilidad compatible")).toBeInTheDocument();
    expect(screen.getByText("Dentro de tu rango de pago")).toBeInTheDocument();
  });

  it("renders no checklist list element when the checklist is empty", () => {
    render(<MatchScoreCompact score={20} checklist={[]} />);

    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders low scores identically (no visual demotion) -- numeral is the only signal", () => {
    render(<MatchScoreCompact score={35} checklist={[]} />);
    const numeral = screen.getByText("35%");
    expect(numeral.className).toContain("text-primary-600");
    expect(numeral.className).toContain("text-numeral-lg");
  });
});
