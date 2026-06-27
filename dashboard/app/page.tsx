import { api } from "@/lib/api";
import ProgramHeader from "@/components/command-center/ProgramHeader";
import LodestarBriefing from "@/components/command-center/LodestarBriefing";
import KPIStrip from "@/components/command-center/KPIStrip";
import NeedsAttentionSection from "@/components/command-center/NeedsAttentionSection";
import PIHealthSection from "@/components/command-center/PIHealthSection";
import RecentFindingsList from "@/components/command-center/RecentFindingsList";
import QuickNavigationGrid, {
  DEFAULT_NAV_CARDS,
} from "@/components/command-center/QuickNavigationGrid";
import CommandCenterFooter from "@/components/command-center/CommandCenterFooter";
import { deriveOverviewKPIs } from "@/components/command-center/derive-kpis";
import type { PIData, Finding } from "@/lib/api";
import type { AttentionFinding, TeamHealth, KPIMetric } from "@/components/command-center/types";
import type { RecentFinding } from "@/components/command-center/RecentFindingsList";

/**
 * Maps raw API findings to AttentionFinding format for NeedsAttentionSection.
 * Filters to only critical and warning severity findings.
 */
function mapToAttentionFindings(findings: Finding[]): AttentionFinding[] {
  return findings
    .filter((f) => f.severity === "critical" || f.severity === "warning")
    .map((f) => ({
      id: f.rule_id,
      severity: f.severity as "critical" | "warning",
      title: f.title,
      description: f.detail,
      recommendation: f.recommendation,
      category: f.category,
    }));
}

/**
 * Maps raw API findings to RecentFinding format for RecentFindingsList.
 * Shows the most recent 10 findings across all severities.
 */
function mapToRecentFindings(findings: Finding[]): RecentFinding[] {
  return findings.slice(0, 10).map((f) => ({
    id: f.rule_id,
    severity: f.severity,
    title: f.title,
  }));
}

/**
 * Derives team health data from PI sprints for PIHealthSection.
 */
function deriveTeamHealth(piData: PIData | null): TeamHealth[] {
  if (!piData?.sprints?.length) return [];

  return piData.sprints.map((sprint) => {
    const pct = sprint.pct_complete ?? 0;
    const hasBlocker = (sprint.blocked_issues ?? 0) > 0;

    let status: "healthy" | "at-risk" | "critical";
    if (hasBlocker || pct < 30) {
      status = "critical";
    } else if (pct < 60) {
      status = "at-risk";
    } else {
      status = "healthy";
    }

    return {
      name: sprint.name,
      status,
      completionPct: pct,
    };
  });
}

/**
 * Converts OverviewKPIs into KPIMetric[] array for KPIStrip.
 */
function kpisToMetrics(
  kpis: ReturnType<typeof deriveOverviewKPIs>,
): KPIMetric[] {
  return [
    {
      label: "Sprint velocity",
      value: kpis.sprintVelocity.value,
      delta: kpis.sprintVelocity.delta,
      subtitle: "Issues completed",
    },
    {
      label: "Features on track",
      value: `${kpis.featuresOnTrack.onTrack}/${kpis.featuresOnTrack.total}`,
      delta: kpis.featuresOnTrack.delta,
    },
    {
      label: "Active blockers",
      value: kpis.activeBlockers.count,
      delta: kpis.activeBlockers.delta,
    },
    {
      label: "Days remaining",
      value: kpis.daysRemaining.days,
      subtitle: kpis.daysRemaining.endDate || undefined,
    },
    {
      label: "Forecast confidence",
      value: `${kpis.forecastConfidence.percentage}%`,
      subtitle: "Monte Carlo P50",
    },
  ];
}

/**
 * Command Center V2 Overview Page (Server Component).
 *
 * Fetches PI and findings data, derives KPIs and team health,
 * and composes the full page layout.
 *
 * Validates: Requirements 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 7.3, 8.1, 9.1, 10.1, 10.2, 10.4, 10.5
 */
