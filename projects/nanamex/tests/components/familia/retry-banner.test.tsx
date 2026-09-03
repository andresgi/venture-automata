import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

const { RetryBanner } = await import("@/components/familia/retry-banner");

describe("RetryBanner", () => {
  it("renders the message and calls router.refresh() on retry click", () => {
    render(<RetryBanner message="No se pudieron cargar las candidatas. Intenta de nuevo." />);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar las candidatas. Intenta de nuevo.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
