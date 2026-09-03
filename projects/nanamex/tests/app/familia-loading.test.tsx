import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FamiliaHomeLoading from "@/app/familia/loading";

// FAM-02 loading state (design/UI-SYSTEM.md §5.10): skeleton cards matching the final
// dashboard's card-grid geometry, rendered via Next.js's `loading.tsx` route convention.
describe("FamiliaHomeLoading", () => {
  it("renders an aria-busy region with skeleton cards", () => {
    render(<FamiliaHomeLoading />);

    expect(screen.getByLabelText("Cargando tus necesidades")).toBeInTheDocument();
    expect(screen.getAllByTestId("necesidad-skeleton-card")).toHaveLength(4);
  });
});
