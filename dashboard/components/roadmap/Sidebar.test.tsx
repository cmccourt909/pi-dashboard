import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Sidebar from "./Sidebar";
import type { FeatureItem } from "@/types/roadmap";

/** Helper to create a minimal FeatureItem for testing. */
function makeFeature(overrides: Partial<FeatureItem> = {}): FeatureItem {
  return {
    feature_key: "FEAT-1",
    summary: "Default Feature",
    team: "Alpha",
    assignee: null,
    status: "In Progress",
    status_category: "indeterminate",
    rag_status: "green",
    pi_completion: [],
    blockers: [],
    is_blocked_by: [],
    sprint_breakdown: [],
    lodestar_static: null,
    generated_at: null,
    ...overrides,
  };
}

const sampleFeatures: FeatureItem[] = [
  makeFeature({ feature_key: "TSU-101", summary: "Auth Service", team: "Alpha" }),
  makeFeature({ feature_key: "TSU-102", summary: "User Profile", team: "Alpha" }),
  makeFeature({ feature_key: "ISC-201", summary: "Payment Gateway", team: "Bravo" }),
  makeFeature({ feature_key: "PNR-301", summary: "Notification System", team: "Charlie" }),
];

describe("Sidebar", () => {
  it("renders with 200px fixed width", () => {
    const { container } = render(
      <Sidebar features={sampleFeatures} activeTeam="All" />
    );

    const aside = container.querySelector("[data-testid='sidebar']") as HTMLElement;
    expect(aside.style.width).toBe("200px");
    expect(aside.style.minWidth).toBe("200px");
    expect(aside.style.maxWidth).toBe("200px");
  });

  it("groups features by team with team headers", () => {
    render(<Sidebar features={sampleFeatures} activeTeam="All" />);

    expect(screen.getByLabelText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByLabelText("Team Bravo")).toBeInTheDocument();
    expect(screen.getByLabelText("Team Charlie")).toBeInTheDocument();
  });

  it("displays feature_key and summary for each feature", () => {
    render(<Sidebar features={sampleFeatures} activeTeam="All" />);

    expect(screen.getByText("TSU-101")).toBeInTheDocument();
    expect(screen.getByText("Auth Service")).toBeInTheDocument();
    expect(screen.getByText("ISC-201")).toBeInTheDocument();
    expect(screen.getByText("Payment Gateway")).toBeInTheDocument();
  });

  it("hides non-matching team groups when a specific team filter is active", () => {
    const { container } = render(
      <Sidebar features={sampleFeatures} activeTeam="Alpha" />
    );

    const alphaGroup = container.querySelector("[data-team='Alpha']") as HTMLElement;
    const bravoGroup = container.querySelector("[data-team='Bravo']") as HTMLElement;
    const charlieGroup = container.querySelector("[data-team='Charlie']") as HTMLElement;

    expect(alphaGroup.style.display).toBe("block");
    expect(bravoGroup.style.display).toBe("none");
    expect(charlieGroup.style.display).toBe("none");
  });

  it("shows all team groups when activeTeam is All", () => {
    const { container } = render(
      <Sidebar features={sampleFeatures} activeTeam="All" />
    );

    const alphaGroup = container.querySelector("[data-team='Alpha']") as HTMLElement;
    const bravoGroup = container.querySelector("[data-team='Bravo']") as HTMLElement;
    const charlieGroup = container.querySelector("[data-team='Charlie']") as HTMLElement;

    expect(alphaGroup.style.display).toBe("block");
    expect(bravoGroup.style.display).toBe("block");
    expect(charlieGroup.style.display).toBe("block");
  });

  it("calls onFeatureClick when a feature label is clicked", () => {
    const handleClick = vi.fn();
    render(
      <Sidebar
        features={sampleFeatures}
        activeTeam="All"
        onFeatureClick={handleClick}
      />
    );

    const featureLabel = screen.getByLabelText("TSU-101: Auth Service");
    fireEvent.click(featureLabel);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(sampleFeatures[0]);
  });

  it("calls onFeatureClick on Enter key press", () => {
    const handleClick = vi.fn();
    render(
      <Sidebar
        features={sampleFeatures}
        activeTeam="All"
        onFeatureClick={handleClick}
      />
    );

    const featureLabel = screen.getByLabelText("ISC-201: Payment Gateway");
    fireEvent.keyDown(featureLabel, { key: "Enter" });

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(sampleFeatures[2]);
  });

  it("applies team-group CSS classes and data-team attribute for CSS filtering", () => {
    const { container } = render(
      <Sidebar features={sampleFeatures} activeTeam="All" />
    );

    const bravoGroup = container.querySelector("[data-team='Bravo']") as HTMLElement;
    expect(bravoGroup.classList.contains("team-group")).toBe(true);
    expect(bravoGroup.classList.contains("team-group-bravo")).toBe(true);
  });

  it("does not render empty team groups", () => {
    const alphaOnly = [
      makeFeature({ feature_key: "TSU-100", summary: "Only Alpha", team: "Alpha" }),
    ];

    const { container } = render(
      <Sidebar features={alphaOnly} activeTeam="All" />
    );

    expect(container.querySelector("[data-team='Bravo']")).toBeNull();
    expect(container.querySelector("[data-team='Charlie']")).toBeNull();
  });

  it("truncates long feature summaries with ellipsis", () => {
    const longFeature = makeFeature({
      feature_key: "TSU-999",
      summary: "This is a very long feature summary that should be truncated in the sidebar",
      team: "Alpha",
    });

    const { container } = render(
      <Sidebar features={[longFeature]} activeTeam="All" />
    );

    const label = container.querySelector(
      "[data-feature-key='TSU-999']"
    ) as HTMLElement;
    expect(label.style.overflow).toBe("hidden");
    expect(label.style.textOverflow).toBe("ellipsis");
    expect(label.style.whiteSpace).toBe("nowrap");
  });

  it("renders with accessible aria-label on the aside element", () => {
    render(<Sidebar features={sampleFeatures} activeTeam="All" />);

    expect(
      screen.getByLabelText("Feature list sidebar")
    ).toBeInTheDocument();
  });
});
