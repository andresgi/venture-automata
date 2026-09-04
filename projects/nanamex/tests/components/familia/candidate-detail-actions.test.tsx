import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CandidateDetailActions } from "@/components/familia/candidate-detail-actions";

describe("CandidateDetailActions", () => {
  it("renders disabled mobile favorite and coming-soon contact actions", () => {
    render(<CandidateDetailActions />);
    expect(screen.getByTestId("candidate-mobile-actions")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Guardar favorita (próximamente)" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Guardar favorita (próximamente)" }).every((button) => button.hasAttribute("disabled"))).toBe(true);
    expect(screen.getByRole("button", { name: "Contactar (próximamente)" })).toBeDisabled();
    expect(screen.getByText("Próximamente")).toBeInTheDocument();
  });
});
