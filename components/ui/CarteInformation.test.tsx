import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarteInformation } from "./CarteInformation";

describe("CarteInformation", () => {
  it("affiche le label et la valeur", () => {
    render(<CarteInformation label="Patients" value={21} />);
    expect(screen.getByText("Patients")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
  });
});
