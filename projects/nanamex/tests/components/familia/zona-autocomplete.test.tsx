import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ZonaAutocomplete } from "@/components/familia/zona-autocomplete";
import type { ZonaOption } from "@/lib/zonas/queries";

const ZONAS: ZonaOption[] = [
  { id: "zona-monterrey", alcaldiaMunicipio: "Monterrey", colonia: null },
  { id: "zona-centro", alcaldiaMunicipio: "Monterrey", colonia: "Centro" },
  { id: "zona-obispado", alcaldiaMunicipio: "Monterrey", colonia: "Obispado" },
  { id: "zona-san-pedro", alcaldiaMunicipio: "San Pedro Garza García", colonia: null },
  { id: "zona-del-valle", alcaldiaMunicipio: "San Pedro Garza García", colonia: "Del Valle" },
];

// FAM-01's "Zona" autocomplete/pin control (design/UI-SPEC.md FAM-01, engineering/database.md
// §4 zonas). This story's acceptance criterion is enforced structurally by this component's
// design, not just by the server action: the field it submits (a hidden input) can only ever
// hold a real zona id from the list passed in as props -- free text typed into the visible
// search box never reaches the hidden input unless an option is actually selected.
describe("ZonaAutocomplete", () => {
  it("submits nothing (empty hidden input) until a zona is actually selected -- free text alone never counts", () => {
    render(<ZonaAutocomplete zonas={ZONAS} name="zona_id" />);

    const input = screen.getByRole("combobox", { name: "Zona" });
    fireEvent.change(input, { target: { value: "Monterrey Centro pero escrito distinto" } });

    const hidden = document.querySelector('input[type="hidden"][name="zona_id"]') as HTMLInputElement;
    expect(hidden.value).toBe("");
  });

  it("filters the option list as the user types (colonia or municipio, case-insensitive)", () => {
    render(<ZonaAutocomplete zonas={ZONAS} name="zona_id" />);

    const input = screen.getByRole("combobox", { name: "Zona" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "valle" } });

    // Matches both "San Pedro Garza García" (municipio row appears only via colonia match)
    // and "Del Valle, San Pedro Garza García" -- only the colonia-matching one should show.
    expect(screen.getByRole("option", { name: "Del Valle, San Pedro Garza García" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "San Pedro Garza García" })).not.toBeInTheDocument();
  });

  it("selecting an option sets the hidden input to that zona's real id, not free text", () => {
    render(<ZonaAutocomplete zonas={ZONAS} name="zona_id" />);

    const input = screen.getByRole("combobox", { name: "Zona" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "obispado" } });

    fireEvent.click(screen.getByRole("option", { name: "Obispado, Monterrey" }));

    const hidden = document.querySelector('input[type="hidden"][name="zona_id"]') as HTMLInputElement;
    expect(hidden.value).toBe("zona-obispado");
    expect(input).toHaveValue("Obispado, Monterrey");
  });

  it("changing the text after a selection clears the previously selected id", () => {
    render(<ZonaAutocomplete zonas={ZONAS} name="zona_id" defaultZonaId="zona-obispado" />);

    const hiddenBefore = document.querySelector(
      'input[type="hidden"][name="zona_id"]'
    ) as HTMLInputElement;
    expect(hiddenBefore.value).toBe("zona-obispado");

    const input = screen.getByRole("combobox", { name: "Zona" });
    fireEvent.change(input, { target: { value: "Obispado modificado" } });

    const hiddenAfter = document.querySelector(
      'input[type="hidden"][name="zona_id"]'
    ) as HTMLInputElement;
    expect(hiddenAfter.value).toBe("");
  });

  it("pre-fills from defaultZonaId with the option's label and shows the pin confirmation", () => {
    render(<ZonaAutocomplete zonas={ZONAS} name="zona_id" defaultZonaId="zona-centro" />);

    expect(screen.getByRole("combobox", { name: "Zona" })).toHaveValue("Centro, Monterrey");
    // The pin confirmation paragraph, not the combobox's own value.
    expect(screen.getByText("Centro, Monterrey").closest("p")).toBeInTheDocument();
  });

  it("renders a field-level error message when provided", () => {
    render(<ZonaAutocomplete zonas={ZONAS} name="zona_id" error="Selecciona una zona válida de la lista." />);

    expect(screen.getByText("Selecciona una zona válida de la lista.")).toBeInTheDocument();
  });
});
