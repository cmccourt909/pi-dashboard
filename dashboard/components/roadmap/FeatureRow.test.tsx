import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import FeatureRow from "./FeatureRow";
import { FeatureItem } from "../../types/roadmap";

const mockFeature: FeatureItem = {
  feature_key: "FEAT-101",
  summary: "Implement authentication flow",
  team: "Alpha",
  assignee: "jane.doe",
  status: "In Progress",
  status_category: "indeterminate",
  rag_status: "green",
  pi_completion: [
    {
      pi_name: "PI 26.2",
      done_pct: 60,
      prog_pct: 25,
      todo_pct: 15,
      story_count: 8,
      sp_done: 24,
      sp_total: 40,
    },
    {
      pi_name: "PI 26.3",
      done_pct: 20,
      prog_pct: 30,
      todo_pct: 50,
      story_count: 10,
      sp_done: 8,
      sp_total: 40,
    },
  ],
  blockers: ["FEAT-200"],
  is_blocked_by: [],
  sprint_breakdown: [
    { sprint_name: "Sprint 1", state: "closed", story_count: 3, done_count: 3 },
    { sprint_name: "Sprint 2", state: "active", story_count: 4, done_count: 2 },
    { sprint_name: "Sprint 3", state: "future", story_count: 2, done_count: 0 },
    { sprint_name: "Sprint 4", state: "future", story_count: 1, done_count: 0 },
    { sprint_name: "Sprint 5", state: "future", story_count: 0, done_count: 0 },
  ],
  lodestar_static: null,
};

describe("FeatureRow", () => {
  it("renders with the correct data-team attribute for CSS filtering", () => {
    const onSelect = vi.fn();
    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.2"
      />
    );

    const row = screen.getByTestId("feature-row");
    expect(row.getAttribute("data-team")).toBe("Alpha");
  });

  it("renders with data-feature-key attribute", () => {
    const onSelect = vi.fn();
    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.2"
      />
    );

    const row = screen.getByTestId("feature-row");
    expect(row.getAttribute("data-feature-key")).toBe("FEAT-101");
  });

  it("calls onSelect when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.2"
      />
    );

    const row = screen.getByTestId("feature-row");
    await user.click(row);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockFeature);
  });

  it("calls onSelect when Enter key is pressed", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.2"
      />
    );

    const row = screen.getByTestId("feature-row");
    row.focus();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockFeature);
  });

  it("calls onSelect when Space key is pressed", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.2"
      />
    );

    const row = screen.getByTestId("feature-row");
    row.focus();
    await user.keyboard(" ");

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders the GanttBar with correct percentages for the matching PI", () => {
    const onSelect = vi.fn();
    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.2"
      />
    );

    // GanttBar should render with the PI 26.2 completion data (60% done)
    expect(screen.getByLabelText("60% done")).toBeInTheDocument();
  });

  it("renders SprintMiniGrid for PI 26.3", () => {
    const onSelect = vi.fn();
    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.3"
      />
    );

    expect(screen.getByTestId("sprint-mini-grid")).toBeInTheDocument();
  });

  it("does not render SprintMiniGrid for PI 26.2", () => {
    const onSelect = vi.fn();
    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.2"
      />
    );

    expect(screen.queryByTestId("sprint-mini-grid")).not.toBeInTheDocument();
  });

  it("renders BlockerFlag when feature has blockers", () => {
    const onSelect = vi.fn();
    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.2"
      />
    );

    expect(screen.getByTestId("blocker-flag")).toBeInTheDocument();
  });

  it("does not render BlockerFlag when feature has no blockers", () => {
    const onSelect = vi.fn();
    const featureWithoutBlockers: FeatureItem = {
      ...mockFeature,
      blockers: [],
      is_blocked_by: [],
    };

    render(
      <FeatureRow
        feature={featureWithoutBlockers}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.2"
      />
    );

    expect(screen.queryByTestId("blocker-flag")).not.toBeInTheDocument();
  });

  it("has role=row for table-like semantics", () => {
    const onSelect = vi.fn();
    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.2"
      />
    );

    const row = screen.getByRole("row");
    expect(row).toBeInTheDocument();
  });

  it("is keyboard-focusable with tabIndex=0", () => {
    const onSelect = vi.fn();
    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.2"
      />
    );

    const row = screen.getByTestId("feature-row");
    expect(row).toHaveAttribute("tabindex", "0");
  });

  it("has an accessible aria-label describing the feature", () => {
    const onSelect = vi.fn();
    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 26.2"
      />
    );

    const row = screen.getByTestId("feature-row");
    expect(row.getAttribute("aria-label")).toContain("Implement authentication flow");
    expect(row.getAttribute("aria-label")).toContain("Alpha");
    expect(row.getAttribute("aria-label")).toContain("60%");
  });

  it("defaults to 0/0/100 when no matching PI completion is found", () => {
    const onSelect = vi.fn();
    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={200}
        onSelect={onSelect}
        piName="PI 99.9"
      />
    );

    // Should render with 100% todo (gray segment)
    expect(screen.getByLabelText("100% todo")).toBeInTheDocument();
  });
});
