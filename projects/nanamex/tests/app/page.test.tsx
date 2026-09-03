import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

// AUTH-01 landing (E1-01, design/UI-SPEC.md AUTH-01). Covers the acceptance criterion
// that matters at the unit-test level: role selection routes into AUTH-02 (`/registro`)
// with the role pre-filled via the `role` query param. Full visual/layout verification
// against UI-SPEC (hero crop, scrim, responsive column swap, no-child-imagery content
// review) is this story's dedicated Visual QA step, not a unit test concern.
describe("Home (AUTH-01 landing)", () => {
  it("renders the value-prop headline", () => {
    render(<Home />);

    expect(
      screen.getAllByRole("heading", { level: 1 })[0]
    ).toHaveTextContent("Niñeras de confianza para tu familia.");
  });

  it("routes 'Soy familia' into AUTH-02 with role=familia pre-filled", () => {
    render(<Home />);

    const links = screen.getAllByRole("link", { name: "Soy familia" });
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/registro?role=familia");
    }
  });

  it("routes 'Soy niñera' into AUTH-02 with role=ninera pre-filled", () => {
    render(<Home />);

    const links = screen.getAllByRole("link", { name: "Soy niñera" });
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/registro?role=ninera");
    }
  });

  it("renders the below-fold trust summary (verification, references, reporting)", () => {
    render(<Home />);

    expect(screen.getByText(/identidad de cada niñera/)).toBeInTheDocument();
    expect(screen.getByText(/referencias laborales y personales/)).toBeInTheDocument();
    expect(screen.getByText(/reportar cualquier comportamiento inapropiado/i)).toBeInTheDocument();
  });

  it("renders footer legal links and the placeholder photo attribution", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "Términos y condiciones" })).toHaveAttribute(
      "href",
      "/legal/terminos"
    );
    expect(screen.getByRole("link", { name: "Aviso de privacidad" })).toHaveAttribute(
      "href",
      "/legal/privacidad"
    );
    expect(screen.getByText(/CC BY 2.0/)).toBeInTheDocument();
  });

  it("hero image alt text describes only an adult, no child imagery", () => {
    render(<Home />);

    const image = screen.getByAltText(/mujer/i);
    expect(image).toBeInTheDocument();
    expect(image.getAttribute("alt")?.toLowerCase()).not.toMatch(/niñ|bebé|infante|hijo|hija/);
  });
});
