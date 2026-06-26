"use client";

import React from "react";

export interface BlockerFlagProps {
  /** Whether this feature has cross-team blockers */
  hasCrossTeamBlocker: boolean;
  /** Click handler to open drawer to dependency section */
  onClick: (e: React.MouseEvent) => void;
}

/**
 * BlockerFlag renders a ⚠ icon for features with cross-team blocking dependencies.
 *
 * - Only displayed when hasCrossTeamBlocker is true
 * - On click, opens the Detail Drawer scrolled to the dependency section
 * - Accessible: button role with aria-label, visible focus indicator
 *
 * Requirements: 10.1, 10.2, 10.3
 */
export default function BlockerFlag({
  hasCrossTeamBlocker,
  onClick,
}: BlockerFlagProps) {
  if (!hasCrossTeamBlocker) {
    return null;
  }

  return (
    <button
      type="button"
      data-testid="blocker-flag"
      aria-label="View cross-team blockers"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      style={{
        background: "none",
        border: "2px solid transparent",
        cursor: "pointer",
        width: 44,
        height: 44,
        padding: 0,
        fontSize: 14,
        lineHeight: 1,
        borderRadius: 3,
        outline: "none",
      }}
      className="blocker-flag"
    >
      <span aria-hidden="true">⚠</span>
      <style>{`
        .blocker-flag:focus-visible {
          border-color: var(--color-brand-coral);
          box-shadow: 0 0 0 2px rgba(232, 93, 70, 0.3);
        }
      `}</style>
    </button>
  );
}
