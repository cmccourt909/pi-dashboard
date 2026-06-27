import React from "react";

/**
 * CommandCenterFooter — minimal footer displaying "Powered by Lodestar AI"
 * branding with a compass mark icon.
 *
 * Validates: Requirements 8.5
 */

/** Small compass mark icon for the footer branding. */
function CompassMarkSmall() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 2L12 6M12 18L12 22M2 12L6 12M18 12L22 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M12 8L14.5 14.5L12 13L9.5 14.5L12 8Z" fill="currentColor" />
    </svg>
  );
}

export default function CommandCenterFooter() {
  return (
    <footer
      data-testid="command-center-footer"
      className="flex items-center justify-center gap-2 py-6"
      style={{ color: "var(--color-text-tertiary)" }}
    >
      <CompassMarkSmall />
      <span className="text-xs font-medium">Powered by Lodestar AI</span>
    </footer>
  );
}
