import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TeamGroup from "./TeamGroup";

describe("TeamGroup", () => {
  it("renders the team name in the header button", () => {
    render(
      <TeamGroup team="Alpha">
        <div>Feature A</div>
      </TeamGroup>
    );

    expect(screen.getByRole("button", { name: /Alpha/i })).toBeInTheDocument();
  });

  it("renders children when not collapsed", () => {
    render(
      <TeamGroup team="Bravo">
        <div>Feature B</div>
      </TeamGroup>
    );

    expect(screen.getByText("Feature B")).toBeVisible();
  });

  it("hides children when header is clicked (collapse)", () => {
    render(
      <TeamGroup team="Charlie">
        <div>Feature C</div>
      </TeamGroup>
    );

    const button = screen.getByRole("button", { name: /Charlie/i });
    fireEvent.click(button);

    expect(screen.getByText("Feature C")).not.toBeVisible();
  });

  it("re-expands children on second click", () => {
    render(
      <TeamGroup team="Alpha">
        <div>Feature A</div>
      </TeamGroup>
    );

    const button = screen.getByRole("button", { name: /Alpha/i });
    fireEvent.click(button); // collapse
    fireEvent.click(button); // expand

    expect(screen.getByText("Feature A")).toBeVisible();
  });

  it("applies the correct CSS class names for filtering", () => {
    const { container } = render(
      <TeamGroup team="Bravo">
        <div>content</div>
      </TeamGroup>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.classList.contains("team-group")).toBe(true);
    expect(wrapper.classList.contains("team-group-bravo")).toBe(true);
  });

  it("applies the data-team attribute for CSS filtering", () => {
    const { container } = render(
      <TeamGroup team="Charlie">
        <div>content</div>
      </TeamGroup>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("data-team")).toBe("Charlie");
  });

  it("sets aria-expanded to true when expanded", () => {
    render(
      <TeamGroup team="Alpha">
        <div>content</div>
      </TeamGroup>
    );

    const button = screen.getByRole("button", { name: /Alpha/i });
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("sets aria-expanded to false when collapsed", () => {
    render(
      <TeamGroup team="Alpha">
        <div>content</div>
      </TeamGroup>
    );

    const button = screen.getByRole("button", { name: /Alpha/i });
    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("uses correct aria-controls linking header to content", () => {
    render(
      <TeamGroup team="Bravo">
        <div>content</div>
      </TeamGroup>
    );

    const button = screen.getByRole("button", { name: /Bravo/i });
    expect(button).toHaveAttribute("aria-controls", "team-group-content-bravo");

    const content = document.getElementById("team-group-content-bravo");
    expect(content).toBeInTheDocument();
  });

  it("renders with role=rowgroup for table-like semantics", () => {
    render(
      <TeamGroup team="Alpha">
        <div>content</div>
      </TeamGroup>
    );

    expect(screen.getByRole("rowgroup", { name: /Team Alpha/i })).toBeInTheDocument();
  });
});
