"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import type { FeatureItem, Team } from "@/types/roadmap";
import type { TeamFilter } from "@/components/roadmap/FilterBar";
import type { PIColumnData } from "@/components/roadmap/GanttHeader";
import ErrorBoundary from "@/components/ErrorBoundary";
import GanttHeader from "@/components/roadmap/GanttHeader";
import SummaryStrip from "@/components/roadmap/SummaryStrip";
import Sidebar from "@/components/roadmap/Sidebar";
import FilterBar from "@/components/roadmap/FilterBar";
import TeamGroup from "@/components/roadmap/TeamGroup";
import FeatureRow from "@/components/roadmap/FeatureRow";
import DetailDrawer from "@/components/roadmap/DetailDrawer";
import TodayLine from "@/components/roadmap/TodayLine";

/**
 * RoadmapPage — the top-level page component for the WaypointPI Program Roadmap.
 *
 * Fetches PI 26.2 and PI 26.3 feature data in parallel and renders a dual-PI
 * column Gantt chart with team filtering, a detail drawer, and KPI summary.
 *
 * Requirements: 1.1, 1.3, 1.4, 3.1, 3.2, 3.3
 */

/** PI column width constant */
const PI_COLUMN_WIDTH = 400;

/** Team display order */
const TEAMS: Team[] = ["Alpha", "Bravo", "Charlie"];

/** Shape of a PI summary returned by GET /api/pis */
interface PISummaryResponse {
  name: string;
  start_date: string;
  end_date: string;
  sprints: { name: string; start_date: string | null; end_date: string | null }[];
}

