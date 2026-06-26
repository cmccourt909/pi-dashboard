"use client";

/**
 * TodayLine — a 2px vertical coral-colored line indicating the current date
 * position within the active PI column.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

interface TodayLineProps {
  /** Start date of the PI */
  piStart: Date;
  /** End date of the PI */
  piEnd: Date;
  /** Width of the PI column in pixels */
  columnWidth: number;
  /** Current date (optional, defaults to now — useful for testing) */
  today?: Date;
}

/**
 * Pure utility function that calculates the horizontal pixel offset for the
 * today line within a PI column.
 *
 * Returns the pixel position from the left edge, or null if `today` falls
 * outside the [piStart, piEnd] range.
 *
 * Formula: (today - pi_start) / (pi_end - pi_start) * column_width
 */
export function calculateTodayLinePosition(
  today: Date,
  piStart: Date,
  piEnd: Date,
  columnWidth: number
): number | null {
  const todayMs = today.getTime();
  const startMs = piStart.getTime();
  const endMs = piEnd.getTime();

  // Today is outside the PI range — don't render
  if (todayMs < startMs || todayMs > endMs) {
    return null;
  }

  const totalDuration = endMs - startMs;

  // Edge case: PI start equals PI end (zero-length PI)
  if (totalDuration === 0) {
    return 0;
  }

  const elapsed = todayMs - startMs;
  return (elapsed / totalDuration) * columnWidth;
}

/**
 * TodayLine component — renders a 2px vertical coral line positioned
 * absolutely within the PI column container.
 *
 * Only renders when the current date falls within the PI date range.
 */
export default function TodayLine({
  piStart,
  piEnd,
  columnWidth,
  today,
}: TodayLineProps) {
  const currentDate = today ?? new Date();
  const position = calculateTodayLinePosition(currentDate, piStart, piEnd, columnWidth);

  // Do not render when current date falls outside the PI date range
  if (position === null) {
    return null;
  }

  return (
    <div
      data-testid="today-line"
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: `${position}px`,
        width: "2px",
        backgroundColor: "var(--color-brand-coral)",
        pointerEvents: "none",
        zIndex: 10,
      }}
    />
  );
}
