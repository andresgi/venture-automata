import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactButton } from "@/components/familia/contact-button";

const { createCheckoutSessionAction } = vi.hoisted(() => ({
  createCheckoutSessionAction: vi.fn(),
}));

vi.mock("@/actions/entitlements", () => ({ createCheckoutSessionAction }));

const props = {
  necesidadId: "necesidad-1",
  nineraId: "ninera-1",
  candidateNombre: "Ana",
  candidateFotoUrl: null,
  verificationStatus: "verificada" as const,
};

describe("ContactButton", () => {
  beforeEach(() => {
    createCheckoutSessionAction.mockReset();
  });

  it("opens the FAM-08 paywall gate instead of calling the checkout action directly", () => {
    render(<ContactButton {...props} variant="mobile" className="h-11 w-full" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Contactar" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(createCheckoutSessionAction).not.toHaveBeenCalled();
    expect(screen.getByText("MX$299 · Contacta candidatas durante 30 días")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("closes the gate via the Cancelar text link without calling the action", () => {
    render(<ContactButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Contactar" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(createCheckoutSessionAction).not.toHaveBeenCalled();
  });
});