export default async function HomePage() {
  let pis: PIData[] = [];
  let findings: Finding[] = [];
  let error: string | null = null;

  try {
    const results = await Promise.allSettled([api.getPIs(), api.getFindings()]);
    
    if (results[0].status === "fulfilled") {
      pis = results[0].value ?? [];
    } else {
      error = results[0].reason?.message ?? "Failed to load PI data";
    }
    
    if (results[1].status === "fulfilled") {
      findings = results[1].value ?? [];
    } else {
      error = error ?? results[1].reason?.message ?? "Failed to load findings";
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  // Use the first PI as the current PI context
  const currentPI: PIData | null = pis.length > 0 ? pis[0] : null;

  // Derive KPIs from API data
  const overviewKPIs = deriveOverviewKPIs(currentPI, findings);
  const metrics = kpisToMetrics(overviewKPIs);

  // Map findings for child components
  const attentionFindings = mapToAttentionFindings(findings);
  const recentFindings = mapToRecentFindings(findings);

  // Derive team health from PI data
  const teamHealth = deriveTeamHealth(currentPI);

  return (
    <div
      className="cc-main"
      style={{
        marginTop: 56,
        padding: "var(--space-8, 32px) var(--space-6, 24px)",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      {/* Non-blocking error banner */}
      {error && (
        <div
          role="alert"
          style={{
            background: "var(--color-fill-danger, #fef2f2)",
            border: "1px solid var(--color-status-danger, #dc2626)",
            borderRadius: "var(--radius-md, 8px)",
            padding: "var(--space-3, 12px) var(--space-4, 16px)",
            fontSize: 14,
            color: "var(--color-status-danger, #dc2626)",
            marginBottom: "var(--space-6, 24px)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2, 8px)",
          }}
          data-testid="error-banner"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M12 8v4M12 16h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>
            Unable to load data: {error}. Some sections may show placeholder
            values.
          </span>
        </div>
      )}

      {/* Program Header */}
      <ProgramHeader
        lastSyncTimestamp={currentPI?.end_date ?? null}
        isSyncing={false}
      />

      {/* Lodestar AI Briefing Panel */}
      <div style={{ marginBottom: "var(--space-6, 24px)" }}>
        <LodestarBriefing />
      </div>

      {/* KPI Strip */}
      <div style={{ marginBottom: "var(--space-6, 24px)" }}>
        <KPIStrip metrics={metrics} />
      </div>

      {/* Two-column layout: NeedsAttention (left) + PIHealth (right) */}
      <div
        className="cc-two-col"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-6, 24px)",
          marginBottom: "var(--space-8, 32px)",
          alignItems: "start",
        }}
      >
        <NeedsAttentionSection findings={attentionFindings} />
        <PIHealthSection
          piName={currentPI?.name ?? ""}
          overallCompletionPct={currentPI?.pct_complete ?? 0}
          teams={teamHealth}
          daysRemaining={overviewKPIs.daysRemaining.days}
        />
      </div>

      {/* Bottom section: Recent Findings + Quick Navigation + Executive Briefing CTA */}
      <div
        className="cc-bottom-section"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-6, 24px)",
          marginBottom: "var(--space-8, 32px)",
          alignItems: "start",
        }}
      >
        <div className="flex flex-col gap-6">
          <RecentFindingsList findings={recentFindings} />
          <QuickNavigationGrid cards={DEFAULT_NAV_CARDS} />
        </div>

        {/* Executive Briefing CTA */}
        <div
          style={{
            boxShadow: "var(--shadow-card)",
            borderRadius: "var(--radius-lg, 12px)",
            backgroundColor: "var(--color-surface, #ffffff)",
            padding: "var(--space-6, 24px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "var(--space-3, 12px)",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            style={{ color: "var(--color-brand-indigo, #4f46e5)" }}
          >
            <path
              d="M9 12h6M9 16h6M5 8h14M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3
            className="text-base font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Executive Briefing
          </h3>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Generate a SteerCo-ready briefing document with AI-powered insights
            and recommendations.
          </p>
          <button
            className="mt-2"
            style={{
              padding: "10px 20px",
              borderRadius: "var(--radius-md, 8px)",
              backgroundColor: "var(--color-brand-indigo, #4f46e5)",
              color: "#ffffff",
              border: "none",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Generate SteerCo briefing
          </button>
        </div>
      </div>

      {/* Footer */}
      <CommandCenterFooter />
    </div>
  );
}
