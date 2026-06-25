import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import GanttHeader, { PIColumnData } from "./GanttHeader";

const mockColumns: PIColumnData[] = [
  {
    pi: { name: "PI 26.2", start_date: "2025-01-06", end_date: "2025-03-14" },
    sprints: [
      { name: "Sprint 26.2.1", start: "2025-01-06", end: "2025-01-17" },
      { name: "Sprint 26.2.2", start: "2025-01-20", end: "2025-01-31" },
      { name: "Sprint 26.2.3", start: "2025-02-03", end: "2025-02-14" },
      { name: "Sprint 26.2.4", start: "2025-02-17", end: "2025-02-28" },
      { name: "Sprint 26.2.5", start: "2025-03-03", end: "2025-03-14" },
    ],
  },
  {
    pi: { name: "PI 26.3", start_date: "2025-03-17", end_date: "2025-05-23" },
    sprints: [
      { name: "Sprint 26.3.1", start: "2025-03-17", end: "2025-03-28" },
      { name: "Sprint 26.3.2", start: "2025-03-31", end: "2025-04-11" },
      { name: "Sprint 26.3.3", start: "2025-04-14", end: "2025-04-25" },
      { name: "Sprint 26.3.4", start: "2025-04-28", end: "2025-05-09" },
      { name: "Sprint 26.3.5", start: "2025-05-12", end: "2025-05-23" },
    ],
  },
];

describe("GanttHeader", () => {
  it("renders PI column headers with correct names", () => {
    render(<GanttHeader columns={mockColumns} columnWidth={400} />);

    expect(screen.getByText("PI 26.2")).toBeInTheDocument();
    expect(screen.getByText("PI 26.3")).toBeInTheDocument();
  });

  it("renders sprint bands within each PI column", () => {
    render(<GanttHeader columns={mockColumns} columnWidth={400} />);

    // Sprint names are abbreviated (Sprint -> S)
    expect(screen.getByText("S26.2.1")).toBeInTheDocument();
    expect(screen.getByText("S26.2.5")).toBeInTheDocument();
    expect(screen.getByText("S26.3.1")).toBeInTheDocument();
    expect(screen.getByText("S26.3.5")).toBeInTheDocument();
  });

  it("renders month labels for each PI date range", () => {
    render(<GanttHeader columns={mockColumns} columnWidth={400} />);

    // PI 26.2 spans Jan–Mar, PI 26.3 spans Mar–May
    expect(screen.getAllByText("Jan").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Feb").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Mar").length).toBeGreaterThanOrEqual(1);
  });

  it("applies correct column width to each PI column", () => {
    const { container } = render(
      <GanttHeader columns={mockColumns} columnWidth={500} />
    );

    const columnHeaders = container.querySelectorAll('[role="columnheader"]');
    expect(columnHeaders).toHaveLength(2);
    expect(columnHeaders[0]).toHaveStyle({ width: "500px", minWidth: "500px" });
    expect(columnHeaders[1]).toHaveStyle({ width: "500px", minWidth: "500px" });
  });

  it("renders with aria-labels for accessibility", () => {
    render(<GanttHeader columns={mockColumns} columnWidth={400} />);

    expect(
      screen.getByRole("columnheader", { name: "Program Increment PI 26.2" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Program Increment PI 26.3" })
    ).toBeInTheDocument();
  });

  it("renders sprint tooltips with date ranges", () => {
    render(<GanttHeader columns={mockColumns} columnWidth={400} />);

    const sprint1 = screen.getByTitle(/Sprint 26\.2\.1/);
    expect(sprint1).toBeInTheDocument();
    expect(sprint1.getAttribute("title")).toContain("Jan");
  });

  it("handles a single PI column", () => {
    const singleColumn: PIColumnData[] = [mockColumns[0]];
    render(<GanttHeader columns={singleColumn} columnWidth={400} />);

    expect(screen.getByText("PI 26.2")).toBeInTheDocument();
    expect(screen.queryByText("PI 26.3")).not.toBeInTheDocument();
  });

  it("handles empty sprints array gracefully", () => {
    const noSprints: PIColumnData[] = [
      {
        pi: { name: "PI 26.2", start_date: "2025-01-06", end_date: "2025-03-14" },
        sprints: [],
      },
    ];
    render(<GanttHeader columns={noSprints} columnWidth={400} />);

    expect(screen.getByText("PI 26.2")).toBeInTheDocument();
  });
});
