import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import KPICard from "./KPICard";
import { KPIMetric } from "./types";

describe("KPICard", () => {
  it("renders label and value", () => {
    const metric: KPIMetric = { label: "Sprint velocity", value: 42 };
    render(<KPICard metric={metric} />);
    expect(screen.getByText("Sprint velocity")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
  });

  it("renders string value correctly", () => {
    const metric: KPIMetric = { label: "Days remaining", value: "15 days" };
    render(<KPICard metric={metric} />);
    expect(screen.getByText("15 days")).toBeDefined();
  });

  it("renders positive delta with + prefix and success color", () => {
    const metric: KPIMetric = { label: "Velocity", value: 38, delta: 5 };
    render(<KPICard metric={metric} />);
    const deltaEl = screen.getByText("+5");
    expect(deltaEl).toBeDefined();
    expect(deltaEl.style.color).toBe("var(--color-status-success)");
  });

  it("renders negative delta with - prefix and danger color", () => {
    const metric: KPIMetric = { label: "Blockers", value: 3, delta: -2 };
    render(<KPICard metric={metric} />);
    const deltaEl = screen.getByText("-2");
    expect(deltaEl).toBeDefined();
    expect(deltaEl.style.color).toBe("var(--color-status-danger)");
  });

  it("renders zero delta with neutral color", () => {
    const metric: KPIMetric = { label: "On track", value: 8, delta: 0 };
    render(<KPICard metric={metric} />);
    const deltaEl = screen.getByText("0");
    expect(deltaEl).toBeDefined();
    expect(deltaEl.style.color).toBe("var(--color-text-secondary)");
  });

  it("renders subtitle when provided", () => {
    const metric: KPIMetric = {
      label: "Forecast confidence",
      value: "82%",
      subtitle: "Monte Carlo P50",
    };
    render(<KPICard metric={metric} />);
    expect(screen.getByText("Monte Carlo P50")).toBeDefined();
  });

  it("does not render delta when undefined", () => {
    const metric: KPIMetric = { label: "Test", value: 10 };
    const { container } = render(<KPICard metric={metric} />);
    // No delta span should appear — only the subtitle area content
    const deltaSpans = container.querySelectorAll("[style*='color: var(--color-status']");
    expect(deltaSpans.length).toBe(0);
  });

  it("applies card shadow and border radius styles", () => {
    const metric: KPIMetric = { label: "Test", value: 0 };
    const { container } = render(<KPICard metric={metric} />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.boxShadow).toBe("var(--shadow-card)");
    expect(card.style.borderRadius).toBe("var(--radius-md)");
  });
});
