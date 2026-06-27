import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NeedsAttentionSection from "./NeedsAttentionSection";
import { AttentionFinding } from "./types";

describe("NeedsAttentionSection", () => {
  const criticalFinding: AttentionFinding = {
    id: "f-1",
    severity: "critical",
    title: "Blocked Feature Alpha",
    description: "Feature Alpha is blocked by unresolved dependency",
    recommendation: "Escalate to team lead immediately",
    category: "blockers",
  };

  const warningFinding: AttentionFinding = {
    id: "f-2",
    severity: "warning",
    title: "Sprint velocity declining",
    description: "Velocity has dropped 15% over last 2 sprints",
    recommendation: "Review capacity planning for next sprint",
    category: "velocity",
  };

  const secondWarningFinding: AttentionFinding = {
    id: "f-3",
    severity: "warning",
    title: "Scope creep detected",
    description: "3 new stories added mid-sprint",
    recommendation: "Discuss scope management with product owner",
    category: "scope",
  };

  // Requirement 5.2: Findings sorted by severity (critical first, then warning)
  describe("severity ordering", () => {
    it("renders critical findings before warning findings", () => {
      // Pass warning first to verify sorting happens
      const findings = [warningFinding, criticalFinding, secondWarningFinding];

      const { container } = render(
        <NeedsAttentionSection findings={findings} />
      );

      const articles = container.querySelectorAll("article");
      expect(articles).toHaveLength(3);

      // First article should be the critical finding
      expect(articles[0]).toHaveAttribute(
        "aria-label",
        "critical finding: Blocked Feature Alpha"
      );

      // Remaining articles should be warning findings
      expect(articles[1]).toHaveAttribute(
        "aria-label",
        "warning finding: Sprint velocity declining"
      );
      expect(articles[2]).toHaveAttribute(
        "aria-label",
        "warning finding: Scope creep detected"
      );
    });

    it("renders all critical findings before any warning findings when multiple of each", () => {
      const secondCritical: AttentionFinding = {
        id: "f-4",
        severity: "critical",
        title: "Data sync failure",
        description: "API sync has been failing for 2 hours",
        recommendation: "Check API health dashboard",
        category: "infrastructure",
      };

      // Interleaved order
      const findings = [warningFinding, secondCritical, secondWarningFinding, criticalFinding];

      const { container } = render(
        <NeedsAttentionSection findings={findings} />
      );

      const articles = container.querySelectorAll("article");
      expect(articles).toHaveLength(4);

      // First two should be critical
      expect(articles[0]).toHaveAccessibleName(
        expect.stringContaining("critical finding")
      );
      expect(articles[1]).toHaveAccessibleName(
        expect.stringContaining("critical finding")
      );

      // Last two should be warning
      expect(articles[2]).toHaveAccessibleName(
        expect.stringContaining("warning finding")
      );
      expect(articles[3]).toHaveAccessibleName(
        expect.stringContaining("warning finding")
      );
    });
  });

  // Requirement 5.6: Empty state message
  describe("empty state", () => {
    it("displays 'All clear — no items need attention' when no findings", () => {
      render(<NeedsAttentionSection findings={[]} />);

      expect(
        screen.getByText("All clear — no items need attention")
      ).toBeInTheDocument();
    });

    it("does not render any finding cards when findings array is empty", () => {
      const { container } = render(
        <NeedsAttentionSection findings={[]} />
      );

      const articles = container.querySelectorAll("article");
      expect(articles).toHaveLength(0);
    });
  });

  // Requirement 5.5: Action buttons trigger callbacks
  describe("action buttons", () => {
    it("calls onAddress with finding id when Address button is clicked", () => {
      const onAddress = vi.fn();

      render(
        <NeedsAttentionSection
          findings={[criticalFinding]}
          onAddress={onAddress}
        />
      );

      const addressButton = screen.getByRole("button", {
        name: `Address finding: ${criticalFinding.title}`,
      });
      fireEvent.click(addressButton);

      expect(onAddress).toHaveBeenCalledTimes(1);
      expect(onAddress).toHaveBeenCalledWith("f-1");
    });

    it("calls onDismiss with finding id when Dismiss button is clicked", () => {
      const onDismiss = vi.fn();

      render(
        <NeedsAttentionSection
          findings={[criticalFinding]}
          onDismiss={onDismiss}
        />
      );

      const dismissButton = screen.getByRole("button", {
        name: `Dismiss finding: ${criticalFinding.title}`,
      });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledWith("f-1");
    });

    it("calls correct callback with correct id for each finding", () => {
      const onAddress = vi.fn();
      const onDismiss = vi.fn();

      render(
        <NeedsAttentionSection
          findings={[criticalFinding, warningFinding]}
          onAddress={onAddress}
          onDismiss={onDismiss}
        />
      );

      // Click Address on second finding (warning)
      const addressButtons = screen.getAllByRole("button", {
        name: /Address finding/,
      });
      fireEvent.click(addressButtons[1]);
      expect(onAddress).toHaveBeenCalledWith("f-2");

      // Click Dismiss on first finding (critical)
      const dismissButtons = screen.getAllByRole("button", {
        name: /Dismiss finding/,
      });
      fireEvent.click(dismissButtons[0]);
      expect(onDismiss).toHaveBeenCalledWith("f-1");
    });

    it("does not throw when onAddress is not provided", () => {
      render(<NeedsAttentionSection findings={[criticalFinding]} />);

      const addressButton = screen.getByRole("button", {
        name: `Address finding: ${criticalFinding.title}`,
      });

      expect(() => fireEvent.click(addressButton)).not.toThrow();
    });

    it("does not throw when onDismiss is not provided", () => {
      render(<NeedsAttentionSection findings={[criticalFinding]} />);

      const dismissButton = screen.getByRole("button", {
        name: `Dismiss finding: ${criticalFinding.title}`,
      });

      expect(() => fireEvent.click(dismissButton)).not.toThrow();
    });
  });

  // General rendering
  describe("rendering", () => {
    it("renders section with correct aria-label", () => {
      render(<NeedsAttentionSection findings={[]} />);

      expect(
        screen.getByRole("region", { name: "Needs attention" })
      ).toBeInTheDocument();
    });

    it("renders section heading", () => {
      render(<NeedsAttentionSection findings={[criticalFinding]} />);

      expect(
        screen.getByRole("heading", { name: "Needs attention" })
      ).toBeInTheDocument();
    });
  });
});
