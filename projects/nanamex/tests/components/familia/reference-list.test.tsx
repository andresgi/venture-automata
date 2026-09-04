import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReferenceList } from "@/components/familia/reference-list";

const reference = {
  id: "ref-1",
  nombre: "María López",
  relacion: "Familia anterior",
  periodo: "2021–2023",
  contacto: "Disponible por teléfono",
};

describe("ReferenceList", () => {
  it("uses only the small internal offset because the detail column supplies the rest of space-7", () => {
    render(<ReferenceList references={[]} />);
    expect(screen.getByRole("region")).toHaveClass("mt-3");
    expect(screen.getByRole("region")).not.toHaveClass("mt-10");
  });

  it("permanently discloses that references are unverified, including when empty", () => {
    render(<ReferenceList references={[]} />);

    expect(screen.getByRole("heading", { name: "Referencias" })).toBeInTheDocument();
    expect(screen.getByText("Proporcionadas por la niñera — Clin no las ha verificado.")).toBeInTheDocument();
    expect(screen.queryByText("Contacto:")).not.toBeInTheDocument();
  });

  it("renders plain reference details and only renders the optional contact note when supplied", () => {
    render(<ReferenceList references={[reference, { ...reference, id: "ref-2", nombre: "Ana Ruiz", contacto: null }]} />);

    expect(screen.getByText("María López")).toBeInTheDocument();
    expect(screen.getAllByText("Familia anterior, 2021–2023")).toHaveLength(2);
    expect(screen.getByText("Contacto: Disponible por teléfono")).toBeInTheDocument();
    expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
    expect(screen.queryByText("Contacto: ", { exact: true })).not.toBeInTheDocument();
  });
});
