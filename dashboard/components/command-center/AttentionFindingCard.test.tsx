import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AttentionFindingCard from "./AttentionFindingCard";
import { AttentionFinding } from "./types";

const criticalFinding: AttentionFinding = {
  id: "f-1",
  severity: "critical",
  title: "Blocked feature: Auth module",
  description: "The auth module has been blocked for 3 sprints due to dependency.",
  recommendation: "Escalate to team lead and reassign dependency to unblocked team.",
  category: "blocker",
};

const warningFinding: AttentionFinding = {
  id: "f-2",
  severity: "warning",
  title: "Velocity decline in Sprint 4",
  description: "Team velocity dropped by 20% compared to the rolling average.",
  recommendation: "Review sprint scope and check for unplanned work intake.",
  category: "velocity",
};

describe("AttentionFindingCard", () => {
  it("renders severity badge, title, description, and recommendation", () => {
    render(<AttentionFindingCard finding={criticalFinding} />);
    expect(screen.getByText("critical")).toBeDefined();
    expect(screen.getByText("Blocked feature: Auth module")).toBeDefined();
    expect(screen.getByText(/auth module has been blocked/i)).toBeDefined();
    expect(screen.getByText(/Escalate to team lead/)).toBeDefined();
  });

  it("renders severity badge with pill border-radius", () => {
    const { container } = render(<AttentionFindingCard finding={criticalFinding} />);
    const badge = container.querySelector("[aria-label='Severity: critical']") as HTMLElement;
    expect(badge.style.borderRadius).toBe("var(--radius-pill)");
  });

  it("renders coral background for critical severity badge", () => {
    const { container } = render(<AttentionFindingCard finding={criticalFinding} />);
    const badge = container.querySelector("[aria-label='Severity: critical']") as HTMLElement;
    expect(badge.style.backgroundColor).toBe("var(--color-status-danger)");
  });

  it("renders amber background for warning severity badge", () => {
    const { container } = render(<AttentionFindingCard finding={warningFinding} />);
    const badge = container.querySelector("[aria-label='Severity: warning']") as HTMLElement;
    expect(badge.style.backgroundColor).toBe("var(--color-status-warning)");
  });

  it("applies visual emphasis (left border) for critical items", () => {
    const { container } = render(<AttentionFindingCard finding={criticalFinding} />);
    const card = container.querySelector("article") as HTMLElement;
    expect(card.className).toContain("border-l-4");
    expect(card.style.borderLeftColor).toBe("var(--color-status-danger)");
  });

  it("does not apply left border emphasis for warning items", () => {
    const { container } = render(<AttentionFindingCard finding={warningFinding} />);
    const card = container.querySelector("article") as HTMLElement;
    expect(card.className).not.toContain("border-l-4");
  });

  it("applies critical background tint for critical items", () => {
    const { container } = render(<AttentionFindingCard finding={criticalFinding} />);
    const card = container.querySelector("article") as HTMLElement;
    expect(card.style.backgroundColor).toBe("var(--color-surface-critical, rgba(239, 68, 68, 0.04))");
  });

  it("renders Address and Dismiss action buttons", () => {
    render(<AttentionFindingCard finding={criticalFinding} />);
    expect(screen.getByText("Address")).toBeDefined();
    expect(screen.getByText("Dismiss")).toBeDefined();
  });

  it("calls onAddress with finding id when Address button is clicked", () => {
    const onAddress = vi.fn();
    render(<AttentionFindingCard finding={criticalFinding} onAddress={onAddress} />);
    fireEvent.click(screen.getByText("Address"));
    expect(onAddress).toHaveBeenCalledWith("f-1");
  });

  it("calls onDismiss with finding id when Dismiss button is clicked", () => {
    const onDismiss = vi.fn();
    render(<AttentionFindingCard finding={criticalFinding} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledWith("f-1");
  });

  it("does not throw when Address is clicked without onAddress callback", () => {
    render(<AttentionFindingCard finding={criticalFinding} />);
    expect(() => fireEvent.click(screen.getByText("Address"))).not.toThrow();
  });

  it("does not throw when Dismiss is clicked without onDismiss callback", () => {
    render(<AttentionFindingCard finding={criticalFinding} />);
    expect(() => fireEvent.click(screen.getByText("Dismiss"))).not.toThrow();
  });

  it("renders accessible aria-label on the card", () => {
    render(<AttentionFindingCard finding={criticalFinding} />);
    expect(
      screen.getByLabelText("critical finding: Blocked feature: Auth module")
    ).toBeDefined();
  });

  it("renders accessible aria-labels on action buttons", () => {
    render(<AttentionFindingCard finding={criticalFinding} />);
    expect(
      screen.getByLabelText("Address finding: Blocked feature: Auth module")
    ).toBeDefined();
    expect(
      screen.getByLabelText("Dismiss finding: Blocked feature: Auth module")
    ).toBeDefined();
  });

  it("renders Lodestar AI recommendation section with aria-label", () => {
    render(<AttentionFindingCard finding={warningFinding} />);
    expect(screen.getByLabelText("Lodestar AI recommendation")).toBeDefined();
  });

  it("applies card shadow and border radius", () => {
    const { container } = render(<AttentionFindingCard finding={warningFinding} />);
    const card = container.querySelector("article") as HTMLElement;
    expect(card.style.boxShadow).toBe("var(--shadow-card)");
    expect(card.style.borderRadius).toBe("var(--radius-md)");
  });
});
