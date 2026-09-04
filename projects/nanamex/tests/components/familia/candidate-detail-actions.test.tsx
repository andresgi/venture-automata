import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CandidateDetailActions } from "@/components/familia/candidate-detail-actions";

const props = {
  necesidadId: "necesidad-1",
  nineraId: "ninera-1",
  score: 80,
  checklist: { location: true },
  initialFavorite: false,
};

describe("CandidateDetailActions", () => {
  it("renders a functional favorite toggle and a functional contact action, desktop + mobile", () => {
    render(<CandidateDetailActions {...props} />);
    expect(screen.getByTestId("candidate-mobile-actions")).toBeInTheDocument();
    const favoriteButtons = screen.getAllByRole("button", { name: "Guardar favorita" });
    expect(favoriteButtons).toHaveLength(2);
    expect(favoriteButtons.every((button) => !button.hasAttribute("disabled"))).toBe(true);
    const contactButtons = screen.getAllByRole("button", { name: "Contactar" });
    expect(contactButtons).toHaveLength(2);
    expect(contactButtons.every((button) => !button.hasAttribute("disabled"))).toBe(true);
  });

  it("reflects an already-favorited state", () => {
    render(<CandidateDetailActions {...props} initialFavorite />);
    expect(screen.getAllByRole("button", { name: "Quitar de favoritas" })).toHaveLength(2);
  });
});
