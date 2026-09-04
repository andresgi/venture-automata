import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MatchesLoading from "@/app/familia/necesidad/[id]/loading";
import CandidateProfileLoading from "@/app/familia/necesidad/[id]/candidatas/[ninId]/loading";

// FAM-04 loading state (design/UI-SYSTEM.md §5.10): skeleton cards matching the final
// candidate-card geometry, rendered via Next.js's `loading.tsx` route convention. This
// route-specific file also takes precedence over the parent `/familia/loading.tsx`
// fallback for this segment (see the file's own header comment).
describe("MatchesLoading", () => {
  it("renders an aria-busy region with 6 skeleton candidate cards", () => {
    render(<MatchesLoading />);

    expect(screen.getByLabelText("Cargando candidatas")).toBeInTheDocument();
    expect(screen.getAllByTestId("candidate-skeleton-card")).toHaveLength(6);
  });
});

describe("CandidateProfileLoading (FAM-06)", () => {
  it("renders one profile skeleton rather than candidate list cards", () => {
    render(<CandidateProfileLoading />);
    expect(screen.getByLabelText("Cargando perfil de candidata")).toBeInTheDocument();
    const photo = screen.getByTestId("candidate-detail-photo-skeleton");
    expect(photo).toBeInTheDocument();
    expect(photo.parentElement).toHaveClass("-mx-4", "sm:-mx-6", "lg:mx-0", "rounded-b-lg", "overflow-visible");
    expect(screen.getByTestId("candidate-detail-identity-overlay-skeleton")).toBeInTheDocument();
    expect(screen.getAllByTestId("candidate-detail-section-skeleton")).toHaveLength(6);
    expect(screen.queryByTestId("candidate-skeleton-card")).not.toBeInTheDocument();
  });

  it("keeps the identity column sticky on desktop while hiding the overlay identity slot there", () => {
    render(<CandidateProfileLoading />);

    const aside = screen.getByTestId("candidate-detail-photo-skeleton").closest("aside");
    expect(aside).toHaveClass("lg:sticky", "lg:top-8", "lg:self-start");
    expect(screen.getByTestId("candidate-detail-identity-overlay-skeleton")).toHaveClass("lg:hidden");
  });

  it("includes the mobile sticky action-bar composition while loading", () => {
    render(<CandidateProfileLoading />);
    expect(screen.getByTestId("candidate-mobile-actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Contactar (próximamente)" })).toBeDisabled();
  });
});
