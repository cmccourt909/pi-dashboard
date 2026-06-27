import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import KPIStrip from "./KPIStrip";
import { KPIMetric } from "./types";

describe("KPIStrip", () => {
  const defaultMetrics: KPIMetric[] = [
    { label: "Sprint velocity", value: "42 pts", delta: 5, subtitle: "vs 37 planned" },
    { label: "Features on track", value: "8/10", delta: 2 },
    { label: "Active blockers", value: 3, delta: -1 },
    { label: "Days remaining", value: 14, subtitle: "ends 2025-02-28" },
    { label: "Forecast confidence", value: "72%", subtitle: "Monte Carlo P50" },
  ];

  it("renders 5 KPI cards with correct labels", () => {
    render(<KPIStrip metrics={defaultMetrics} />);

    expect(screen.getByText("Sprint velocity")).toBeInTheDocument();
    expect(screen.getByText("Features on track")).toBeInTheDocument();
    expect(screen.getByText("Active blockers")).toBeInTheDocument();
    expect(screen.getByText("Days remaining")).toBeInTheDocument();
    expect(screen.getByText("Forecast confidence")).toBeInTheDocument();
  });

  it("renders correct values for each metric", () => {
    render(<KPIStrip metrics={defaultMetrics} />);

    expect(screen.getByText("42 pts")).toBeInTheDocument();
    expect(screen.getByText("8/10")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
  });

  it("renders subtitles when provided", () => {
    render(<KPIStrip metrics={defaultMetrics} />);

    expect(screen.getByText("vs 37 planned")).toBeInTheDocument();
    expect(screen.getByText("ends 2025-02-28")).toBeInTheDocument();
    expect(screen.getByText("Monte Carlo P50")).toBeInTheDocument();
  });

  it("renders positive delta with teal (success) color", () => {
    render(<KPIStrip metrics={defaultMetrics} />);

    // Sprint velocity has delta: +5
    const positiveDelta = screen.getByText("+5");
    expect(positiveDelta).toBeInTheDocument();
    expect(positiveDelta).toHaveStyle({ color: "var(--color-status-success)" });
  });

  it("renders negative delta with coral (danger) color", () => {
    render(<KPIStrip metrics={defaultMetrics} />);

    // Active blockers has delta: -1
    const negativeDelta = screen.getByText("-1");
    expect(negativeDelta).toBeInTheDocument();
    expect(negativeDelta).toHaveStyle({ color: "var(--color-status-danger)" });
  });

  it("renders another positive delta with teal (success) color", () => {
    render(<KPIStrip metrics={defaultMetrics} />);

    // Features on track has delta: +2
    const positiveDelta = screen.getByText("+2");
    expect(positiveDelta).toBeInTheDocument();
    expect(positiveDelta).toHaveStyle({ color: "var(--color-status-success)" });
  });

  it("does not render delta when not provided", () => {
    const metricsWithoutDelta: KPIMetric[] = [
      { label: "Test metric", value: 100 },
    ];
    render(<KPIStrip metrics={metricsWithoutDelta} />);

    expect(screen.getByText("Test metric")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    // No delta text should be present
    expect(screen.queryByText("+0")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders with a grid layout", () => {
    const { container } = render(<KPIStrip metrics={defaultMetrics} />);
    const grid = container.firstChild as HTMLElement;
    expect(grid).toHaveClass("grid");
    expect(grid).toHaveClass("grid-cols-2");
    expect(grid).toHaveClass("md:grid-cols-5");
  });

  it("renders zero delta with neutral color", () => {
    const metricsWithZeroDelta: KPIMetric[] = [
      { label: "Neutral metric", value: 50, delta: 0 },
    ];
    render(<KPIStrip metrics={metricsWithZeroDelta} />);

    const zeroDelta = screen.getByText("0");
    expect(zeroDelta).toHaveStyle({ color: "var(--color-text-secondary)" });
  });
});
