import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toggleFavoriteAction = vi.fn();
vi.mock("@/actions/favorites", () => ({ toggleFavoriteAction }));
const { FavoriteToggle } = await import("@/components/familia/favorite-toggle");

const props = { necesidadId: "necesidad-1", nineraId: "ninera-1", score: 80, checklist: { location: true } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FavoriteToggle", () => {
  it("renders the unfavorited state by default with an accessible label", () => {
    render(<FavoriteToggle {...props} initialFavorite={false} />);
    const button = screen.getByRole("button", { name: "Guardar favorita" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("optimistically toggles to favorited, confirms via the server action, and shows a visible success toast", async () => {
    toggleFavoriteAction.mockResolvedValue({ ok: true, isFavorite: true });
    render(<FavoriteToggle {...props} initialFavorite={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar favorita" }));
    expect(screen.getByRole("button", { name: "Quitar de favoritas" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(toggleFavoriteAction).toHaveBeenCalledWith({
        necesidadId: "necesidad-1",
        nineraId: "ninera-1",
        favorite: true,
        matchScore: 80,
        matchChecklist: { location: true },
      }),
    );
    const toast = await screen.findByRole("status");
    expect(toast).toHaveTextContent("Guardada en favoritas");
    expect(toast.className).not.toMatch(/sr-only/);
  });

  it("reverts the optimistic toggle and shows a visible (non-screen-reader-only) error toast when the server action fails", async () => {
    toggleFavoriteAction.mockResolvedValue({ ok: false, isFavorite: false, message: "No se pudo actualizar la favorita." });
    render(<FavoriteToggle {...props} initialFavorite={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar favorita" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar favorita" })).toHaveAttribute("aria-pressed", "false"));
    const toast = screen.getByRole("alert");
    expect(toast).toHaveTextContent("No se pudo actualizar la favorita.");
    expect(toast.className).not.toMatch(/sr-only/);
  });

  it("reverts the optimistic toggle and shows a visible error toast when the server action throws", async () => {
    toggleFavoriteAction.mockRejectedValue(new Error("network error"));
    render(<FavoriteToggle {...props} initialFavorite={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar favorita" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar favorita" })).toHaveAttribute("aria-pressed", "false"));
    const toast = screen.getByRole("alert");
    expect(toast).toHaveTextContent("No se pudo actualizar la favorita.");
    expect(toast.className).not.toMatch(/sr-only/);
  });

  it("supports unfavoriting from an already-favorited state", async () => {
    toggleFavoriteAction.mockResolvedValue({ ok: true, isFavorite: false });
    render(<FavoriteToggle {...props} initialFavorite />);
    fireEvent.click(screen.getByRole("button", { name: "Quitar de favoritas" }));
    expect(screen.getByRole("button", { name: "Guardar favorita" })).toBeInTheDocument();
    await waitFor(() => expect(toggleFavoriteAction).toHaveBeenCalledWith(expect.objectContaining({ favorite: false })));
  });
});
