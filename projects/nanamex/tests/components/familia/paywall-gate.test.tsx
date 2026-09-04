import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaywallGate } from "@/components/familia/paywall-gate";

const { createCheckoutSessionAction } = vi.hoisted(() => ({
  createCheckoutSessionAction: vi.fn(),
}));

vi.mock("@/actions/entitlements", () => ({ createCheckoutSessionAction }));

const props = {
  open: true,
  onClose: vi.fn(),
  necesidadId: "necesidad-1",
  nineraId: "ninera-1",
  candidateNombre: "Ana",
  candidateFotoUrl: null,
  verificationStatus: "verificada" as const,
};

describe("PaywallGate", () => {
  beforeEach(() => {
    createCheckoutSessionAction.mockReset();
    props.onClose.mockReset();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, href: "" },
    });
  });

  it("renders nothing when closed", () => {
    render(<PaywallGate {...props} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders FAM-08's offer content, candidate context, and generic offer copy", () => {
    render(<PaywallGate {...props} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("MX$299 · Contacta candidatas durante 30 días")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar a pago" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("Cerrar (X) and Cancelar both dismiss the gate", () => {
    const { unmount } = render(<PaywallGate {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    unmount();

    props.onClose.mockReset();
    render(<PaywallGate {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("advances to FAM-09's checkout step on a successful entitlement check, without losing the surrounding shell", async () => {
    createCheckoutSessionAction.mockResolvedValue({
      status: "checkout_created",
      checkoutUrl: "https://checkout.stripe.com/session-1",
    });

    render(<PaywallGate {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar a pago" }));

    await waitFor(() => expect(screen.getByText("Confirmación de pago")).toBeInTheDocument());
    expect(screen.getByText("MX$299")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar pago" })).toBeInTheDocument();
    // Same dialog/takeover shell -- never unmounts between FAM-08 and FAM-09.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows an inline error banner without losing place when the entitlement check fails", async () => {
    createCheckoutSessionAction.mockResolvedValue({ status: "error", message: "No se pudo iniciar el pago." });

    render(<PaywallGate {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar a pago" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No se pudo iniciar el pago."));
    // Stays on FAM-08.
    expect(screen.getByText("MX$299 · Contacta candidatas durante 30 días")).toBeInTheDocument();
  });

  it("blocks close/cancel while the entitlement check is pending (non-dismissible during processing)", async () => {
    let resolveAction!: (value: { status: string; checkoutUrl?: string; message?: string }) => void;
    createCheckoutSessionAction.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );

    render(<PaywallGate {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar a pago" }));

    expect(screen.getByRole("button", { name: "Cerrar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    resolveAction({ status: "error", message: "No se pudo iniciar el pago." });
    await waitFor(() => expect(screen.getByRole("button", { name: "Cerrar" })).not.toBeDisabled());
  });

  it("redirects to Stripe's checkout URL and becomes non-dismissible on Confirmar pago", async () => {
    createCheckoutSessionAction.mockResolvedValue({
      status: "checkout_created",
      checkoutUrl: "https://checkout.stripe.com/session-1",
    });

    render(<PaywallGate {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar a pago" }));
    await waitFor(() => screen.getByRole("button", { name: "Confirmar pago" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));

    expect(window.location.href).toBe("https://checkout.stripe.com/session-1");
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeDisabled();
  });

  it("shows the already-entitled step and closes the gate on Entendido", async () => {
    createCheckoutSessionAction.mockResolvedValue({
      status: "already_entitled",
      message: "Ya tienes acceso activo para contactar candidatas.",
    });

    render(<PaywallGate {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar a pago" }));

    await waitFor(() =>
      expect(screen.getByText("Ya tienes acceso activo para contactar candidatas.")).toBeInTheDocument(),
    );
    expect(screen.queryByText("MX$299 · Contacta candidatas durante 30 días")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("resets back to FAM-08's default state each time it is freshly opened", async () => {
    createCheckoutSessionAction.mockResolvedValue({ status: "error", message: "No se pudo iniciar el pago." });
    const { rerender } = render(<PaywallGate {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar a pago" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    rerender(<PaywallGate {...props} open={false} />);
    rerender(<PaywallGate {...props} open={true} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("MX$299 · Contacta candidatas durante 30 días")).toBeInTheDocument();
  });
});
