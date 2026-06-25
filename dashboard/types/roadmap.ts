/**
 * Shared TypeScript interfaces for the WaypointPI Program Roadmap page.
 *
 * These types define the data contract between the backend FeatureItem API
 * (GET /api/pis/{pi}/features) and the frontend roadmap components.
 */

/** Valid team identifiers for feature grouping and filtering. */
export type Team = "Alpha" | "Bravo" | "Charlie";

/** Red/Amber/Green health status for features. */
export type RagStatus = "red" | "amber" | "green";

/** Sprint lifecycle state. */
export type SprintState = "active" | "future" | "closed";

/**
 * Completion metrics for a single Program Increment within a feature.
 * Percentages (done_pct, prog_pct, todo_pct) should sum to 100.
 */
export interface PICompletion {
  pi_name: string;
  done_pct: number;
  prog_pct: number;
  todo_pct: number;
  story_count: number;
  sp_done: number;
  sp_total: number;
}

/**
 * Per-sprint story breakdown for a feature within a PI.
 */
export interface SprintBreakdown {
  sprint_name: string;
  state: SprintState;
  story_count: number;
  done_count: number;
}

/**
 * The primary data transfer object returned by the FeatureItem API.
 * Represents a single feature with its progress, dependencies, and enrichment data.
 */
export interface FeatureItem {
  feature_key: string;
  summary: string;
  team: Team;
  assignee: string | null;
  status: string;
  status_category: string;
  rag_status: RagStatus;
  pi_completion: PICompletion[];
  blockers: string[];        // issue keys this feature blocks
  is_blocked_by: string[];   // issue keys blocking this feature
  sprint_breakdown: SprintBreakdown[];
  lodestar_static: string | null;
  generated_at: string | null;
  /** Phase 2: prompt template version used to generate lodestar_static (e.g. 'v1.0'). */
  lodestar_prompt_version: string | null;
}

/**
 * Aggregated KPI metrics displayed in the Summary Strip.
 */
export interface KPISummary {
  total_features: number;
  on_track: number;
  at_risk: number;
  total_stories: number;
  blocked: number;
}

// ---------------------------------------------------------------------------
// Phase 2 — Lodestar SSE types
// ---------------------------------------------------------------------------

/**
 * NarrativeChunk — the discriminated union emitted by the Lodestar SSE endpoint.
 *
 * The server emits events in this sequence:
 *   1. { type: 'meta', promptVersion: 'v1.0' }   — first frame, before any chunk
 *   2. { type: 'chunk', text: '...' }             — one per token batch
 *   3. { type: 'done' }                           — stream complete
 *
 * On error at any point:
 *   { type: 'error', error: '<message>' }
 */
export type NarrativeChunk =
  | { type: "meta"; promptVersion: string }
  | { type: "chunk"; text: string }
  | { type: "done" }
  | { type: "error"; error: string };

/** StreamStatus state machine for useLodestarStream. */
export type StreamStatus = "idle" | "streaming" | "complete" | "error";

/** Return type of the useLodestarStream hook. */
export interface UseLodestarStreamResult {
  status: StreamStatus;
  text: string;
  /** Prompt version from the meta SSE event, e.g. 'v1.0'. Null until received. */
  promptVersion: string | null;
  error: string | null;
  retry: () => void;
  cancel: () => void;
}
