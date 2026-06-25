import React from "react";

/**
 * Segment width result from calculateSegmentWidths.
 */
export interface SegmentWidths {
  done: number;
  prog: number;
  todo: number;
}

/**
 * Calculate pixel widths for three Gantt bar segments.
 *
 * - Widths are proportional to percentages.
 * - Any non-zero segment gets at least 4px (minimum enforcement).
 * - Total of all segment widths equals columnWidth (±1px due to rounding).
 * - When enforcing minimums, excess is redistributed proportionally from larger segments.
 */
export function calculateSegmentWidths(
  donePct: number,
  progPct: number,
  todoPct: number,
  columnWidth: number
): SegmentWidths {
  const segments = [
    { key: "done" as const, pct: donePct },
    { key: "prog" as const, pct: progPct },
    { key: "todo" as const, pct: todoPct },
  ];

  const MIN_WIDTH = 4;

  // Start with proportional widths
  let widths: Record<string, number> = {
    done: (donePct / 100) * columnWidth,
    prog: (progPct / 100) * columnWidth,
    todo: (todoPct / 100) * columnWidth,
  };

  // Enforce minimum widths for non-zero segments
  // Calculate how much extra width we need to add
  let deficit = 0;
  const needsMinimum: string[] = [];
  const canShrink: string[] = [];

  for (const seg of segments) {
    if (seg.pct > 0 && widths[seg.key] < MIN_WIDTH) {
      deficit += MIN_WIDTH - widths[seg.key];
      needsMinimum.push(seg.key);
    } else if (seg.pct > 0 && widths[seg.key] > MIN_WIDTH) {
      canShrink.push(seg.key);
    }
  }

  // Set minimum widths
  for (const key of needsMinimum) {
    widths[key] = MIN_WIDTH;
  }

  // Redistribute deficit proportionally from segments that can shrink
  if (deficit > 0 && canShrink.length > 0) {
    const totalShrinkable = canShrink.reduce((sum, key) => sum + widths[key], 0);
    for (const key of canShrink) {
      const share = (widths[key] / totalShrinkable) * deficit;
      widths[key] -= share;
    }
  }

  // Round to integers and fix total to equal columnWidth exactly
  let roundedDone = Math.round(widths.done);
  let roundedProg = Math.round(widths.prog);
  let roundedTodo = Math.round(widths.todo);

  // Ensure minimum width is still enforced after rounding
  if (donePct > 0 && roundedDone < MIN_WIDTH) roundedDone = MIN_WIDTH;
  if (progPct > 0 && roundedProg < MIN_WIDTH) roundedProg = MIN_WIDTH;
  if (todoPct > 0 && roundedTodo < MIN_WIDTH) roundedTodo = MIN_WIDTH;

  // Adjust the largest segment to make total exactly columnWidth
  const total = roundedDone + roundedProg + roundedTodo;
  const diff = columnWidth - total;

  if (diff !== 0) {
    // Find the largest segment to absorb the rounding difference
    const sorted = segments
      .filter((s) => s.pct > 0)
      .sort((a, b) => {
        const widthA = a.key === "done" ? roundedDone : a.key === "prog" ? roundedProg : roundedTodo;
        const widthB = b.key === "done" ? roundedDone : b.key === "prog" ? roundedProg : roundedTodo;
        return widthB - widthA;
      });

    if (sorted.length > 0) {
      const targetKey = sorted[0].key;
      if (targetKey === "done") roundedDone += diff;
      else if (targetKey === "prog") roundedProg += diff;
      else roundedTodo += diff;
    }
  }

  // Final safety: ensure minimum widths after adjustment
  if (donePct > 0 && roundedDone < MIN_WIDTH) roundedDone = MIN_WIDTH;
  if (progPct > 0 && roundedProg < MIN_WIDTH) roundedProg = MIN_WIDTH;
  if (todoPct > 0 && roundedTodo < MIN_WIDTH) roundedTodo = MIN_WIDTH;

  // Zero-pct segments must be 0
  if (donePct === 0) roundedDone = 0;
  if (progPct === 0) roundedProg = 0;
  if (todoPct === 0) roundedTodo = 0;

  return { done: roundedDone, prog: roundedProg, todo: roundedTodo };
}

interface GanttBarProps {
  donePct: number;
  progPct: number;
  todoPct: number;
  columnWidth: number;
}

/**
 * GanttBar renders three contiguous colored segments representing
 * done (teal), in-progress (blue 60% opacity), and todo (gray 40% opacity).
 *
 * - Proportional segment widths based on percentages
 * - Minimum 4px width for non-zero segments
 * - Label inside Done segment when donePct >= 15, outside to right otherwise
 * - Accessible aria-label on each segment
 */
export default function GanttBar({
  donePct,
  progPct,
  todoPct,
  columnWidth,
}: GanttBarProps) {
  const widths = calculateSegmentWidths(donePct, progPct, todoPct, columnWidth);
  const labelInside = donePct >= 15;
  const label = `${Math.round(donePct)}%`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: columnWidth,
        position: "relative",
      }}
    >
      {/* Bar container */}
      <div
        style={{
          display: "flex",
          height: 20,
          borderRadius: 3,
          overflow: "hidden",
          width: widths.done + widths.prog + widths.todo,
        }}
      >
        {/* Done segment */}
        {donePct > 0 && (
          <div
            aria-label={`${Math.round(donePct)}% done`}
            style={{
              width: widths.done,
              height: "100%",
              backgroundColor: "#0d9488",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {labelInside && (
              <span
                style={{
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 600,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            )}
          </div>
        )}

        {/* In-progress segment */}
        {progPct > 0 && (
          <div
            aria-label={`${Math.round(progPct)}% in-progress`}
            style={{
              width: widths.prog,
              height: "100%",
              backgroundColor: "rgba(59, 130, 246, 0.6)",
            }}
          />
        )}

        {/* Todo segment */}
        {todoPct > 0 && (
          <div
            aria-label={`${Math.round(todoPct)}% todo`}
            style={{
              width: widths.todo,
              height: "100%",
              backgroundColor: "rgba(156, 163, 175, 0.4)",
            }}
          />
        )}
      </div>

      {/* Label outside to the right when donePct < 15 */}
      {!labelInside && (
        <span
          style={{
            marginLeft: 6,
            fontSize: 11,
            fontWeight: 600,
            color: "#374151",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
