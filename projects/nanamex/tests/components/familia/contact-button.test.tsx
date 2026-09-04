import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactButton } from "@/components/familia/contact-button";

const { createCheckoutSessionAction } = vi.hoisted(() => ({
  createCheckoutSessionAction: vi.fn(),
}));

vi.mock("@/actions/entitlements", () => ({ createCheckoutSessionAction }));

const props = { necesidadId: "necesidad-1", nineraId: "ninera-1" };

describe("ContactButton", () => {
  beforeEach(() => {
    createCheckoutSessionAction.mockReset();
  });

  it("shows a fixed-size spinner and accessible pending status while the action runs", async () => {
    let resolveAction!: (value: { status: string; message: string }) => void;
    createCheckoutSessionAction.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );

    render(<ContactButton {...props} variant="mobile" className="h-11 w-full" />);
    fireEvent.click(screen.getByRole("button", { name: "Contactar" }));

    const button = await screen.findByRole("button", { name: "Contactar, procesando" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("svg")).toHaveClass("animate-spin");
    expect(screen.getByRole("status")).toHaveTextContent("Procesando contacto…");

    resolveAction({ status: "error", message: "No se pudo iniciar el pago." });
  });

  it("raises mobile feedback above the sticky action bar and keeps desktop toast placement", async () => {
    createCheckoutSessionAction.mockResolvedValue({ status: "already_entitled", message: "Ya puedes contactar." });

    const { unmount } = render(<ContactButton {...props} variant="mobile" className="h-11 w-full" />);
    fireEvent.click(screen.getByRole("button", { name: "Contactar" }));
    const mobileToast = (await screen.findByText("Ya puedes contactar.")).parentElement;
    expect(mobileToast).not.toBeNull();
    expect(mobileToast!).toHaveClass("bottom-[calc(68px+1rem+env(safe-area-inset-bottom))]");
    expect(mobileToast!).toHaveClass("lg:bottom-4");

    unmount();
    render(<ContactButton {...props} className="h-11 w-full" />);
    fireEvent.click(screen.getByRole("button", { name: "Contactar" }));
    const desktopToast = (await screen.findByText("Ya puedes contactar.")).parentElement;
    expect(desktopToast!).toHaveClass("bottom-4");
    expect(desktopToast!).not.toHaveClass("bottom-[calc(68px+1rem+env(safe-area-inset-bottom))]");
  });
});
