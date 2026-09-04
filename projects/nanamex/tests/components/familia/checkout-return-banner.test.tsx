import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutReturnBanner } from "@/components/familia/checkout-return-banner";

let returnState: { status: "ready" | "pending" | "stale" | "unverified" | "error" } = { status: "ready" };
vi.mock("@/actions/entitlements", () => ({
  getCheckoutReturnStateAction: vi.fn(async () => returnState),
}));

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
let currentSearch = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

function setWindowSearch(search: string) {
  window.history.replaceState(null, "", `${window.location.pathname}${search}`);
}

describe("CheckoutReturnBanner", () => {
  beforeEach(() => {
    currentSearch = "";
    replace.mockClear();
    setWindowSearch("");
    returnState = { status: "ready" };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing without a checkout query param", () => {
    render(<CheckoutReturnBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    vi.advanceTimersByTime(5000);
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the success confirmation for ?checkout=success and strips the query param after the dismiss delay", () => {
    currentSearch = "?checkout=success";
    setWindowSearch("?checkout=success");
    render(<CheckoutReturnBanner />);

    expect(screen.getByRole("status")).toHaveTextContent("Estamos confirmando");
    expect(replace).not.toHaveBeenCalled();

    vi.advanceTimersByTime(4000);
    expect(replace).toHaveBeenCalledWith("?", { scroll: false });
    // Still visible -- stripping the URL doesn't re-derive the pinned local state.
    expect(screen.getByRole("status")).toHaveTextContent("Estamos confirmando");
  });

  it("automatically hands a successful checkout to the specific contact route", async () => {
    currentSearch = "?checkout=success";
    setWindowSearch(currentSearch);
    render(<CheckoutReturnBanner autoNavigateTo="/familia/necesidad/need-1/candidatas/ninera-1/contactar?checkout=success" />);

    expect(screen.getByRole("status")).toHaveTextContent("Estamos confirmando");
    await Promise.resolve();
    await Promise.resolve();
    expect(replace).toHaveBeenCalledWith(
      "/familia/necesidad/need-1/candidatas/ninera-1/contactar?checkout=success",
      { scroll: false },
    );
  });

  it("retries a pending return and hands off once entitlement is durable", async () => {
    returnState = { status: "pending" };
    currentSearch = "?checkout=success";
    setWindowSearch(currentSearch);
    render(<CheckoutReturnBanner autoNavigateTo="/familia/necesidad/need-1/candidatas/ninera-1/contactar" />);
    expect(screen.getByRole("status")).toHaveTextContent("confirmando");
    returnState = { status: "ready" };
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    await Promise.resolve();
    await Promise.resolve();
    expect(replace).toHaveBeenCalledWith(
      "/familia/necesidad/need-1/candidatas/ninera-1/contactar",
      { scroll: false },
    );
  });

  it("routes a stale success return back to the paywall path", async () => {
    returnState = { status: "stale" };
    currentSearch = "?checkout=success";
    setWindowSearch(currentSearch);
    render(<CheckoutReturnBanner necesidadId="need-1" nineraId="ninera-1" />);
    await Promise.resolve();
    await Promise.resolve();
    expect(replace).toHaveBeenCalledWith(
      "/familia/necesidad/need-1/candidatas/ninera-1?contactar=1",
      { scroll: false },
    );
  });

  it("shows a neutral cancel message for ?checkout=cancel and strips the query param after the dismiss delay", () => {
    currentSearch = "?checkout=cancel";
    setWindowSearch("?checkout=cancel");
    render(<CheckoutReturnBanner />);

    expect(screen.getByRole("status")).toHaveTextContent("Pago cancelado");
    vi.advanceTimersByTime(4000);
    expect(replace).toHaveBeenCalledWith("?", { scroll: false });
  });

  it("preserves unrelated query params while stripping only checkout", () => {
    currentSearch = "?checkout=success&foo=bar";
    setWindowSearch("?checkout=success&foo=bar");
    render(<CheckoutReturnBanner />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    vi.advanceTimersByTime(4000);
    expect(replace).toHaveBeenCalledWith("?foo=bar", { scroll: false });
  });

  it("ignores unrecognized checkout values", () => {
    currentSearch = "?checkout=weird";
    setWindowSearch("?checkout=weird");
    render(<CheckoutReturnBanner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    vi.advanceTimersByTime(5000);
    expect(replace).not.toHaveBeenCalled();
  });
});
