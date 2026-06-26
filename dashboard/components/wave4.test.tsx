import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AskLodestar from "./AskLodestar";
import NorthlineInsightsStrip, { Insight } from "./NorthlineInsightsStrip";
import LodestarBriefingPanel from "./LodestarBriefingPanel";
import RecentActivityFeed, { ActivityItem } from "./RecentActivityFeed";
import TopFindings, { Finding } from "./TopFindings";
import RoadmapTableView from "./roadmap/RoadmapTableView";

describe("AskLodestar", () => {
  it("renders the outlined button with sparkles icon", () => {
    render(<AskLodestar />);
    expect(screen.getByTestId("ask-lodestar")).toHaveTextContent("Ask Lodestar");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<AskLodestar onClick={onClick} />);
    fireEvent.click(screen.getByTestId("ask-lodestar"));
    expect(onClick).toHaveBeenCalled();
  });

  it("is disabled when disabled prop is true", () => {
    render(<AskLodestar disabled />);
    expect(screen.getByTestId("ask-lodestar")).toBeDisabled();
  });
});

describe("NorthlineInsightsStrip", () => {
  const insights: Insight[] = [
    { id: "1", text: "Insight one" },
    { id: "2", text: "Insight two" },
    { id: "3", text: "Insight three" },
  ];

  it("renders default insights when none provided", () => {
    render(<NorthlineInsightsStrip />);
    expect(screen.getByTestId("northline-insights-strip")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders provided insights", () => {
    render(<NorthlineInsightsStrip insights={insights} />);
    expect(screen.getByText("Insight one")).toBeInTheDocument();
    expect(screen.getByText("Insight two")).toBeInTheDocument();
    expect(screen.getByText("Insight three")).toBeInTheDocument();
  });

  it("calls onRefresh when refresh button clicked", () => {
    const onRefresh = vi.fn();
    render(<NorthlineInsightsStrip insights={insights} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTestId("insights-refresh"));
    expect(onRefresh).toHaveBeenCalled();
  });

  it("calls onViewFindings when view findings link clicked", () => {
    const onViewFindings = vi.fn();
    render(<NorthlineInsightsStrip insights={insights} onViewFindings={onViewFindings} />);
    fireEvent.click(screen.getByTestId("view-findings"));
    expect(onViewFindings).toHaveBeenCalled();
  });
});

describe("LodestarBriefingPanel", () => {
  it("renders the briefing panel and generate button", () => {
    render(<LodestarBriefingPanel />);
    expect(screen.getByTestId("lodestar-briefing-panel")).toBeInTheDocument();
    expect(screen.getByTestId("generate-briefing")).toHaveTextContent("Generate Briefing");
  });

  it("calls onGenerate when button clicked", () => {
    const onGenerate = vi.fn();
    render(<LodestarBriefingPanel onGenerate={onGenerate} />);
    fireEvent.click(screen.getByTestId("generate-briefing"));
    expect(onGenerate).toHaveBeenCalled();
  });

  it("shows loading state", () => {
    render(<LodestarBriefingPanel loading />);
    expect(screen.getByTestId("generate-briefing")).toHaveTextContent("Generating…");
    expect(screen.getByTestId("generate-briefing")).toBeDisabled();
  });
});

describe("RecentActivityFeed", () => {
  const activities: ActivityItem[] = [
    { id: "1", type: "sync", message: "Synced", timestamp: "10 min ago" },
    { id: "2", type: "ai", message: "Generated", timestamp: "25 min ago" },
    { id: "3", type: "finding", message: "Flagged", timestamp: "1 hr ago" },
  ];

  it("renders default activities", () => {
    render(<RecentActivityFeed />);
    expect(screen.getByTestId("recent-activity-feed")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^activity-/)).toHaveLength(3);
  });

  it("renders provided activities", () => {
    render(<RecentActivityFeed activities={activities} />);
    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(screen.getByText("Generated")).toBeInTheDocument();
    expect(screen.getByText("Flagged")).toBeInTheDocument();
  });
});

describe("TopFindings", () => {
  const findings: Finding[] = [
    { id: "1", severity: "info", feature: "FEAT-1", message: "Info finding" },
    { id: "2", severity: "warning", feature: "FEAT-2", message: "Warning finding" },
    { id: "3", severity: "critical", feature: "FEAT-3", message: "Critical finding" },
  ];

  it("renders all findings sorted critical-first", () => {
    render(<TopFindings findings={findings} />);
    const items = screen.getAllByTestId(/finding-/);
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Critical finding");
  });

  it("filters findings by severity", () => {
    render(<TopFindings findings={findings} />);
    fireEvent.change(screen.getByTestId("findings-filter"), { target: { value: "critical" } });
    expect(screen.getAllByTestId(/finding-/)).toHaveLength(1);
    expect(screen.getByText("Critical finding")).toBeInTheDocument();
  });

  it("shows empty message when filter matches nothing", () => {
    render(<TopFindings findings={[]} />);
    fireEvent.change(screen.getByTestId("findings-filter"), { target: { value: "all" } });
    expect(screen.getByText("No findings match this filter.")).toBeInTheDocument();
  });
});

describe("RoadmapTableView", () => {
  it("renders timeline view by default", () => {
    render(<RoadmapTableView timelineContent={<div data-testid="timeline-content">Timeline</div>} />);
    expect(screen.getByTestId("timeline-view")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-content")).toBeInTheDocument();
  });

  it("switches to table view when table tab clicked", () => {
    render(
      <RoadmapTableView
        timelineContent={<div data-testid="timeline-content">Timeline</div>}
        tableContent={<div data-testid="table-content">Table</div>}
      />
    );
    fireEvent.click(screen.getByTestId("view-toggle-table"));
    expect(screen.getByTestId("table-view")).toBeInTheDocument();
    expect(screen.getByTestId("table-content")).toBeInTheDocument();
  });

  it("calls onViewChange when toggled", () => {
    const onViewChange = vi.fn();
    render(<RoadmapTableView onViewChange={onViewChange} />);
    fireEvent.click(screen.getByTestId("view-toggle-table"));
    expect(onViewChange).toHaveBeenCalledWith("table");
  });
});
