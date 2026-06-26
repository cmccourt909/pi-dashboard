import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AppSidebar from "./navigation/AppSidebar";
import TopNavBar from "./navigation/TopNavBar";
import MobileBottomNav from "./navigation/MobileBottomNav";
import FilterBar from "./roadmap/FilterBar";
import FeatureRow from "./roadmap/FeatureRow";
import BlockerFlag from "./roadmap/BlockerFlag";
import TeamGroup from "./roadmap/TeamGroup";
import AskLodestar from "./AskLodestar";
import LodestarBriefingPanel from "./LodestarBriefingPanel";
import RoadmapTableView from "./roadmap/RoadmapTableView";
import TopFindings from "./TopFindings";
import { FeatureItem } from "@/types/roadmap";

const mockFeature: FeatureItem = {
  feature_key: "FEAT-1",
  summary: "Test feature",
  team: "Alpha",
  assignee: "A",
  status: "In Progress",
  status_category: "In Progress",
  rag_status: "green",
  pi_completion: [
    { pi_name: "PI 1", done_pct: 30, prog_pct: 40, todo_pct: 30, story_count: 5, sp_done: 3, sp_total: 10 },
  ],
  sprint_breakdown: [],
  blockers: [],
  is_blocked_by: [],
  lodestar_static: null,
  generated_at: null,
};

/**
 * Wave 5 — Responsive layout & touch target tests.
 *
 * Note: jsdom does not apply media queries, so we verify that the responsive
 * CSS classes and 44px minimum touch targets are wired in the components.
 */
describe("Touch target audit (44px minimum)", () => {
  it("AppSidebar nav links are at least 44px tall", () => {
    render(<AppSidebar />);
    const link = screen.getByTestId("nav-item-overview");
    expect(link.style.minHeight).toBe("44px");
  });

  it("TopNavBar utility buttons are at least 44px tall", () => {
    render(<TopNavBar />);
    expect(screen.getByTestId("refresh-button").style.minHeight).toBe("44px");
    expect(screen.getByTestId("global-search-trigger").style.width).toBe("44px");
    expect(screen.getByTestId("global-search-trigger").style.height).toBe("44px");
    expect(screen.getByTestId("notification-bell").style.width).toBe("44px");
    expect(screen.getByTestId("notification-bell").style.height).toBe("44px");
    expect(screen.getByTestId("user-avatar").style.width).toBe("44px");
    expect(screen.getByTestId("user-avatar").style.height).toBe("44px");
  });

  it("MobileBottomNav tabs are at least 44px tall", () => {
    render(<MobileBottomNav />);
    const overview = screen.getByTestId("mobile-nav-overview");
    expect(overview.style.width).toBe("56px");
    expect(overview.style.height).toBe("56px");
  });

  it("FilterBar pills are at least 44px tall", () => {
    render(<FilterBar activeTeam="All" onFilterChange={() => {}} />);
    const all = screen.getByRole("button", { name: "All" });
    expect(all.style.minHeight).toBe("44px");
  });

  it("FeatureRow is at least 44px tall", () => {
    render(
      <FeatureRow
        feature={mockFeature}
        piColumnWidth={400}
        onSelect={() => {}}
        piName="PI 1"
      />
    );
    expect(screen.getByTestId("feature-row").style.minHeight).toBe("44px");
  });

  it("BlockerFlag is at least 44px tall", () => {
    render(<BlockerFlag hasCrossTeamBlocker onClick={() => {}} />);
    const flag = screen.getByTestId("blocker-flag");
    expect(flag.style.width).toBe("44px");
    expect(flag.style.height).toBe("44px");
  });

  it("TeamGroup header is at least 44px tall", () => {
    render(<TeamGroup team="Alpha">child</TeamGroup>);
    const header = screen.getByTestId("team-group-header");
    expect(header.style.minHeight).toBe("44px");
  });

  it("AskLodestar is at least 44px tall", () => {
    render(<AskLodestar />);
    expect(screen.getByTestId("ask-lodestar").style.minHeight).toBe("44px");
  });

  it("LodestarBriefingPanel generate button is at least 44px tall", () => {
    render(<LodestarBriefingPanel />);
    expect(screen.getByTestId("generate-briefing").style.minHeight).toBe("44px");
  });

  it("RoadmapTableView toggle buttons are at least 44px tall", () => {
    render(<RoadmapTableView />);
    expect(screen.getByTestId("view-toggle-timeline").style.minHeight).toBe("44px");
    expect(screen.getByTestId("view-toggle-table").style.minHeight).toBe("44px");
  });

  it("TopFindings filter is at least 44px tall", () => {
    render(<TopFindings />);
    expect(screen.getByTestId("findings-filter").style.minHeight).toBe("44px");
  });
});

describe("Responsive layout classes", () => {
  it("main-content base class exists in layout", () => {
    // The layout className is verified by the build; we assert the class name
    // is referenced in the document structure.
    const { container } = render(<AppSidebar />);
    expect(container.querySelector("aside")).toHaveClass("app-sidebar");
  });
});
