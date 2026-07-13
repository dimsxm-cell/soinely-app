import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "./page";

describe("Home page", () => {
  it("renders the Soinely name", () => {
    render(<Page />);
    expect(screen.getByText(/soinely/i)).toBeInTheDocument();
  });
});
