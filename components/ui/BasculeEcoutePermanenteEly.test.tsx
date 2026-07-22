import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BasculeEcoutePermanenteEly } from "./BasculeEcoutePermanenteEly";

describe("BasculeEcoutePermanenteEly", () => {
  it("affiche la case décochée quand le réglage est désactivé", () => {
    render(<BasculeEcoutePermanenteEly activeParDefaut={false} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("affiche la case cochée quand le réglage est activé", () => {
    render(<BasculeEcoutePermanenteEly activeParDefaut={true} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});