export default function RoadmapPage() {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [piData, setPiData] = useState<PISummaryResponse[]>([]);
  const [piFeatures, setPiFeatures] = useState<FeatureItem[][]>([]);
  const [activeTeam, setActiveTeam] = useState<TeamFilter>("All");
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch PI metadata first to get names and date ranges
      const pisRes = await fetch("/api/pis");
      if (!pisRes.ok) throw new Error("Failed to fetch Program Increments");
      const pis: PISummaryResponse[] = await pisRes.json();
      setPiData(pis);

      if (pis.length === 0) {
        setPiFeatures([]);
        setLoading(false);
        return;
      }

      // Fetch features for ALL PIs in parallel
      const featureResponses = await Promise.all(
        pis.map((p) => fetch(`/api/pis/${encodeURIComponent(p.name)}/features`))
      );

      for (const res of featureResponses) {
        if (!res.ok) {
          throw new Error(`Failed to fetch features for PI`);
        }
      }

      const featureData: FeatureItem[][] = await Promise.all(
        featureResponses.map((r) => r.json())
      );

      setPiFeatures(featureData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roadmap data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Derived data ───────────────────────────────────────────────────────────
  const allFeatures = useMemo(
    () => piFeatures.flat(),
    [piFeatures]
  );

  /** Features filtered by team for the SummaryStrip KPI calculation */
  const filteredFeatures = useMemo(() => {
    if (activeTeam === "All") return allFeatures;
    return allFeatures.filter((f) => f.team === activeTeam);
  }, [allFeatures, activeTeam]);

  /** Group features by team for a given PI dataset */
  const groupByTeam = useCallback((features: FeatureItem[]) => {
    return TEAMS.reduce<Record<Team, FeatureItem[]>>(
      (acc, team) => {
        acc[team] = features.filter((f) => f.team === team);
        return acc;
      },
      { Alpha: [], Bravo: [], Charlie: [] }
    );
  }, []);

  /** Grouped features per PI (array of grouped records, one per PI) */
  const groupedByPI = useMemo(
    () => piFeatures.map((features) => groupByTeam(features)),
    [piFeatures, groupByTeam]
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleFeatureSelect = useCallback((feature: FeatureItem) => {
    setSelectedFeature(feature);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleFilterChange = useCallback((team: TeamFilter) => {
    setActiveTeam(team);
  }, []);

  // ─── Arrow key navigation handler for Feature_Rows ─────────────────────────
  const handlePIColumnKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      // Only handle arrow/home/end keys on feature-row elements
      if (!target.hasAttribute("data-testid") || target.getAttribute("data-testid") !== "feature-row") {
        return;
      }

      const column = e.currentTarget;
      // Get all visible feature rows in this PI column
      const rows = Array.from(
        column.querySelectorAll<HTMLElement>('[data-testid="feature-row"]')
      ).filter((row) => {
        // Only include rows that are visible (not hidden by filter)
        const teamGroup = row.closest(".team-group");
        if (teamGroup) {
          const style = window.getComputedStyle(teamGroup);
          if (style.display === "none") return false;
        }
        return true;
      });

      const currentIndex = rows.indexOf(target);
      if (currentIndex === -1) return;

      let nextIndex: number | null = null;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          nextIndex = Math.min(currentIndex + 1, rows.length - 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          nextIndex = Math.max(currentIndex - 1, 0);
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = rows.length - 1;
          break;
        default:
          return;
      }

      if (nextIndex !== null && rows[nextIndex]) {
        rows[nextIndex].focus();
      }
    },
    []
  );

  // ─── GanttHeader column data (derived from fetched PI data) ──────────────────
  const ganttColumns: PIColumnData[] = useMemo(
    () =>
      piData.map((pi) => ({
        pi: { name: pi.name, start_date: pi.start_date, end_date: pi.end_date },
        sprints: pi.sprints
          .filter((s) => s.start_date && s.end_date)
          .map((s) => ({
            name: s.name,
            start: s.start_date!,
            end: s.end_date!,
          })),
      })),
    [piData]
  );

  // ─── Render: Loading state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
          fontSize: 14,
          color: "#64748b",
        }}
      >
        Loading roadmap…
      </div>
    );
  }

  // ─── Render: Error state ────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        role="alert"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          gap: 12,
          padding: 24,
        }}
      >
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 6,
            padding: "16px 24px",
            textAlign: "center",
            maxWidth: 500,
          }}
        >
          <p style={{ fontSize: 14, color: "#991b1b", margin: 0, marginBottom: 12 }}>
            {error}
          </p>
          <button
            type="button"
            onClick={fetchData}
            style={{
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid #e2e8f0",
              borderRadius: 4,
              background: "#fff",
              color: "#1e293b",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Empty state ────────────────────────────────────────────────────
  if (allFeatures.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          fontSize: 14,
          color: "#64748b",
        }}
      >
        No features found for this PI
      </div>
    );
  }

  // ─── Render: PI column content ──────────────────────────────────────────────
  function renderPIColumn(
    piName: string,
    grouped: Record<Team, FeatureItem[]>,
    piStart: Date,
    piEnd: Date
  ) {
    return (
      <div
        style={{
          width: PI_COLUMN_WIDTH,
          minWidth: PI_COLUMN_WIDTH,
          position: "relative",
        }}
        onKeyDown={handlePIColumnKeyDown}
      >
        {/* Today line positioned within the active PI column */}
        <TodayLine
          piStart={piStart}
          piEnd={piEnd}
          columnWidth={PI_COLUMN_WIDTH}
        />

        {/* Team groups with feature rows */}
        {TEAMS.map((team) => {
          const teamFeatures = grouped[team];
          if (teamFeatures.length === 0) return null;

          return (
            <TeamGroup key={team} team={team}>
              {teamFeatures.map((feature) => (
                <FeatureRow
                  key={feature.feature_key}
                  feature={feature}
                  piColumnWidth={PI_COLUMN_WIDTH - 16}
                  onSelect={handleFeatureSelect}
                  piName={piName}
                />
              ))}
            </TeamGroup>
          );
        })}

        {/* Empty state per PI column */}
        {Object.values(grouped).every((arr) => arr.length === 0) && (
          <div
            style={{
              padding: "24px 12px",
              textAlign: "center",
              fontSize: 13,
              color: "#94a3b8",
            }}
          >
            No features found for this PI
          </div>
        )}
      </div>
    );
  }

  // ─── Page layout ────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div id="roadmap-main-content">
        {/* Filter bar */}
        <FilterBar activeTeam={activeTeam} onFilterChange={handleFilterChange} />

        {/* Summary strip (receives team-filtered features) */}
        <SummaryStrip features={filteredFeatures} />

        {/* Gantt header */}
        <GanttHeader columns={ganttColumns} columnWidth={PI_COLUMN_WIDTH} />

        {/* Horizontal scroll container: Sidebar | PI 26.2 | PI 26.3 */}
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            minWidth: 0,
          }}
        >
          {/* Sidebar */}
          <Sidebar
            features={allFeatures}
            activeTeam={activeTeam}
            onFeatureClick={handleFeatureSelect}
          />

          {/* PI columns — one per PI from the database */}
          {piData.map((pi, idx) => (
            <React.Fragment key={pi.name}>
              {renderPIColumn(
                pi.name,
                groupedByPI[idx] ?? { Alpha: [], Bravo: [], Charlie: [] },
                new Date(pi.start_date),
                new Date(pi.end_date)
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Detail Drawer (overlays from right) */}
      <DetailDrawer
        feature={selectedFeature}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />

      {/* Global accessibility styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* ──── Focus-visible indicators for ALL interactive elements ──── */
            [data-testid="feature-row"]:hover {
              background-color: #f8fafc;
            }
            [data-testid="feature-row"]:focus-visible {
              outline: 2px solid #4f46e5;
              outline-offset: -2px;
            }

            /* FilterBar pill buttons */
            [role="toolbar"] button:focus-visible {
              outline: 2px solid #4f46e5;
              outline-offset: 2px;
            }

            /* Sidebar feature labels */
            [data-testid="sidebar"] [role="button"]:focus-visible {
              outline: 2px solid #4f46e5;
              outline-offset: -2px;
            }

            /* TeamGroup header buttons */
            .team-group > button:focus-visible {
              outline: 2px solid #4f46e5;
              outline-offset: -2px;
            }

            /* Detail drawer close button */
            [data-testid="detail-drawer"] button:focus-visible {
              outline: 2px solid #4f46e5;
              outline-offset: 2px;
            }

            /* Retry button focus */
            [role="alert"] button:focus-visible {
              outline: 2px solid #4f46e5;
              outline-offset: 2px;
            }

            /* ──── prefers-reduced-motion: disable ALL animations/transitions ──── */
            @media (prefers-reduced-motion: reduce) {
              *,
              *::before,
              *::after {
                animation-duration: 0ms !important;
                animation-delay: 0ms !important;
                transition-duration: 0ms !important;
                transition-delay: 0ms !important;
              }
            }
          `,
        }}
      />
    </ErrorBoundary>
  );
}
