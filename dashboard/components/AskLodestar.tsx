"use client";

import { IconSparkles } from "@tabler/icons-react";

export interface AskLodestarProps {
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}

/**
 * AskLodestar button — an outlined Indigo button that triggers the AI chat
 * experience.
 *
 * Spec: Wave 4.1
 * - Outlined Indigo button
 * - ti-sparkles icon
 * - Placeholder on-click behaviour until chat scope defined
 */
export default function AskLodestar({
  onClick,
  disabled = false,
  label = "Ask Lodestar",
}: AskLodestarProps) {
  return (
    <button
      type="button"
      data-testid="ask-lodestar"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-2)",
        minHeight: 44,
        padding: "var(--space-2) var(--space-3)",
        border: "1px solid var(--color-interactive-primary)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-surface-card)",
        color: "var(--color-interactive-primary)",
        fontSize: "var(--font-size-body)",
        fontWeight: "var(--font-weight-medium)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "background 100ms ease, color 100ms ease",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "var(--color-interactive-primary)";
          e.currentTarget.style.color = "var(--color-text-inverse)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "var(--color-surface-card)";
          e.currentTarget.style.color = "var(--color-interactive-primary)";
        }
      }}
    >
      <IconSparkles size={18} stroke={1.5} />
      <span>{label}</span>
    </button>
  );
}
