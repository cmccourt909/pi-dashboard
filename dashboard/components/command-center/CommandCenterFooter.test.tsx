import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CommandCenterFooter from "./CommandCenterFooter";

describe("CommandCenterFooter", () => {
  it("renders 'Powered by Lodestar AI' text", () => {
    render(<CommandCenterFooter />);
    expect(screen.getByText("Powered by Lodestar AI")).toBeDefined();
  });

  it("renders the compass mark icon", () => {
    render(<CommandCenterFooter />);
    const footer = screen.getByTestId("command-center-footer");
    const svg = footer.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders as a footer element", () => {
    render(<CommandCenterFooter />);
    const footer = screen.getByTestId("command-center-footer");
    expect(footer.tagName.toLowerCase()).toBe("footer");
  });

  it("centers content using flex layout", () => {
    render(<CommandCenterFooter />);
    const footer = screen.getByTestId("command-center-footer");
    expect(footer.className).toContain("justify-center");
    expect(footer.className).toContain("items-center");
  });
});
