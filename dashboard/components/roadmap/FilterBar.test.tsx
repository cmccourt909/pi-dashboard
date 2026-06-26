import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FilterBar from "./FilterBar";

describe("FilterBar", () => {
  it("renders four pill buttons: All, Alpha, Bravo, Charlie", () => {
    render(<FilterBar activeTeam="All" onFilterChange={() => {}} />);

    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bravo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Charlie" })).toBeInTheDocument();
  });

  it("renders a toolbar with accessible label", () => {
    render(<FilterBar activeTeam="All" onFilterChange={() => {}} />);

    expect(screen.getByRole("toolbar", { name: "Team filter" })).toBeInTheDocument();
  });

  it("sets aria-pressed=true on the active pill", () => {
    render(<FilterBar activeTeam="Bravo" onFilterChange={() => {}} />);

    expect(screen.getByRole("button", { name: "Bravo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Charlie" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onFilterChange with the team when a pill is clicked", () => {
    const onFilterChange = vi.fn();
    render(<FilterBar activeTeam="All" onFilterChange={onFilterChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    expect(onFilterChange).toHaveBeenCalledWith("Alpha");

    fireEvent.click(screen.getByRole("button", { name: "Charlie" }));
    expect(onFilterChange).toHaveBeenCalledWith("Charlie");
  });

  it("does NOT inject a <style> tag when 'All' is selected", () => {
    const { container } = render(<FilterBar activeTeam="All" onFilterChange={() => {}} />);

    const styleTags = container.querySelectorAll("style");
    expect(styleTags.length).toBe(0);
  });

  it("injects a <style> tag hiding non-matching teams when a team is selected", () => {
    const { container } = render(<FilterBar activeTeam="Alpha" onFilterChange={() => {}} />);

    const styleTags = container.querySelectorAll("style");
    expect(styleTags.length).toBe(1);
    expect(styleTags[0].textContent).toContain(".team-group:not(.team-group-alpha)");
    expect(styleTags[0].textContent).toContain("display: none !important");
  });

  it("targets correct class for each team filter", () => {
    const { container, rerender } = render(
      <FilterBar activeTeam="Bravo" onFilterChange={() => {}} />
    );
    let style = container.querySelector("style");
    expect(style?.textContent).toContain(".team-group:not(.team-group-bravo)");

    rerender(<FilterBar activeTeam="Charlie" onFilterChange={() => {}} />);
    style = container.querySelector("style");
    expect(style?.textContent).toContain(".team-group:not(.team-group-charlie)");
  });

  it("applies distinct visual style to the active pill button", () => {
    render(<FilterBar activeTeam="Alpha" onFilterChange={() => {}} />);

    const activePill = screen.getByRole("button", { name: "Alpha" });
    const inactivePill = screen.getByRole("button", { name: "All" });

    // Active pill should have filled background
    expect(activePill.style.background).toContain("var(--color-interactive-primary)");
    // Inactive pill should have transparent background
    expect(inactivePill.style.background).toContain("transparent");
  });
});
