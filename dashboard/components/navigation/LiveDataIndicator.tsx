"use client";

/**
 * LiveDataIndicator displays real-time data sync status.
 *
 * Spec: Section 8.3
 * - Desktop/Tablet: green pill badge with dot + "Live API data" + timestamp
 * - Mobile: compact inline dot + "Live" text only
 */
export interface LiveDataIndicatorProps {
  timestamp?: string;
  isLive?: boolean;
  variant?: "desktop" | "mobile";
}

export default function LiveDataIndicator({
  timestamp,
  isLive = true,
  variant = "desktop",
}: LiveDataIndicatorProps) {
  const dotColor = isLive ? "var(--color-status-success)" : "var(--color-status-neutral)";
  const text = isLive ? (variant === "mobile" ? "Live" : "Live API data") : "Offline";

  if (variant === "mobile") {
    return (
      <span
        data-testid="live-data-indicator"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
          color: isLive ? "var(--color-status-success)" : "var(--color-status-neutral)",
          fontSize: "var(--font-size-caption)",
          fontWeight: 500,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: dotColor,
          }}
          aria-hidden="true"
        />
        {text}
      </span>
    );
  }

  return (
    <div
      data-testid="live-data-indicator"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-1) var(--space-3)",
        borderRadius: "var(--radius-pill)",
        background: "var(--color-fill-success)",
        color: "var(--color-status-success)",
        fontSize: "var(--font-size-caption)",
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: dotColor,
        }}
        aria-hidden="true"
      />
      <span>{text}</span>
      {timestamp && <span aria-label={`Last updated ${timestamp}`}>{timestamp}</span>}
    </div>
  );
}
