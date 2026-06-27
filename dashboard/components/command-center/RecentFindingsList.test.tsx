import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RecentFindingsList, { RecentFinding } from "./RecentFindingsList";

describe("RecentFindingsList", () => {
  const sampleFindings: RecentFinding[] = [
    { id: "1", severity: "critical", title: "Blocked feature detected" },
    { id: "2", severity: "warning", title: "Sprint velocity declining" },
    { id: "3", severity: "info", title: "New team member onboarded" },
  ];

  it("renders the section heading", () => {
    render(<RecentFindingsList findings={sampleFindings} />);
    expect(screen.getByText("Recent findings")).toBeInTheDocument();
  });

  it("renders all finding titles", () => {
    render(<RecentFindingsList findings={sampleFindings} />);
    expect(screen.getByText("Blocked feature detected")).toBeInTheDocument();
    expect(screen.getByText("Sprint velocity declining")).toBeInTheDocument();
    expect(screen.getByText("New team member onboarded")).toBeInTheDocument();
  });

  it("renders severity badges for each finding", () => {
    render(<RecentFindingsList findings={sampleFindings} />);
    expect(screen.getByText("critical")).toBeInTheDocument();
    expect(screen.getByText("warning")).toBeInTheDocument();
    expect(screen.getByText("info")).toBeInTheDocument();
  });

  it("applies pill-shaped border radius to severity badges", () => {
    render(<RecentFindingsList findings={sampleFindings} />);
    const criticalBadge = screen.getByText("critical");
    expect(criticalBadge).toHaveStyle({ borderRadius: "var(--radius-pill)" });
  });

  it("applies correct badge color for critical severity", () => {
    render(<RecentFindingsList findings={sampleFindings} />);
    const badge = screen.getByText("critical");
    expect(badge).toHaveStyle({ backgroundColor: "var(--color-status-danger)" });
  });

  it("applies correct badge color for warning severity", () => {
    render(<RecentFindingsList findings={sampleFindings} />);
    const badge = screen.getByText("warning");
    expect(badge).toHaveStyle({ backgroundColor: "var(--color-status-warning)" });
  });

  it("applies correct badge color for info severity", () => {
    render(<RecentFindingsList findings={sampleFindings} />);
    const badge = screen.getByText("info");
    expect(badge).toHaveStyle({ backgroundColor: "var(--color-text-secondary)" });
  });

  it("displays empty state message when no findings provided", () => {
    render(<RecentFindingsList findings={[]} />);
    expect(screen.getByText("No recent findings")).toBeInTheDocument();
  });

  it("does not render a list when findings array is empty", () => {
    const { container } = render(<RecentFindingsList findings={[]} />);
    expect(container.querySelector("ul")).toBeNull();
  });

  it("renders a list element when findings are provided", () => {
    const { container } = render(<RecentFindingsList findings={sampleFindings} />);
    expect(container.querySelector("ul")).not.toBeNull();
  });

  it("renders the correct number of list items", () => {
    const { container } = render(<RecentFindingsList findings={sampleFindings} />);
    const listItems = container.querySelectorAll("li");
    expect(listItems.length).toBe(3);
  });
});
