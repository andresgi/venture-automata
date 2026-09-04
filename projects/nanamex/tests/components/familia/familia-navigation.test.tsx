import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ value: "/familia/cuenta" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

import { FamiliaNavigation } from "@/components/familia/familia-navigation";

describe("FamiliaNavigation", () => {
  beforeEach(() => { pathname.value = "/familia/cuenta"; });

  it("renders the three persistent destinations and marks Cuenta active", () => {
    render(<FamiliaNavigation />);
    expect(screen.getAllByRole("link", { name: "Mis necesidades" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Favoritas" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Cuenta" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Cuenta" }).every((link) => link.getAttribute("aria-current") === "page")).toBe(true);
    expect(screen.getAllByRole("link", { name: "Cuenta" }).every((link) => link.className.includes("bg-primary-50"))).toBe(true);
  });

  it("does not treat the dashboard as active for a nested familia route", () => {
    pathname.value = "/familia/cuenta";
    render(<FamiliaNavigation />);
    expect(screen.getAllByRole("link", { name: "Mis necesidades" }).every((link) => !link.getAttribute("aria-current"))).toBe(true);
  });
});
