import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CandidateCard } from "@/components/familia/candidate-card";

describe("CandidateCard", () => {
  it("renders photo placeholder (initial), nombre, TrustBadge, and score+checklist", () => {
    render(
      <CandidateCard
        candidate={{
          ninera_id: "ninera-1",
          nombre: "Ana García",
          fotoUrl: null,
          verificationStatus: "verificada",
          score: 92,
          checklist: ["Zona compatible con tu necesidad", "Disponibilidad compatible"],
        }}
      />,
    );

    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Identidad verificada/ })).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("Zona compatible con tu necesidad")).toBeInTheDocument();
  });

  it("renders a real <img> when fotoUrl is present", () => {
    render(
      <CandidateCard
        candidate={{
          ninera_id: "ninera-2",
          nombre: "Bere López",
          fotoUrl: "https://example.supabase.co/storage/v1/object/public/profile-photos/x.jpg",
          verificationStatus: "no_verificada",
          score: 40,
          checklist: [],
        }}
      />,
    );

    expect(screen.getByTestId("candidate-avatar-photo")).toHaveAttribute(
      "src",
      "https://example.supabase.co/storage/v1/object/public/profile-photos/x.jpg",
    );
  });

  it("renders Guardar favorita and Ver perfil as disabled (E4-04/E4-03 not built yet)", () => {
    render(
      <CandidateCard
        candidate={{
          ninera_id: "ninera-3",
          nombre: "Cami Ruiz",
          fotoUrl: null,
          verificationStatus: "en_proceso",
          score: 60,
          checklist: [],
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /Guardar favorita/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ver perfil" })).toBeDisabled();
  });
});
