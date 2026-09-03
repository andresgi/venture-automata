import { describe, expect, it } from "vitest";
import { registerSchema, loginSchema } from "@/lib/auth/validation";

describe("registerSchema", () => {
  const valid = {
    nombre: "Ana Test",
    correo: "ana@example.com",
    telefono: "8112345678",
    contrasena: "Password123",
    confirmarContrasena: "Password123",
    role: "familia",
  };

  it("accepts a fully valid submission and normalizes the phone", () => {
    const result = registerSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.telefono).toBe("+528112345678");
    }
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({ ...valid, correo: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a mismatched password confirmation", () => {
    const result = registerSchema.safeParse({ ...valid, confirmarContrasena: "Different1" });
    expect(result.success).toBe(false);
  });

  it("rejects a password below the minimum strength", () => {
    expect(registerSchema.safeParse({ ...valid, contrasena: "abc", confirmarContrasena: "abc" }).success).toBe(
      false
    );
    expect(
      registerSchema.safeParse({
        ...valid,
        contrasena: "onlyletters",
        confirmarContrasena: "onlyletters",
      }).success
    ).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    const result = registerSchema.safeParse({ ...valid, telefono: "123" });
    expect(result.success).toBe(false);
  });

  it("rejects role values other than familia/ninera (admin is never self-registered)", () => {
    expect(registerSchema.safeParse({ ...valid, role: "admin" }).success).toBe(false);
  });

  it("rejects a missing nombre", () => {
    expect(registerSchema.safeParse({ ...valid, nombre: "" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials shape", () => {
    expect(
      loginSchema.safeParse({ correo: "a@b.com", contrasena: "anything" }).success
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ correo: "nope", contrasena: "x" }).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ correo: "a@b.com", contrasena: "" }).success).toBe(false);
  });
});
