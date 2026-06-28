"use client"

import React from "react";
import { AttentionFinding } from "./types";

export interface AttentionFindingCardProps {
  finding: AttentionFinding;
  onAddress?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

/**
 * Renders a single attention finding card with severity badge, title,
 * description, Lodestar AI recommendation, and action buttons.
 *
 * Critical severity items receive stronger visual emphasis via a left border
 * and subtle background tint.
 *
 * Validates: Requirements 5.3, 5.4, 5.5, 8.3
 */
export default function AttentionFindingCard({
  finding,
  onAddress,
  onDismiss,
}: AttentionFindingCardProps) {
  const { id, severity, title, description, recommendation } = finding;

  const isCritical = severity === "critical";

  const badgeColor = isCritical
    ? "var(--color-status-danger)"
    : "var(--color-status-warning)";

  return (
    <article
      className={`flex flex-col gap-3 p-4 ${isCritical ? "border-l-4" : ""}`}
      style={{
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-md)",
        backgroundColor: isCritical
          ? "var(--color-surface-critical, rgba(239, 68, 68, 0.04))"
          : "var(--color-surface, #ffffff)",
        borderLeftColor: isCritical ? badgeColor : undefined,
      }}
      aria-label={`${severity} finding: ${title}`}
    >
      {/* Header: severity badge + title */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center px-2 py-0.5 text-xs font-semibold text-white capitalize"
          style={{
            borderRadius: "var(--radius-pill)",
            backgroundColor: badgeColor,
          }}
          aria-label={`Severity: ${severity}`}
        >
          {severity}
        </span>
        <h3
          className="text-sm font-semibold truncate"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </h3>
      </div>

      {/* Description */}
      <p
        className="text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {description}
      </p>

      {/* Lodestar AI recommendation */}
      <div
        className="flex items-start gap-2 p-2 rounded text-sm"
        style={{
          backgroundColor: "var(--color-surface-muted, rgba(0, 0, 0, 0.03))",
          color: "var(--color-text-primary)",
        }}
        aria-label="Lodestar AI recommendation"
      >
        <span className="shrink-0 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
          AI:
        </span>
        <span>{recommendation}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          className="px-3 py-1.5 text-xs font-medium text-white rounded"
          style={{
            backgroundColor: "var(--color-primary, #202670)",
            borderRadius: "var(--radius-md)",
          }}
          onClick={() => onAddress?.(id)}
          aria-label={`Address finding: ${title}`}
        >
          Address
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-xs font-medium rounded border"
          style={{
            color: "var(--color-text-secondary)",
            borderColor: "var(--color-border, #e2e8f0)",
            borderRadius: "var(--radius-md)",
          }}
          onClick={() => onDismiss?.(id)}
          aria-label={`Dismiss finding: ${title}`}
        >
          Dismiss
        </button>
      </div>
    </article>
  );
}

