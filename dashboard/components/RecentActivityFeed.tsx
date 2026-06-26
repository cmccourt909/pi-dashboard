"use client";

import { IconRefresh, IconSparkles, IconAlertTriangle } from "@tabler/icons-react";

export type ActivityType = "sync" | "ai" | "finding";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string;
}

export interface RecentActivityFeedProps {
  activities?: ActivityItem[];
  title?: string;
}

const ACTIVITY_ICON: Record<ActivityType, typeof IconRefresh> = {
  sync: IconRefresh,
  ai: IconSparkles,
  finding: IconAlertTriangle,
};

const ACTIVITY_COLOR: Record<ActivityType, string> = {
  sync: "var(--color-status-success)",
  ai: "var(--color-interactive-secondary)",
  finding: "var(--color-status-danger)",
};

const ACTIVITY_BG: Record<ActivityType, string> = {
  sync: "var(--color-fill-success)",
  ai: "var(--color-fill-info)",
  finding: "var(--color-fill-danger)",
};

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    id: "1",
    type: "sync",
    message: "Roadmap data synced from Jira",
    timestamp: "10 min ago",
  },
  {
    id: "2",
    type: "ai",
    message: "Lodestar generated a risk summary for PI 26.3",
    timestamp: "25 min ago",
  },
  {
    id: "3",
    type: "finding",
    message: "Critical dependency flagged between FEAT-12 and FEAT-18",
    timestamp: "1 hr ago",
  },
];

/**
 * RecentActivityFeed shows timestamped activity entries.
 *
 * Spec: Wave 4.4
 * - Color-coded by type: sync = Teal, AI = Sky Blue, finding = Coral
 * - Prop-driven until a real data source is defined
 */
export default function RecentActivityFeed({
  activities = DEFAULT_ACTIVITIES,
  title = "Recent Activity",
}: RecentActivityFeedProps) {
  return (
    <div
      data-testid="recent-activity-feed"
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
      }}
    >
      <h3
        style={{
          fontSize: "var(--font-size-body)",
          fontWeight: "var(--font-weight-semi)",
          color: "var(--color-text-primary)",
          margin: 0,
          marginBottom: "var(--space-4)",
        }}
      >
        {title}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {activities.map((activity) => {
          const Icon = ACTIVITY_ICON[activity.type];
          return (
            <div
              key={activity.id}
              data-testid={`activity-${activity.id}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-3)",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-md)",
                  background: ACTIVITY_BG[activity.type],
                  color: ACTIVITY_COLOR[activity.type],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={16} stroke={1.5} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: "var(--font-size-body)",
                    color: "var(--color-text-primary)",
                    margin: 0,
                    lineHeight: "var(--line-height-snug)",
                  }}
                >
                  {activity.message}
                </p>
                <p
                  style={{
                    fontSize: "var(--font-size-caption)",
                    color: "var(--color-text-tertiary)",
                    margin: 0,
                    marginTop: "var(--space-1)",
                  }}
                >
                  {activity.timestamp}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
