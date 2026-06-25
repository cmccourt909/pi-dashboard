import { NextRequest, NextResponse } from "next/server";

/**
 * Compatibility proxy for /api/roadmap.
 *
 * The original backend endpoint was removed during the roadmap redesign.
 * This route fetches from the new /api/pis and /api/pis/{pi}/features endpoints
 * and transforms the response into the legacy format expected by the forecast page.
 */

interface PIData {
  name: string;
  start_date: string;
  end_date: string;
  sprints: { name: string; start_date: string | null; end_date: string | null }[];
}

interface FeatureItemResponse {
  feature_key: string;
  summary: string;
  status: string;
  status_category: string;
  assignee: string | null;
  pi_completion: {
    pi_name: string;
    done_pct: number;
    prog_pct: number;
    todo_pct: number;
    story_count: number;
    sp_done: number;
    sp_total: number;
  }[];
}

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

  try {
    // Fetch PIs to get names and date ranges
    const pisRes = await fetch(`${backendUrl}/api/pis`);
    if (!pisRes.ok) {
      return NextResponse.json(
        { features: [], pis: [], sprints: [] },
        { status: 200 }
      );
    }
    const pis: PIData[] = await pisRes.json();

    // Fetch features for each PI in parallel
    const featureResponses = await Promise.all(
      pis.map((pi) =>
        fetch(`${backendUrl}/api/pis/${encodeURIComponent(pi.name)}/features`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => [])
      )
    );

    // Deduplicate features by key (a feature may appear in multiple PIs)
    const featureMap = new Map<string, FeatureItemResponse>();
    for (const features of featureResponses) {
      for (const f of features as FeatureItemResponse[]) {
        if (!featureMap.has(f.feature_key)) {
          featureMap.set(f.feature_key, f);
        }
      }
    }

    // Transform to the legacy format
    const legacyFeatures = Array.from(featureMap.values()).map((f) => {
      // Aggregate completion across all PIs
      const totalStories = f.pi_completion.reduce((sum, pc) => sum + pc.story_count, 0);
      const avgDone = f.pi_completion.length > 0
        ? f.pi_completion.reduce((sum, pc) => sum + pc.done_pct, 0) / f.pi_completion.length
        : 0;
      const avgProg = f.pi_completion.length > 0
        ? f.pi_completion.reduce((sum, pc) => sum + pc.prog_pct, 0) / f.pi_completion.length
        : 0;
      const avgTodo = f.pi_completion.length > 0
        ? f.pi_completion.reduce((sum, pc) => sum + pc.todo_pct, 0) / f.pi_completion.length
        : 0;

      const storyDone = Math.round(totalStories * (avgDone / 100));
      const storyInProgress = Math.round(totalStories * (avgProg / 100));
      const storyTodo = totalStories - storyDone - storyInProgress;

      return {
        issue_key: f.feature_key,
        summary: f.summary,
        status: f.status,
        status_category: f.status_category,
        priority: null,
        assignee: f.assignee,
        target_start_date: pis.length > 0 ? pis[0].start_date.slice(0, 10) : null,
        target_end_date: pis.length > 0 ? pis[pis.length - 1].end_date.slice(0, 10) : null,
        due_date: null,
        story_total: totalStories,
        story_done: storyDone,
        story_in_progress: storyInProgress,
        story_todo: storyTodo,
        pct_complete: Math.round(avgDone * 10) / 10,
      };
    });

    // Build legacy PI list
    const legacyPIs = pis.map((pi) => ({
      name: pi.name,
      start: pi.start_date.slice(0, 10),
      end: pi.end_date.slice(0, 10),
    }));

    // Build legacy sprint list (deduplicated by date window)
    const sprintMap = new Map<string, { name: string; start: string | null; end: string | null; pi: string | null }>();
    for (const pi of pis) {
      for (const s of pi.sprints) {
        if (s.start_date && s.end_date) {
          const key = `${s.start_date}-${s.end_date}`;
          if (!sprintMap.has(key)) {
            sprintMap.set(key, {
              name: s.name,
              start: s.start_date,
              end: s.end_date,
              pi: pi.name,
            });
          }
        }
      }
    }
    const legacySprints = Array.from(sprintMap.values()).sort(
      (a, b) => (a.start ?? "").localeCompare(b.start ?? "")
    );

    return NextResponse.json({
      features: legacyFeatures,
      pis: legacyPIs,
      sprints: legacySprints,
    });
  } catch (error) {
    console.error("[api/roadmap proxy] Error:", error);
    return NextResponse.json(
      { features: [], pis: [], sprints: [] },
      { status: 200 }
    );
  }
}
