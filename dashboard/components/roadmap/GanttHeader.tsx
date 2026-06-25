"use client";

/**
 * GanttHeader renders the horizontal timeline header for the roadmap Gantt chart.
 * It displays PI column headers with PI names, sprint bands showing date ranges,
 * and month labels along the top.
 *
 * Requirements: 1.1 (dual PI columns), 1.2 (sidebar + PI columns layout)
 */

export interface PIDateRange {
  name: string;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
}

export interface SprintDateRange {
  name: string;
  start: string; // ISO date string
  end: string;   // ISO date string
}

export interface PIColumnData {
  pi: PIDateRange;
  sprints: SprintDateRange[];
}

interface GanttHeaderProps {
  columns: PIColumnData[];
  columnWidth: number;
}

/** Generate month labels that fall within a PI's date range. */
function getMonthLabels(startDate: Date, endDate: Date, columnWidth: number) {
  const labels: { label: string; leftPct: number }[] = [];
  const totalMs = endDate.getTime() - startDate.getTime();
  if (totalMs <= 0) return labels;

  // Start from the first day of the month containing startDate
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (cursor <= endDate) {
    const monthStart = new Date(Math.max(cursor.getTime(), startDate.getTime()));
    const leftPct = ((monthStart.getTime() - startDate.getTime()) / totalMs) * 100;

    if (leftPct >= 0 && leftPct < 100) {
      labels.push({
        label: cursor.toLocaleDateString("en-US", { month: "short" }),
        leftPct,
      });
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return labels;
}

/** Calculate sprint position as percentage within the PI column. */
function getSprintPosition(
  sprintStart: Date,
  sprintEnd: Date,
  piStart: Date,
  piEnd: Date
) {
  const totalMs = piEnd.getTime() - piStart.getTime();
  if (totalMs <= 0) return { leftPct: 0, widthPct: 100 };

  const leftPct = Math.max(
    0,
    ((sprintStart.getTime() - piStart.getTime()) / totalMs) * 100
  );
  const rightPct = Math.min(
    100,
    ((sprintEnd.getTime() - piStart.getTime()) / totalMs) * 100
  );

  return {
    leftPct,
    widthPct: rightPct - leftPct,
  };
}

function formatSprintDates(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(s)} – ${fmt(e)}`;
}

export default function GanttHeader({ columns, columnWidth }: GanttHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid var(--color-border, #e2e8f0)",
        userSelect: "none",
      }}
      role="row"
      aria-label="Timeline header"
    >
      {columns.map((col) => {
        const piStart = new Date(col.pi.start_date);
        const piEnd = new Date(col.pi.end_date);
        const monthLabels = getMonthLabels(piStart, piEnd, columnWidth);

        return (
          <div
            key={col.pi.name}
            style={{
              width: columnWidth,
              minWidth: columnWidth,
              position: "relative",
              borderRight: "1px solid var(--color-border, #e2e8f0)",
            }}
            role="columnheader"
            aria-label={`Program Increment ${col.pi.name}`}
          >
            {/* PI Name Header */}
            <div
              style={{
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-indigo-900, #1e293b)",
                textAlign: "center",
                borderBottom: "1px solid var(--color-border, #e2e8f0)",
                background: "var(--color-indigo-50, #f8fafc)",
                letterSpacing: "0.02em",
              }}
            >
              {col.pi.name}
            </div>

            {/* Month Labels Row */}
            <div
              style={{
                position: "relative",
                height: 22,
                borderBottom: "1px solid var(--color-border, #e2e8f0)",
                background: "#fff",
              }}
            >
              {monthLabels.map((m) => (
                <span
                  key={m.label + m.leftPct}
                  style={{
                    position: "absolute",
                    left: `${m.leftPct}%`,
                    top: 4,
                    fontSize: 10,
                    fontWeight: 500,
                    color: "var(--color-text-muted, #64748b)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                    paddingLeft: 4,
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* Sprint Bands Row */}
            <div
              style={{
                position: "relative",
                height: 28,
                background: "#fff",
              }}
            >
              {col.sprints.map((sprint) => {
                const sprintStart = new Date(sprint.start);
                const sprintEnd = new Date(sprint.end);
                const { leftPct, widthPct } = getSprintPosition(
                  sprintStart,
                  sprintEnd,
                  piStart,
                  piEnd
                );

                return (
                  <div
                    key={sprint.name}
                    title={`${sprint.name}: ${formatSprintDates(sprint.start, sprint.end)}`}
                    style={{
                      position: "absolute",
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: 4,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 500,
                      color: "var(--color-text-muted, #64748b)",
                      background: "var(--color-indigo-100, #e8edf5)",
                      borderRadius: 3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      paddingInline: 2,
                    }}
                  >
                    {sprint.name.replace("Sprint ", "S")}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
