import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

// Foundations-level smoke test (E0-01): proves the lint/typecheck/test/build
// toolchain is wired end-to-end (Vitest + React Testing Library + the "@/*" path
// alias + the real app/page.tsx). Not a feature test — real screen tests land with
// each screen's own story per engineering/implementation-plan.md.
describe("Home", () => {
  it("renders the placeholder scaffold page", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Clin" })).toBeInTheDocument();
  });
});
