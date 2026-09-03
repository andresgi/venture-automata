import { describe, expect, it } from "vitest";
import { perfilFamiliarSchema } from "@/lib/familia/validation";

describe("perfilFamiliarSchema", () => {
  const valid = {
    nombre: "Ana Test",
    zonaId: "11111111-1111-4111-8111-111111111111",
  };

  it("accepts a fully valid submission", () => {
    expect(perfilFamiliarSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing nombre", () => {
    expect(perfilFamiliarSchema.safeParse({ ...valid, nombre: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only nombre", () => {
    expect(perfilFamiliarSchema.safeParse({ ...valid, nombre: "   " }).success).toBe(false);
  });

  it("rejects a missing zonaId", () => {
    expect(perfilFamiliarSchema.safeParse({ ...valid, zonaId: "" }).success).toBe(false);
  });

  it("rejects a zonaId that isn't a UUID -- e.g. free text typed instead of selecting an autocomplete option", () => {
    expect(
      perfilFamiliarSchema.safeParse({ ...valid, zonaId: "Monterrey Centro" }).success
    ).toBe(false);
  });

  it("rejects a zonaId of undefined (field never submitted at all)", () => {
    expect(perfilFamiliarSchema.safeParse({ nombre: "Ana Test" }).success).toBe(false);
  });
});
