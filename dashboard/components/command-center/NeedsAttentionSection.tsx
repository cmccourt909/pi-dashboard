import React from "react";
import { AttentionFinding } from "./types";
import { sortBySeverity } from "./utils";
import AttentionFindingCard from "./AttentionFindingCard";

export interface NeedsAttentionSectionProps {
  findings: AttentionFinding[];
  onDismiss?: (id: string) => void;
  onAddress?: (id: string) => void;
}

/**
 * Renders a list of findings that require attention, sorted by severity
 * (critical first, then warning). Displays an empty state message when
 * no findings are present.
 *
 * Validates: Requirements 5.1, 5.2, 5.6
 */
export default function NeedsAttentionSection({
  findings,
  onDismiss,
  onAddress,
}: NeedsAttentionSectionProps) {
  const sorted = sortBySeverity(findings);

  return (
    <section aria-label="Needs attention">
      <h2
        className="text-lg font-semibold mb-4"
        style={{ color: "var(--color-text-primary)" }}
      >
        Needs attention
      </h2>

      {sorted.length === 0 ? (
        <p
          className="text-sm py-6 text-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          All clear — no items need attention
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map((finding) => (
            <AttentionFindingCard
              key={finding.id}
              finding={finding}
              onAddress={onAddress}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </section>
  );
}
