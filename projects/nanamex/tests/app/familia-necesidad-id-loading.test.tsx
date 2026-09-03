import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MatchesLoading from "@/app/familia/necesidad/[id]/loading";

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
