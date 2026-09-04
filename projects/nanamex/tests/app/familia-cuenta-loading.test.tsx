import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FamiliaCuentaLoading from "@/app/familia/cuenta/loading";

describe("FamiliaCuentaLoading", () => {
  it("renders an accessible account-shaped busy region", () => {
    render(<FamiliaCuentaLoading />);
    expect(screen.getByLabelText("Cargando tu cuenta")).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByTestId("account-skeleton-section")).toHaveLength(4);
    expect(screen.queryByTestId("necesidad-skeleton-card")).not.toBeInTheDocument();
  });
});
