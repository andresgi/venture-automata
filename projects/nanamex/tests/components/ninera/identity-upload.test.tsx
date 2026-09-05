import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdentityUpload } from "@/components/ninera/identity-upload";

const submit = vi.hoisted(() => vi.fn());
vi.mock("@/actions/perfil-ninera", () => ({ submitIdentityDocumentAction: submit }));

beforeEach(() => {
  submit.mockResolvedValue({ status: "success" });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:test-id") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
});

afterEach(() => vi.clearAllMocks());

function validFile() {
  return new File(["image bytes"], "identificacion.jpg", { type: "image/jpeg" });
}

describe("IdentityUpload", () => {
  it("places camera before gallery on mobile and keeps the desktop path at lg", () => {
    render(<IdentityUpload status="no_verificada" />);

    const camera = screen.getByRole("button", { name: "Tomar foto" });
    const gallery = screen.getByRole("button", { name: "Subir desde galería" });
    expect(camera.compareDocumentPosition(gallery) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(camera.parentElement).toHaveClass("lg:hidden");
    expect(gallery.parentElement).toHaveClass("lg:hidden");
    expect(screen.getByRole("button", { name: "Seleccionar archivo" }).parentElement).toHaveClass("hidden");
    expect(screen.getByText("Arrastra tu archivo aquí")).toBeInTheDocument();
  });

  it("shows a stable preview and inline progress while the server action is pending", async () => {
    let resolve: (value: { status: string }) => void = () => undefined;
    submit.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<IdentityUpload status="no_verificada" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile()] } });

    await waitFor(() => expect(screen.getByTestId("selected-image-preview")).toBeInTheDocument());
    expect(screen.getByRole("progressbar", { name: "Progreso de carga" })).toHaveAttribute("aria-valuetext", "Subiendo");
    expect(screen.getByTestId("selected-image-preview")).toHaveClass("h-48");
    expect(screen.getByRole("button", { name: "Tomar foto" })).toBeDisabled();

    resolve({ status: "success" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Verificación en proceso/ })).toBeInTheDocument());
  });

  it("renders recoverable validation errors with warning treatment and retains controls", () => {
    render(<IdentityUpload status="no_verificada" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["bad"], "documento.pdf", { type: "application/pdf" })] } });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("border-danger-600", "bg-danger-50", "text-danger-600");
    expect(alert).toHaveTextContent("Usa una imagen JPG, PNG o WEBP");
    expect(screen.getByRole("button", { name: "Tomar foto" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Intentar de nuevo" })).not.toBeInTheDocument();
  });

  it("offers retry after a server failure without dropping the selected preview", async () => {
    submit.mockResolvedValue({ status: "error", message: "No se pudo subir el documento." });
    render(<IdentityUpload status="no_verificada" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [validFile()] } });

    await waitFor(() => expect(screen.getByRole("button", { name: "Intentar de nuevo" })).toBeInTheDocument());
    expect(screen.getByTestId("selected-image-preview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Intentar de nuevo" }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  });

  it("keeps verified replacement low-weight while providing a 44px action target", () => {
    render(<IdentityUpload status="verificada" />);

    const replace = screen.getByRole("button", { name: "Reemplazar documento" });
    expect(replace).toHaveClass("min-h-11", "text-primary-700", "underline");

    fireEvent.click(replace);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Tomar foto" })).toBeInTheDocument();
  });
});
