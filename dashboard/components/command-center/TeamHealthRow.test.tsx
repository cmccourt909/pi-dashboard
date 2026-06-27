import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TeamHealthRow from "./TeamHealthRow";
import { TeamHealth } from "./types";

describe("TeamHealthRow", () => {
  it("renders team name", () => {
    const team: TeamHealth = { name: "Platform", status: "healthy", completionPct: 80 };
    render(<TeamHealthRow team={team} />);
    expect(screen.getByText("Platform")).toBeDefined();
  });

  it("renders a status dot with teal color for healthy teams", () => {
    const team: TeamHealth = { name: "Core", status: "healthy", completionPct: 75 };
    const { container } = render(<TeamHealthRow team={team} />);
    const dot = container.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.backgroundColor).toBe("var(--color-status-success)");
  });

  it("renders a status dot with amber color for at-risk teams", () => {
    const team: TeamHealth = { name: "Mobile", status: "at-risk", completionPct: 45 };
    const { container } = render(<TeamHealthRow team={team} />);
    const dot = container.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.backgroundColor).toBe("var(--color-status-warning)");
  });

  it("renders a status dot with coral color for critical teams", () => {
    const team: TeamHealth = { name: "Infra", status: "critical", completionPct: 20 };
    const { container } = render(<TeamHealthRow team={team} />);
    const dot = container.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(dot.style.backgroundColor).toBe("var(--color-status-danger)");
  });

  it("applies visual emphasis for critical teams (bold text and coral left border)", () => {
    const team: TeamHealth = { name: "Data", status: "critical", completionPct: 10 };
    const { container } = render(<TeamHealthRow team={team} />);
    const row = container.firstElementChild as HTMLElement;
    expect(row.className).toContain("font-bold");
    expect(row.style.borderLeft).toBe("3px solid var(--color-status-danger)");
  });

  it("does not apply visual emphasis for non-critical teams", () => {
    const team: TeamHealth = { name: "Frontend", status: "healthy", completionPct: 90 };
    const { container } = render(<TeamHealthRow team={team} />);
    const row = container.firstElementChild as HTMLElement;
    expect(row.className).not.toContain("font-bold");
    expect(row.style.borderLeft).toBe("3px solid transparent");
  });

  it("includes an accessible status label via sr-only span", () => {
    const team: TeamHealth = { name: "Backend", status: "at-risk", completionPct: 50 };
    render(<TeamHealthRow team={team} />);
    const srSpan = screen.getByText("at-risk");
    expect(srSpan.className).toContain("sr-only");
  });
});
