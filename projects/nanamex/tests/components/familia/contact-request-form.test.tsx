import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContactRequestForm } from "@/components/familia/contact-request-form";

vi.mock("@/actions/entitlements", () => ({
  confirmContactAction: vi.fn(),
}));

describe("ContactRequestForm", () => {
  it("uses the established-contact state even when the candidate has no phone", () => {
    render(<ContactRequestForm necesidadId="need-1" nineraId="ninera-1" initialPhone={null} initialContactEstablished cancelHref="/familia/necesidad/need-1/candidatas/ninera-1" />);

    expect(screen.getByRole("status")).toHaveTextContent("Solicitud confirmada");
    expect(screen.getByText("La candidata no tiene teléfono disponible.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Mensaje opcional")).not.toBeInTheDocument();
  });

  it("offers an explicit cancel action back to the candidate context", () => {
    render(<ContactRequestForm necesidadId="need-1" nineraId="ninera-1" cancelHref="/familia/necesidad/need-1/candidatas/ninera-1" />);
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute("href", "/familia/necesidad/need-1/candidatas/ninera-1");
    fireEvent.click(screen.getByRole("link", { name: "Cancelar" }));
  });

  it("offers a FAM-11 pipeline exit path after a successful confirmation", () => {
    render(<ContactRequestForm necesidadId="need-1" nineraId="ninera-1" initialPhone="+5215550001" initialContactEstablished cancelHref="/familia/necesidad/need-1/candidatas/ninera-1" />);
    expect(screen.getByRole("link", { name: "Ver pipeline" })).toHaveAttribute("href", "/familia/necesidad/need-1/pipeline");
  });
});
