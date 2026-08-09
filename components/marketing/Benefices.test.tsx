import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Benefices } from "./Benefices";

describe("Benefices", () => {
  it("affiche les 3 bénéfices de la spec, pas plus", () => {
    render(<Benefices />);
    expect(screen.getByText("Du temps retrouvé")).toBeInTheDocument();
    expect(screen.getByText("Moins de charge mentale")).toBeInTheDocument();
    expect(screen.getByText("L'essentiel à portée de main")).toBeInTheDocument();
  });
});
