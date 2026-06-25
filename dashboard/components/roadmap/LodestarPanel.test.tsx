import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LodestarPanel from "./LodestarPanel";

describe("LodestarPanel", () => {
  it("renders AI narrative text when text is provided", () => {
    const narrative = "Feature is on track for delivery in Sprint 3.";
    render(<LodestarPanel text={narrative} />);

    expect(screen.getByTestId("lodestar-text")).toHaveTextContent(narrative);
    expect(screen.queryByTestId("lodestar-placeholder")).not.toBeInTheDocument();
  });

  it("renders placeholder when text is null", () => {
    render(<LodestarPanel text={null} />);

    expect(screen.getByTestId("lodestar-placeholder")).toHaveTextContent(
      "AI narrative not yet generated"
    );
    expect(screen.queryByTestId("lodestar-text")).not.toBeInTheDocument();
  });

  it("has an accessible section with aria-label", () => {
    render(<LodestarPanel text={null} />);

    const section = screen.getByRole("region", { name: "Lodestar Analysis" });
    expect(section).toBeInTheDocument();
  });

  it("renders the section header", () => {
    render(<LodestarPanel text="Some text" />);

    expect(screen.getByText("Lodestar Analysis")).toBeInTheDocument();
  });

  it("applies italic style to placeholder text", () => {
    render(<LodestarPanel text={null} />);

    const placeholder = screen.getByTestId("lodestar-placeholder");
    expect(placeholder).toHaveStyle({ fontStyle: "italic" });
  });

  it("applies muted color to placeholder text", () => {
    render(<LodestarPanel text={null} />);

    const placeholder = screen.getByTestId("lodestar-placeholder");
    expect(placeholder).toHaveStyle({ color: "#9ca3af" });
  });

  it("preserves whitespace in multi-line narrative text", () => {
    const multiline = "Line one.\nLine two.\nLine three.";
    render(<LodestarPanel text={multiline} />);

    const textEl = screen.getByTestId("lodestar-text");
    expect(textEl).toHaveStyle({ whiteSpace: "pre-wrap" });
    expect(textEl).toHaveTextContent("Line one.");
    expect(textEl).toHaveTextContent("Line two.");
  });
});
