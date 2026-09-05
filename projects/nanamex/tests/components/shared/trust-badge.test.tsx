import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrustBadge } from "@/components/shared/trust-badge";

// TrustBadge (design/UI-SYSTEM.md §4.1): three mutually-exclusive states, invariant
// color/icon/label semantics, fixed geometry (no layout shift state-to-state), tap/hover
// tooltip with the plain-language explanation.
describe("TrustBadge", () => {
  it("renders the 'No verificada' state with the neutral treatment and no color fill", () => {
    render(<TrustBadge status="no_verificada" />);

    const badge = screen.getByRole("button", { name: /No verificada/ });
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("border-border-strong");
    expect(badge.className).toContain("bg-bg-raised");
    expect(badge.className).toContain("text-ink-600");
    // Never borrows a trust hue for the quietest state.
    expect(badge.className).not.toContain("trust-pending");
    expect(badge.className).not.toContain("trust-verified");
  });

  it("renders the 'Verificación en proceso' state with the amber trust-pending treatment", () => {
    render(<TrustBadge status="en_proceso" />);

    const badge = screen.getByRole("button", { name: /Verificación en proceso/ });
    expect(badge.className).toContain("trust-pending-50");
    expect(badge.className).toContain("trust-pending-800");
    // Never the danger/red token, even though it's a "pending" state.
    expect(badge.className).not.toContain("danger");
  });

  it("renders the 'Identidad verificada' state with the teal trust-verified treatment", () => {
    render(<TrustBadge status="verificada" />);

    const badge = screen.getByRole("button", { name: /Identidad verificada/ });
    expect(badge.className).toContain("trust-verified-50");
    expect(badge.className).toContain("trust-verified-800");
  });

  it("keeps identical geometry (height, padding, border, shape, type scale) across all three states", () => {
    const geometryClasses = ["h-6", "rounded-full", "border", "px-2", "text-caption"];
    for (const status of ["no_verificada", "en_proceso", "verificada"] as const) {
      const { unmount } = render(<TrustBadge status={status} />);
      const badge = screen.getByRole("button");
      for (const className of geometryClasses) {
        expect(badge.className).toContain(className);
      }
      unmount();
    }
  });

  it("supports the documented 28px detail geometry without changing compact defaults", () => {
    const { rerender } = render(<TrustBadge status="verificada" />);
    expect(screen.getByRole("button").className).toContain("h-6");
    rerender(<TrustBadge status="verificada" size="detail" />);
    expect(screen.getByRole("button").className).toContain("h-7");
    expect(screen.getByRole("button").className).not.toContain("h-6");
  });

  it.each([["en_proceso", "trust-pending-50", "trust-pending-800"], ["verificada", "trust-verified-50", "trust-verified-800"]] as const)("keeps %s color semantics in the large variant", (status, background, text) => {
    render(<TrustBadge status={status} size="large" />);
    const badge = screen.getByRole("button");
    expect(badge.className).toContain(background);
    expect(badge.className).toContain(text);
  });

  it("reveals the plain-language tooltip explanation on click, one per state", () => {
    const explanations: Record<string, string> = {
      no_verificada: "Esta niñera aún no ha subido su identificación.",
      en_proceso: "Estamos revisando su identificación, normalmente toma 24–48 horas.",
      verificada: "Identidad verificada por el equipo de Clin.",
    };

    for (const [status, explanation] of Object.entries(explanations)) {
      const { unmount } = render(<TrustBadge status={status as "no_verificada" | "en_proceso" | "verificada"} />);
      const badge = screen.getByRole("button");
      expect(screen.getByRole("tooltip", { hidden: true })).toHaveAttribute("hidden");
      fireEvent.click(badge);
      expect(screen.getByRole("tooltip", { hidden: true })).not.toHaveAttribute("hidden");
      expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(explanation);
      unmount();
    }
  });

  it("reveals the tooltip on hover (desktop) and hides it again on mouse-leave", () => {
    render(<TrustBadge status="verificada" />);
    const badge = screen.getByRole("button");

    fireEvent.mouseEnter(badge);
     expect(screen.getByRole("tooltip", { hidden: true })).not.toHaveAttribute("hidden");

    fireEvent.mouseLeave(badge);
     expect(screen.getByRole("tooltip", { hidden: true })).toHaveAttribute("hidden");
  });

  it("allows the tooltip to escape the hero/photo clipping context", () => {
    render(<TrustBadge status="verificada" size="detail" />);
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveClass("z-30");
    expect(screen.getByRole("button").parentElement).toHaveClass("overflow-visible");
  });
});
