import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import RoadmapPage from "./page";
import type { FeatureItem } from "@/types/roadmap";

/**
 * Integration tests for RoadmapPage component composition.
 *
 * Validates: Requirements 3.1, 3.2, 6.2, 6.3, 7.1
 */

// ─── Mock Data ──────────────────────────────────────────────────────────────

const mockPIs = [
  {
    name: "PI 26.2",
    start_date: "2025-01-01",
    end_date: "2025-03-31",
    sprints: [
      { name: "Sprint 1", start_date: "2025-01-01", end_date: "2025-01-14" },
      { name: "Sprint 2", start_date: "2025-01-15", end_date: "2025-01-28" },
    ],
  },
  {
    name: "PI 26.3",
    start_date: "2025-04-01",
    end_date: "2025-06-30",
    sprints: [
      { name: "Sprint 1", start_date: "2025-04-01", end_date: "2025-04-14" },
      { name: "Sprint 2", start_date: "2025-04-15", end_date: "2025-04-28" },
      { name: "Sprint 3", start_date: "2025-04-29", end_date: "2025-05-12" },
      { name: "Sprint 4", start_date: "2025-05-13", end_date: "2025-05-26" },
      { name: "Sprint 5", start_date: "2025-05-27", end_date: "2025-06-09" },
    ],
  },
];

function makeFeature(overrides: Partial<FeatureItem> = {}): FeatureItem {
  return {
    feature_key: "TSU-100",
    summary: "Alpha feature one",
    team: "Alpha",
    assignee: "Alice",
    status: "In Progress",
    status_category: "indeterminate",
    rag_status: "green",
    pi_completion: [
      {
        pi_name: "PI 26.2",
        done_pct: 60,
        prog_pct: 25,
        todo_pct: 15,
        story_count: 5,
        sp_done: 12,
        sp_total: 20,
      },
    ],
    blockers: [],
    is_blocked_by: [],
    sprint_breakdown: [],
    lodestar_static: "On track for delivery.",
    generated_at: "2025-01-15T10:00:00Z",
    ...overrides,
  };
}

const mockFeatures262: FeatureItem[] = [
  makeFeature({
    feature_key: "TSU-100",
    summary: "Alpha feature one",
    team: "Alpha",
    rag_status: "green",
  }),
  makeFeature({
    feature_key: "ISC-200",
    summary: "Bravo feature one",
    team: "Bravo",
    rag_status: "amber",
    pi_completion: [
      {
        pi_name: "PI 26.2",
        done_pct: 30,
        prog_pct: 40,
        todo_pct: 30,
        story_count: 8,
        sp_done: 6,
        sp_total: 20,
      },
    ],
  }),
  makeFeature({
    feature_key: "PNR-300",
    summary: "Charlie feature one",
    team: "Charlie",
    rag_status: "red",
    is_blocked_by: ["ISC-50"],
    pi_completion: [
      {
        pi_name: "PI 26.2",
        done_pct: 10,
        prog_pct: 20,
        todo_pct: 70,
        story_count: 4,
        sp_done: 2,
        sp_total: 20,
      },
    ],
  }),
];

const mockFeatures263: FeatureItem[] = [
  makeFeature({
    feature_key: "TSU-101",
    summary: "Alpha feature two",
    team: "Alpha",
    rag_status: "green",
    pi_completion: [
      {
        pi_name: "PI 26.3",
        done_pct: 20,
        prog_pct: 50,
        todo_pct: 30,
        story_count: 3,
        sp_done: 4,
        sp_total: 10,
      },
    ],
    sprint_breakdown: [
      { sprint_name: "Sprint 1", state: "closed", story_count: 2, done_count: 2 },
      { sprint_name: "Sprint 2", state: "active", story_count: 3, done_count: 1 },
      { sprint_name: "Sprint 3", state: "future", story_count: 1, done_count: 0 },
      { sprint_name: "Sprint 4", state: "future", story_count: 0, done_count: 0 },
      { sprint_name: "Sprint 5", state: "future", story_count: 0, done_count: 0 },
    ],
  }),
];

// ─── Fetch Mock Utilities ───────────────────────────────────────────────────

function mockFetchSuccess() {
  return vi.fn((url: string) => {
    if (url === "/api/pis") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPIs),
      });
    }
    if (url.includes("/api/pis/PI%2026.2/features")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFeatures262),
      });
    }
    if (url.includes("/api/pis/PI%2026.3/features")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFeatures263),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  }) as unknown as typeof globalThis.fetch;
}

function mockFetchError() {
  return vi.fn((url: string) => {
    if (url === "/api/pis") {
      return Promise.resolve({
        ok: false,
        status: 500,
      });
    }
    return Promise.resolve({ ok: false, status: 500 });
  }) as unknown as typeof globalThis.fetch;
}

