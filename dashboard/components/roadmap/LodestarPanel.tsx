"use client";

/**
 * LodestarPanel displays AI-generated delivery narrative text within the Detail Drawer.
 *
 * Shows "AI narrative not yet generated" placeholder when lodestar_static is null.
 *
 * Requirements: 7.6
 */

interface LodestarPanelProps {
  text: string | null;
}

export default function LodestarPanel({ text }: LodestarPanelProps) {
  return (
    <div
      role="region"
      aria-label="Lodestar Analysis"
      style={{
        padding: "12px 0",
        borderTop: "1px solid #e2e8f0",
      }}
    >
      <h4
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#64748b",
          marginBottom: 8,
          margin: 0,
          paddingBottom: 8,
        }}
      >
        Lodestar Analysis
      </h4>
      {text ? (
        <p
          data-testid="lodestar-text"
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "#334155",
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {text}
        </p>
      ) : (
        <p
          data-testid="lodestar-placeholder"
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "#9ca3af",
            margin: 0,
            fontStyle: "italic",
          }}
        >
          AI narrative not yet generated
        </p>
      )}
    </div>
  );
}
