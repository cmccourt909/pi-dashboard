import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LodestarPanel from "./LodestarPanel";

const defaultProps = {
  featureKey: "FEAT-1",
  generatedAt: null as string | null,
};

describe("LodestarPanel", () => {
  it("renders AI narrative text when text is provided", () => {
    const narrative = "Feature is on track for delivery in Sprint 3.";
    render(<LodestarPanel text={narrative} {...defaultProps} />);

    expect(screen.getByTestId("lodestar-text")).toHaveTextContent(narrative);
    expect(screen.queryByTestId("lodestar-placeholder")).not.toBeInTheDocument();
  });

  it("renders placeholder when text is null", () => {
    render(<LodestarPanel text={null} {...defaultProps} />);

    expect(screen.getByTestId("lodestar-placeholder")).toHaveTextContent(
      "AI narrative not yet generated"
    );
    expect(screen.queryByTestId("lodestar-text")).not.toBeInTheDocument();
  });

  it("has an accessible section with aria-label", () => {
    render(<LodestarPanel text={null} {...defaultProps} />);

    const section = screen.getByRole("region", { name: "Lodestar Analysis" });
    expect(section).toBeInTheDocument();
  });

  it("renders the section header", () => {
    render(<LodestarPanel text="Some text" {...defaultProps} />);

    expect(screen.getByText("Lodestar Analysis")).toBeInTheDocument();
  });

  it("applies italic style to placeholder text", () => {
    render(<LodestarPanel text={null} {...defaultProps} />);

    const placeholder = screen.getByTestId("lodestar-placeholder");
    expect(placeholder).toHaveStyle({ fontStyle: "italic" });
  });

  it("applies muted color to placeholder text", () => {
    render(<LodestarPanel text={null} {...defaultProps} />);

    const placeholder = screen.getByTestId("lodestar-placeholder");
    expect(placeholder).toHaveStyle({ color: "#9ca3af" });
  });

  it("preserves whitespace in multi-line narrative text", () => {
    const multiline = "Line one.\nLine two.\nLine three.";
    render(<LodestarPanel text={multiline} {...defaultProps} />);

    const textEl = screen.getByTestId("lodestar-text");
    expect(textEl).toHaveStyle({ whiteSpace: "pre-wrap" });
    expect(textEl).toHaveTextContent("Line one.");
    expect(textEl).toHaveTextContent("Line two.");
  });

  it("renders the Regenerate button", () => {
    render(<LodestarPanel text="Some text" {...defaultProps} />);

    const button = screen.getByTestId("regenerate-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Regenerate");
    expect(button).not.toBeDisabled();
  });

  it("displays generated_at as relative time", () => {
    const recentTimestamp = new Date(
      Date.now() - 2 * 60 * 60 * 1000
    ).toISOString();
    render(
      <LodestarPanel
        text="Some text"
        featureKey="FEAT-1"
        generatedAt={recentTimestamp}
      />
    );

    expect(screen.getByTestId("generated-at")).toHaveTextContent(
      "Generated 2 hours ago"
    );
  });

  it("does not display generated_at when null", () => {
    render(<LodestarPanel text="Some text" {...defaultProps} />);

    expect(screen.queryByTestId("generated-at")).not.toBeInTheDocument();
  });
});
