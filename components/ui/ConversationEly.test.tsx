import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("ConversationEly — contexte de mission", () => {
  it("affiche le patient et le soin quand les deux sont fournis", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly
        requeteInitiale=""
        situationInitiale={null}
        patientContexte="Marie Dupont"
        soinContexte="Pansement"
      />
    );

    expect(screen.getByText("Pour Marie Dupont · Pansement")).toBeInTheDocument();
  });

  it("affiche le patient seul sans point médian quand soinContexte est absent", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(
      <ConversationEly requeteInitiale="" situationInitiale={null} patientContexte="Marie Dupont" />
    );

    expect(screen.getByText("Pour Marie Dupont")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("n'affiche aucun rappel quand patientContexte est absent (comportement par défaut)", async () => {
    const { ConversationEly } = await import("./ConversationEly");
    render(<ConversationEly requeteInitiale="" situationInitiale={null} />);

    expect(screen.queryByText(/^Pour /)).not.toBeInTheDocument();
  });
});