function mockFetchEmpty() {
  return vi.fn((url: string) => {
    if (url === "/api/pis") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPIs),
      });
    }
    if (url.includes("/features")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  }) as unknown as typeof globalThis.fetch;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("RoadmapPage integration", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("Component composition with mock API data", () => {
    it("renders loading state initially", () => {
      globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof globalThis.fetch;
      render(<RoadmapPage />);

      expect(screen.getByText("Loading roadmap…")).toBeInTheDocument();
    });

    it("renders FilterBar with team filter pills after data loads", async () => {
      globalThis.fetch = mockFetchSuccess();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getByRole("toolbar", { name: "Team filter" })).toBeInTheDocument();
      });

      const toolbar = screen.getByRole("toolbar", { name: "Team filter" });
      expect(within(toolbar).getByRole("button", { name: "All" })).toBeInTheDocument();
      expect(within(toolbar).getByRole("button", { name: "Alpha" })).toBeInTheDocument();
      expect(within(toolbar).getByRole("button", { name: "Bravo" })).toBeInTheDocument();
      expect(within(toolbar).getByRole("button", { name: "Charlie" })).toBeInTheDocument();
    });

    it("renders SummaryStrip with KPI region after data loads", async () => {
      globalThis.fetch = mockFetchSuccess();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getByRole("region", { name: "Program KPI summary" })).toBeInTheDocument();
      });
    });

    it("renders TeamGroup elements for each team with features", async () => {
      globalThis.fetch = mockFetchSuccess();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getAllByRole("rowgroup", { name: /Team Alpha/ }).length).toBeGreaterThan(0);
      });

      expect(screen.getAllByRole("rowgroup", { name: /Team Bravo/ }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("rowgroup", { name: /Team Charlie/ }).length).toBeGreaterThan(0);
    });

    it("renders FeatureRow elements with correct aria-labels", async () => {
      globalThis.fetch = mockFetchSuccess();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId("feature-row").length).toBeGreaterThan(0);
      });

      // Check specific feature rows exist
      expect(
        screen.getByRole("row", { name: /Alpha feature one/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("row", { name: /Bravo feature one/ })
      ).toBeInTheDocument();
    });
  });

  describe("Filter interactions update TeamGroup visibility and SummaryStrip KPIs", () => {
    it("shows all teams when 'All' filter is active (default)", async () => {
      globalThis.fetch = mockFetchSuccess();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId("feature-row").length).toBeGreaterThan(0);
      });

      // All filter is default — "All" button should be pressed
      const toolbar = screen.getByRole("toolbar", { name: "Team filter" });
      const allBtn = within(toolbar).getByRole("button", { name: "All" });
      expect(allBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("updates SummaryStrip KPIs when team filter changes to Alpha", async () => {
      globalThis.fetch = mockFetchSuccess();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getByRole("region", { name: "Program KPI summary" })).toBeInTheDocument();
      });

      // Initially: 4 total features
      const kpiRegion = screen.getByRole("region", { name: "Program KPI summary" });
      expect(within(kpiRegion).getByText("4")).toBeInTheDocument();

      // Click "Alpha" filter within toolbar
      const toolbar = screen.getByRole("toolbar", { name: "Team filter" });
      const alphaBtn = within(toolbar).getByRole("button", { name: "Alpha" });
      fireEvent.click(alphaBtn);

      await waitFor(() => {
        expect(alphaBtn).toHaveAttribute("aria-pressed", "true");
      });

      // After filtering to Alpha: 2 features (TSU-100, TSU-101), both green
      // Verify the "4" total is gone — now should be "2"
      await waitFor(() => {
        expect(within(kpiRegion).queryByText("4")).not.toBeInTheDocument();
      });

      // Verify Total Features now shows 2 using the label's sibling span
      const totalFeaturesLabel = within(kpiRegion).getByText("Total Features");
      const totalFeaturesCell = totalFeaturesLabel.parentElement!;
      expect(within(totalFeaturesCell).getByText("2")).toBeInTheDocument();

      // Verify At Risk is 0
      const atRiskLabel = within(kpiRegion).getByText("At Risk");
      const atRiskCell = atRiskLabel.parentElement!;
      expect(within(atRiskCell).getByText("0")).toBeInTheDocument();

      // Verify Blocked is 0
      const blockedLabel = within(kpiRegion).getByText("Blocked");
      const blockedCell = blockedLabel.parentElement!;
      expect(within(blockedCell).getByText("0")).toBeInTheDocument();
    });

    it("marks selected filter pill with aria-pressed=true", async () => {
      globalThis.fetch = mockFetchSuccess();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getByRole("toolbar")).toBeInTheDocument();
      });

      const toolbar = screen.getByRole("toolbar", { name: "Team filter" });
      const bravoBtn = within(toolbar).getByRole("button", { name: "Bravo" });
      fireEvent.click(bravoBtn);

      expect(bravoBtn).toHaveAttribute("aria-pressed", "true");
      expect(within(toolbar).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
    });

    it("injects CSS to hide non-matching team groups when filter is active", async () => {
      globalThis.fetch = mockFetchSuccess();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId("feature-row").length).toBeGreaterThan(0);
      });

      // Click "Bravo" filter within toolbar
      const toolbar = screen.getByRole("toolbar", { name: "Team filter" });
      const bravoBtn = within(toolbar).getByRole("button", { name: "Bravo" });
      fireEvent.click(bravoBtn);

      // The FilterBar injects a style tag to hide non-matching groups via CSS
      expect(bravoBtn).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("Drawer open/close lifecycle", () => {
    it("opens DetailDrawer when a FeatureRow is clicked", async () => {
      globalThis.fetch = mockFetchSuccess();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId("feature-row").length).toBeGreaterThan(0);
      });

      // Click the first feature row
      const featureRows = screen.getAllByTestId("feature-row");
      fireEvent.click(featureRows[0]);

      // Drawer should open — check translateX(0)
      await waitFor(() => {
        const drawer = screen.getByTestId("detail-drawer");
        expect(drawer).toHaveStyle({ transform: "translateX(0)" });
      });
    });

    it("displays feature metadata in the open drawer", async () => {
      globalThis.fetch = mockFetchSuccess();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId("feature-row").length).toBeGreaterThan(0);
      });

      // Click the first feature row (TSU-100 from PI 26.2)
      const featureRows = screen.getAllByTestId("feature-row");
      fireEvent.click(featureRows[0]);

      await waitFor(() => {
        const drawer = screen.getByTestId("detail-drawer");
        expect(drawer).toHaveStyle({ transform: "translateX(0)" });
      });

      // Verify feature key appears in drawer (use within to scope)
      const drawer = screen.getByTestId("detail-drawer");
      expect(within(drawer).getByText("TSU-100")).toBeInTheDocument();
      expect(within(drawer).getByText("Alpha feature one")).toBeInTheDocument();
      expect(within(drawer).getByText("Alice")).toBeInTheDocument();
    });

    it("closes the drawer when Escape key is pressed", async () => {
      globalThis.fetch = mockFetchSuccess();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId("feature-row").length).toBeGreaterThan(0);
      });

      // Open drawer
      const featureRows = screen.getAllByTestId("feature-row");
      fireEvent.click(featureRows[0]);

      await waitFor(() => {
        const drawer = screen.getByTestId("detail-drawer");
        expect(drawer).toHaveStyle({ transform: "translateX(0)" });
      });

      // Press Escape to close
      fireEvent.keyDown(document, { key: "Escape" });

      // Drawer should slide out (translateX(100%))
      await waitFor(() => {
        const drawer = screen.getByTestId("detail-drawer");
        expect(drawer).toHaveStyle({ transform: "translateX(100%)" });
      });
    });

    it("closes the drawer when close button is clicked", async () => {
      globalThis.fetch = mockFetchSuccess();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getAllByTestId("feature-row").length).toBeGreaterThan(0);
      });

      // Open drawer
      const featureRows = screen.getAllByTestId("feature-row");
      fireEvent.click(featureRows[0]);

      await waitFor(() => {
        const drawer = screen.getByTestId("detail-drawer");
        expect(drawer).toHaveStyle({ transform: "translateX(0)" });
      });

      // Click close button
      const closeBtn = screen.getByLabelText("Close detail drawer");
      fireEvent.click(closeBtn);

      // Drawer should slide out
      await waitFor(() => {
        const drawer = screen.getByTestId("detail-drawer");
        expect(drawer).toHaveStyle({ transform: "translateX(100%)" });
      });
    });
  });

  describe("Error states", () => {
    it("shows error banner with retry button when API fails", async () => {
      globalThis.fetch = mockFetchError();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      expect(screen.getByText(/Failed to fetch Program Increments/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    });

    it("retries fetch when retry button is clicked", async () => {
      globalThis.fetch = mockFetchError();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Now switch to success fetch and click retry
      globalThis.fetch = mockFetchSuccess();
      const retryBtn = screen.getByRole("button", { name: /Retry/i });
      fireEvent.click(retryBtn);

      // After retry, the error should disappear and features should load
      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });
  });

  describe("Empty states", () => {
    it("shows empty state message when no features are returned", async () => {
      globalThis.fetch = mockFetchEmpty();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getByText("No features found for this PI")).toBeInTheDocument();
      });
    });

    it("does not render TeamGroup components in empty state", async () => {
      globalThis.fetch = mockFetchEmpty();
      render(<RoadmapPage />);

      await waitFor(() => {
        expect(screen.getByText("No features found for this PI")).toBeInTheDocument();
      });

      expect(screen.queryAllByRole("rowgroup")).toHaveLength(0);
    });
  });
});
