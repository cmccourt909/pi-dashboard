import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SprintMiniGrid from "./SprintMiniGrid";
import { SprintBreakdown } from "@/types/roadmap";

const mockSprints: SprintBreakdown[] = [
  { sprint_name: "Sprint 26.3.1", state: "closed", story_count: 5, done_count: 5 },
  { sprint_name: "Sprint 26.3.2", state: "active", story_count: 3, done_count: 1 },
  { sprint_name: "Sprint 26.3.3", state: "future", story_count: 4, done_count: 0 },
  { sprint_name: "Sprint 26.3.4", state: "future", story_count: 0, done_count: 0 },
  { sprint_name: "Sprint 26.3.5", state: "future", story_count: 2, done_count: 0 },
];

describe("SprintMiniGrid", () => {
  it("renders exactly 5 mini-bars when given 5 sprints", () => {
    render(<SprintMiniGrid sprints={mockSprints} team="Alpha" />);
    const grid = screen.getByTestId("sprint-mini-grid");
    expect(grid.children).toHaveLength(5);
  });

  it("renders exactly 5 mini-bars when fewer than 5 sprints provided", () => {
    const twoSprints = mockSprints.slice(0, 2);
    render(<SprintMiniGrid sprints={twoSprints} team="Bravo" />);
    const grid = screen.getByTestId("sprint-mini-grid");
    expect(grid.children).toHaveLength(5);
  });

  it("renders exactly 5 mini-bars when more than 5 sprints provided", () => {
    const sevenSprints: SprintBreakdown[] = [
      ...mockSprints,
      { sprint_name: "Sprint 26.3.6", state: "future", story_count: 1, done_count: 0 },
      { sprint_name: "Sprint 26.3.7", state: "future", story_count: 0, done_count: 0 },
    ];
    render(<SprintMiniGrid sprints={sevenSprints} team="Charlie" />);
    const grid = screen.getByTestId("sprint-mini-grid");
    expect(grid.children).toHaveLength(5);
  });

  it("renders exactly 5 mini-bars when given an empty array", () => {
    render(<SprintMiniGrid sprints={[]} team="Alpha" />);
    const grid = screen.getByTestId("sprint-mini-grid");
    expect(grid.children).toHaveLength(5);
  });

  it("applies team color at 55% opacity for active sprint", () => {
    const activeSprints: SprintBreakdown[] = [
      { sprint_name: "Sprint 1", state: "active", story_count: 3, done_count: 1 },
    ];
    render(<SprintMiniGrid sprints={activeSprints} team="Alpha" />);
    const grid = screen.getByTestId("sprint-mini-grid");
    const activeBar = grid.children[0] as HTMLElement;
    // Alpha color #202670 at 55% opacity => rgba(32, 38, 112, 0.55)
    expect(activeBar.style.backgroundColor).toBe("rgba(32, 38, 112, 0.55)");
  });

  it("applies neutral color for future sprint with stories", () => {
    const futureSprints: SprintBreakdown[] = [
      { sprint_name: "Sprint 1", state: "future", story_count: 2, done_count: 0 },
    ];
    render(<SprintMiniGrid sprints={futureSprints} team="Bravo" />);
    const grid = screen.getByTestId("sprint-mini-grid");
    const futureBar = grid.children[0] as HTMLElement;
    // jsdom normalizes hex to rgb
    expect(futureBar.style.backgroundColor).toBe("rgb(242, 244, 246)");
  });

  it("applies solid team color for closed sprint with stories", () => {
    const closedSprints: SprintBreakdown[] = [
      { sprint_name: "Sprint 1", state: "closed", story_count: 5, done_count: 5 },
    ];
    render(<SprintMiniGrid sprints={closedSprints} team="Charlie" />);
    const grid = screen.getByTestId("sprint-mini-grid");
    const closedBar = grid.children[0] as HTMLElement;
    // Charlie color #0F6038 → rgb(15, 96, 56)
    expect(closedBar.style.backgroundColor).toBe("rgb(15, 96, 56)");
  });

  it("applies diagonal hatch pattern when sprint has no stories", () => {
    const noStorySprints: SprintBreakdown[] = [
      { sprint_name: "Sprint 1", state: "future", story_count: 0, done_count: 0 },
    ];
    render(<SprintMiniGrid sprints={noStorySprints} team="Alpha" />);
    const grid = screen.getByTestId("sprint-mini-grid");
    const hatchBar = grid.children[0] as HTMLElement;
    // Should have background (gradient) set, not backgroundColor
    expect(hatchBar.style.background).toContain("repeating-linear-gradient");
  });

  it("includes aria-labels on each mini-bar", () => {
    render(<SprintMiniGrid sprints={mockSprints} team="Alpha" />);
    expect(
      screen.getByLabelText("Sprint 26.3.1: 5/5 done")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Sprint 26.3.2: 1/3 done")
    ).toBeInTheDocument();
  });

  it("has a group role with descriptive aria-label", () => {
    render(<SprintMiniGrid sprints={mockSprints} team="Alpha" />);
    expect(
      screen.getByRole("group", { name: "Sprint progress indicators" })
    ).toBeInTheDocument();
  });
});
