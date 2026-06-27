import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PIHealthSection from "./PIHealthSection";
import type { TeamHealth } from "./types";

const sampleTeams: TeamHealth[] = [
  { name: "Team Alpha", status: "healthy", completionPct: 80 },
  { name: "Team Beta", status: "at-risk", completionPct: 45 },
  { name: "Team Gamma", status: "critical", completionPct: 20 },
];

describe("PIHealthSection", () => {
  it("renders the overall progress bar with correct aria attributes", () => {
    render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={72}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "72");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
  });

  it("renders progress bar fill width proportional to percentage", () => {
    render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={55}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveStyle({ width: "55%" });
  });

  it("clamps percentage to 0-100 range for display", () => {
    const { rerender } = render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={150}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    let progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "100");
    expect(progressBar).toHaveStyle({ width: "100%" });

    rerender(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={-20}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    expect(progressBar).toHaveStyle({ width: "0%" });
  });

  it("uses success color for progress bar when >= 60%", () => {
    render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={75}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveStyle({
      backgroundColor: "var(--color-status-success)",
    });
  });

  it("uses warning color for progress bar when 30-59%", () => {
    render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={45}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveStyle({
      backgroundColor: "var(--color-status-warning)",
    });
  });

  it("uses danger color for progress bar when < 30%", () => {
    render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={15}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveStyle({
      backgroundColor: "var(--color-status-danger)",
    });
  });

  it("renders all team health rows", () => {
    render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={72}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(screen.getByText("Team Beta")).toBeInTheDocument();
    expect(screen.getByText("Team Gamma")).toBeInTheDocument();
  });

  it("displays days remaining", () => {
    render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={72}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    expect(screen.getByText("14 days remaining")).toBeInTheDocument();
  });

  it("displays the PI name", () => {
    render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={72}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    expect(screen.getByText("PI-24.3")).toBeInTheDocument();
  });

  it("shows empty state when teams array is empty", () => {
    render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={72}
        teams={[]}
        daysRemaining={14}
      />
    );

    expect(
      screen.getByText("No program increment data available")
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows empty state when piName is empty", () => {
    render(
      <PIHealthSection
        piName=""
        overallCompletionPct={72}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    expect(
      screen.getByText("No program increment data available")
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("renders team rows with correct status colors (teal, amber, coral)", () => {
    const { container } = render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={72}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    // Find all status indicator dots (aria-hidden spans within team rows)
    const dots = container.querySelectorAll(
      "[aria-hidden='true']"
    ) as NodeListOf<HTMLElement>;

    // Team Alpha is healthy → teal (success)
    expect(dots[0].style.backgroundColor).toBe("var(--color-status-success)");
    // Team Beta is at-risk → amber (warning)
    expect(dots[1].style.backgroundColor).toBe("var(--color-status-warning)");
    // Team Gamma is critical → coral (danger)
    expect(dots[2].style.backgroundColor).toBe("var(--color-status-danger)");
  });

  it("applies visual emphasis to critical teams (bold text and coral border)", () => {
    const { container } = render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={72}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    // Find the row for Team Gamma (critical) - it has font-bold and a coral left border
    const gammaText = screen.getByText("Team Gamma");
    const gammaRow = gammaText.closest(
      "[style*='border-left']"
    ) as HTMLElement;

    expect(gammaRow).not.toBeNull();
    expect(gammaRow.className).toContain("font-bold");
    expect(gammaRow.style.borderLeft).toBe(
      "3px solid var(--color-status-danger)"
    );
  });

  it("does not apply visual emphasis to healthy or at-risk teams", () => {
    const { container } = render(
      <PIHealthSection
        piName="PI-24.3"
        overallCompletionPct={72}
        teams={sampleTeams}
        daysRemaining={14}
      />
    );

    // Team Alpha (healthy) should not have bold or coral border
    const alphaText = screen.getByText("Team Alpha");
    const alphaRow = alphaText.closest(
      "[style*='border-left']"
    ) as HTMLElement;

    expect(alphaRow).not.toBeNull();
    expect(alphaRow.className).not.toContain("font-bold");
    expect(alphaRow.style.borderLeft).toBe("3px solid transparent");

    // Team Beta (at-risk) should not have bold or coral border
    const betaText = screen.getByText("Team Beta");
    const betaRow = betaText.closest(
      "[style*='border-left']"
    ) as HTMLElement;

    expect(betaRow).not.toBeNull();
    expect(betaRow.className).not.toContain("font-bold");
    expect(betaRow.style.borderLeft).toBe("3px solid transparent");
  });
});
