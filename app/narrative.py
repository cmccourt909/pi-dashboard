"""
Narrative Generator Service for Lodestar AI Narratives.

Gathers feature context from the database and generates AI-powered delivery
narratives via Azure OpenAI.
"""
from __future__ import annotations

import json
import logging
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.api.routers.enrich import (
    _get_openai_client,
    _call_with_retry,
    ProviderNotConfiguredError,
    ProviderAuthError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    LLMParseError,
)
from app.models import (
    FeatureMembership,
    FeatureNarrative,
    Issue,
    IssueLink,
    ProgramIncrement,
    Project,
    RawIssueSnapshot,
    Sprint,
    SprintState,
)


# ─── Team mapping (shared with roadmap router) ────────────────────────────────
_PROJECT_KEY_TEAM_MAP: dict[str, str] = {
    "ALPHA": "Alpha",
    "BRAVO": "Bravo",
    "CHARLIE": "Charlie",
    "TSU": "Alpha",
    "ISC": "Bravo",
    "PNR": "Charlie",
}


def _derive_team(project_jira_key: str) -> str:
    """Derive team name from project key or prefix."""
    if project_jira_key in _PROJECT_KEY_TEAM_MAP:
        return _PROJECT_KEY_TEAM_MAP[project_jira_key]
    for prefix, team in _PROJECT_KEY_TEAM_MAP.items():
        if project_jira_key.startswith(prefix):
            return team
    return "unknown"


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class NarrativeContext:
    """Structured context for narrative prompt construction."""

    feature_key: str
    feature_summary: str
    completion_pct: float        # done / total child stories
    blocker_count: int           # unresolved blocking links targeting children
    sprint_velocity: float       # avg stories done per sprint (last 3 closed)
    recent_status_changes: int   # status category changes in last 14 days
    team_name: str
    days_remaining: int          # days left in PI


@dataclass
class NarrativeResult:
    """Output of successful narrative generation."""

    narrative_text: str
    generated_at: datetime
    model_name: str


# ─── Context gathering ────────────────────────────────────────────────────────

def gather_context(
    session: Session,
    feature_issue_id: int,
    pi_id: int,
) -> NarrativeContext:
    """
    Gather all context needed for narrative generation.

    Queries child stories, blocker links, sprint velocity, status changes,
    team name, and days remaining in the PI. Uses defaults of 0 for numeric
    fields and "unknown" for text fields when data is unavailable.
    """
    # --- Feature issue ---
    feature = session.get(Issue, feature_issue_id)
    feature_key = feature.jira_key if feature else "unknown"
    feature_summary = feature.summary if feature else "unknown"

    # --- Team name ---
    team_name = "unknown"
    if feature:
        project = session.get(Project, feature.project_id)
        if project:
            team_name = _derive_team(project.jira_key)

    # --- Child stories (via FeatureMembership) ---
    child_story_ids = session.scalars(
        select(FeatureMembership.issue_id).where(
            FeatureMembership.feature_issue_id == feature_issue_id
        )
    ).all()

    # --- Completion percentage ---
    total_stories = len(child_story_ids)
    if total_stories > 0:
        done_count = session.scalar(
            select(func.count(Issue.id)).where(
                Issue.id.in_(child_story_ids),
                Issue.status_category == "done",
            )
        ) or 0
        completion_pct = done_count / total_stories
    else:
        completion_pct = 0.0

    # --- Blocker count ---
    # Unresolved issues with link_type "blocks" targeting child stories
    if child_story_ids:
        blocker_count = session.scalar(
            select(func.count(IssueLink.id)).where(
                IssueLink.target_issue_id.in_(child_story_ids),
                IssueLink.link_type == "blocks",
            ).where(
                IssueLink.source_issue_id.in_(
                    select(Issue.id).where(Issue.status_category != "done")
                )
            )
        ) or 0
    else:
        blocker_count = 0

    # --- Sprint velocity ---
    # Average stories moved to "done" per sprint over the last 3 closed sprints in the PI
    sprint_velocity = _compute_sprint_velocity(session, child_story_ids, pi_id)

    # --- Recent status changes (last 14 days) ---
    recent_status_changes = _count_recent_status_changes(
        session, child_story_ids
    )

    # --- Days remaining in PI ---
    days_remaining = _compute_days_remaining(session, pi_id)

    return NarrativeContext(
        feature_key=feature_key,
        feature_summary=feature_summary,
        completion_pct=completion_pct,
        blocker_count=blocker_count,
        sprint_velocity=sprint_velocity,
        recent_status_changes=recent_status_changes,
        team_name=team_name,
        days_remaining=days_remaining,
    )


def _compute_sprint_velocity(
    session: Session,
    child_story_ids: list[int],
    pi_id: int,
) -> float:
    """
    Compute average stories moved to "done" per sprint over the last 3
    closed sprints in the PI.

    Returns 0.0 if no closed sprints exist or no child stories.
    """
    if not child_story_ids:
        return 0.0

    # Get the last 3 closed sprints in the PI, ordered by end_date descending
    closed_sprints = session.scalars(
        select(Sprint)
        .where(
            Sprint.pi_id == pi_id,
            Sprint.state == SprintState.CLOSED.value,
        )
        .order_by(Sprint.end_date.desc())
        .limit(3)
    ).all()

    if not closed_sprints:
        return 0.0

    total_done = 0
    for sprint in closed_sprints:
        done_in_sprint = session.scalar(
            select(func.count(Issue.id)).where(
                Issue.id.in_(child_story_ids),
                Issue.sprint_id == sprint.id,
                Issue.status_category == "done",
            )
        ) or 0
        total_done += done_in_sprint

    return total_done / len(closed_sprints)


def _count_recent_status_changes(
    session: Session,
    child_story_ids: list[int],
) -> int:
    """
    Count status category changes within the last 14 days by comparing
    consecutive raw snapshots for child stories.

    Returns 0 if no snapshots exist or no changes detected.
    """
    if not child_story_ids:
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=14)

    # Get the jira_keys for child stories
    child_keys = session.scalars(
        select(Issue.jira_key).where(Issue.id.in_(child_story_ids))
    ).all()

    if not child_keys:
        return 0

    # Query raw snapshots from the last 14 days for these issues
    snapshots = session.scalars(
        select(RawIssueSnapshot)
        .where(
            RawIssueSnapshot.issue_key.in_(child_keys),
            RawIssueSnapshot.pulled_at >= cutoff,
        )
        .order_by(RawIssueSnapshot.issue_key, RawIssueSnapshot.pulled_at)
    ).all()

    if not snapshots:
        return 0

    # Count status_category transitions between consecutive snapshots
    changes = 0
    prev_by_key: dict[str, str] = {}

    for snap in snapshots:
        payload = snap.payload or {}
        fields = payload.get("fields", {})
        status_obj = fields.get("status", {}) or {}
        status_cat = (status_obj.get("statusCategory", {}) or {}).get("key", "")

        prev_cat = prev_by_key.get(snap.issue_key)
        if prev_cat is not None and prev_cat != status_cat:
            changes += 1

        prev_by_key[snap.issue_key] = status_cat

    return changes


def _compute_days_remaining(session: Session, pi_id: int) -> int:
    """
    Compute days remaining in the PI.

    Returns 0 if the PI is not found or has already ended.
    """
    pi = session.get(ProgramIncrement, pi_id)
    if not pi:
        return 0

    now = datetime.now(timezone.utc)
    pi_end = pi.end_date
    if pi_end.tzinfo is None:
        pi_end = pi_end.replace(tzinfo=timezone.utc)

    remaining = (pi_end - now).days
    return max(0, remaining)


# ─── Prompt construction ──────────────────────────────────────────────────────

def _build_narrative_prompt(ctx: NarrativeContext) -> str:
    """Build the LLM prompt from gathered narrative context."""
    return f"""You are a delivery intelligence assistant. Generate a concise 2-3 sentence narrative summarizing the delivery health, risks, and trajectory for a software feature.

Feature context:
- Feature: {ctx.feature_key} — {ctx.feature_summary}
- Team: {ctx.team_name}
- Completion: {ctx.completion_pct:.0%} of child stories done
- Active blockers: {ctx.blocker_count}
- Sprint velocity: {ctx.sprint_velocity:.1f} stories/sprint (last 3 sprints)
- Status changes (last 14 days): {ctx.recent_status_changes}
- Days remaining in PI: {ctx.days_remaining}

Write exactly 2-3 sentences. Be direct, factual, and actionable. Mention risks if blockers exist or velocity is low relative to remaining work. Do not use bullet points or headers.

Return ONLY valid JSON in this format:
{{"narrative": "your 2-3 sentence narrative here"}}"""


# ─── Generation pipeline ──────────────────────────────────────────────────────

def generate_narrative(
    session: Session,
    feature_issue_id: int,
    pi_id: int,
) -> NarrativeResult:
    """
    Full generation pipeline: gather context → build prompt → call LLM → persist.

    On any failure (provider errors, parse errors), the existing narrative row
    is preserved unchanged — no partial updates are committed.

    Raises:
        ProviderNotConfiguredError: If Azure OpenAI is not configured (503).
        ProviderAuthError: If Azure credential validation fails (401).
        ProviderRateLimitError: If Azure throttles the request (429).
        ProviderTimeoutError: If the request exceeds 30s timeout (504).
        LLMParseError: If the LLM response is empty or invalid (502).
    """
    # 1. Get OpenAI client
    client, deployment = _get_openai_client()
    if not client:
        raise ProviderNotConfiguredError()

    # 2. Gather context
    ctx = gather_context(session, feature_issue_id, pi_id)

    # 3. Build prompt
    prompt = _build_narrative_prompt(ctx)

    # 4. Call Azure OpenAI with retry
    #    _call_with_retry raises ProviderAuthError, ProviderRateLimitError,
    #    or ProviderTimeoutError on failure — let them propagate so the
    #    existing narrative is never modified.
    messages = [{"role": "user", "content": prompt}]
    response_text = _call_with_retry(
        client,
        deployment,
        messages=messages,
        max_tokens=200,
        temperature=0.3,
    )

    # 5. Validate response — must be non-empty valid text
    if not response_text or not response_text.strip():
        raise LLMParseError("LLM returned empty response.")

    try:
        parsed = json.loads(response_text)
        narrative_text = parsed.get("narrative", "").strip()
    except (json.JSONDecodeError, AttributeError):
        raise LLMParseError("LLM returned invalid JSON response.")

    if not narrative_text:
        raise LLMParseError("LLM returned empty narrative text.")

    # 6. Build result
    generated_at = datetime.now(timezone.utc)
    result = NarrativeResult(
        narrative_text=narrative_text,
        generated_at=generated_at,
        model_name=deployment,
    )

    # 7. Persist with upsert semantics — only reached on success
    existing = session.scalar(
        select(FeatureNarrative).where(
            FeatureNarrative.feature_issue_id == feature_issue_id
        )
    )

    if existing:
        existing.narrative_text = result.narrative_text
        existing.generated_at = result.generated_at
        existing.model_name = result.model_name
        existing.is_stale = False
    else:
        narrative_row = FeatureNarrative(
            feature_issue_id=feature_issue_id,
            narrative_text=result.narrative_text,
            generated_at=result.generated_at,
            model_name=result.model_name,
            is_stale=False,
        )
        session.add(narrative_row)

    session.commit()

    return result


# ─── Staleness marking ────────────────────────────────────────────────────────

def mark_stale(session: Session, feature_issue_ids: list[int]) -> int:
    """
    Mark narratives as stale for the given feature issue IDs.

    Sets is_stale = True for all narratives whose feature_issue_id is in
    the provided list. Only updates rows that actually exist — does not
    error on IDs without narratives.

    Returns the count of narratives actually marked stale.
    """
    if not feature_issue_ids:
        return 0

    result = session.execute(
        update(FeatureNarrative)
        .where(FeatureNarrative.feature_issue_id.in_(feature_issue_ids))
        .values(is_stale=True)
    )
    session.commit()

    return result.rowcount


# ─── Sync-triggered staleness detection ───────────────────────────────────────

@dataclass
class _FeatureSnapshot:
    """Snapshot of feature-relevant data used to detect changes after sync."""

    completion_pct: float
    blocker_count: int
    status_category: str
    assignee: str | None


def _snapshot_feature_data(
    session: Session,
    feature_issue_ids: list[int],
) -> dict[int, _FeatureSnapshot]:
    """
    Capture a snapshot of the data that determines narrative staleness for
    each feature that has an existing narrative.

    Captures: completion_pct, blocker_count, status_category of the feature
    itself, and its assignee.
    """
    snapshots: dict[int, _FeatureSnapshot] = {}

    for fid in feature_issue_ids:
        feature = session.get(Issue, fid)
        if not feature:
            continue

        # Completion: done children / total children
        child_story_ids = session.scalars(
            select(FeatureMembership.issue_id).where(
                FeatureMembership.feature_issue_id == fid
            )
        ).all()

        total_stories = len(child_story_ids)
        if total_stories > 0:
            done_count = session.scalar(
                select(func.count(Issue.id)).where(
                    Issue.id.in_(child_story_ids),
                    Issue.status_category == "done",
                )
            ) or 0
            completion_pct = done_count / total_stories
        else:
            completion_pct = 0.0

        # Blocker count
        if child_story_ids:
            blocker_count = session.scalar(
                select(func.count(IssueLink.id)).where(
                    IssueLink.target_issue_id.in_(child_story_ids),
                    IssueLink.link_type == "blocks",
                ).where(
                    IssueLink.source_issue_id.in_(
                        select(Issue.id).where(Issue.status_category != "done")
                    )
                )
            ) or 0
        else:
            blocker_count = 0

        snapshots[fid] = _FeatureSnapshot(
            completion_pct=completion_pct,
            blocker_count=blocker_count,
            status_category=feature.status_category or "",
            assignee=feature.assignee,
        )

    return snapshots


def capture_pre_sync_snapshot(session: Session) -> dict[int, _FeatureSnapshot]:
    """
    Capture a snapshot of all features that currently have narratives.

    Call this BEFORE the data sync to establish a baseline. After sync
    completes, call `detect_stale_after_sync` with this snapshot.
    """
    # Find all feature_issue_ids that have existing narratives
    feature_ids_with_narratives = session.scalars(
        select(FeatureNarrative.feature_issue_id)
    ).all()

    if not feature_ids_with_narratives:
        return {}

    return _snapshot_feature_data(session, list(feature_ids_with_narratives))


def detect_stale_after_sync(
    session: Session,
    pre_snapshot: dict[int, _FeatureSnapshot],
) -> list[int]:
    """
    Compare post-sync feature data against the pre-sync snapshot.

    Detects features whose completion_pct, blocker_count, status_category,
    or assignee changed during the sync.

    Returns list of feature_issue_ids that should be marked stale.
    """
    if not pre_snapshot:
        return []

    feature_ids = list(pre_snapshot.keys())
    post_snapshot = _snapshot_feature_data(session, feature_ids)

    changed_ids: list[int] = []
    for fid, pre in pre_snapshot.items():
        post = post_snapshot.get(fid)
        if post is None:
            # Feature was deleted during sync — skip
            continue

        if (
            pre.completion_pct != post.completion_pct
            or pre.blocker_count != post.blocker_count
            or pre.status_category != post.status_category
            or pre.assignee != post.assignee
        ):
            changed_ids.append(fid)

    return changed_ids


def _background_regenerate(feature_issue_ids: list[int]) -> None:
    """
    Background task: regenerate narratives for stale features.

    On any failure: logs the error, does NOT retry, preserves existing
    narrative (mark_stale only sets is_stale=True, text is untouched).
    """
    from app.models import get_session_maker

    SessionLocal = get_session_maker()

    for fid in feature_issue_ids:
        try:
            with SessionLocal() as session:
                # Determine PI for this feature
                from app.api.routers.narrative import _determine_pi_id

                pi_id = _determine_pi_id(session, fid)
                if pi_id is None:
                    logger.warning(
                        "Background regeneration skipped for feature_issue_id=%d: "
                        "cannot determine PI.",
                        fid,
                    )
                    continue

                generate_narrative(session, fid, pi_id)
                logger.info(
                    "Background regeneration succeeded for feature_issue_id=%d.",
                    fid,
                )
        except Exception as exc:
            # On failure: retain existing narrative, log error, do NOT retry
            logger.error(
                "Background regeneration failed for feature_issue_id=%d: %s",
                fid,
                exc,
            )


def handle_post_sync_staleness(
    session: Session,
    pre_snapshot: dict[int, _FeatureSnapshot],
) -> int:
    """
    After data sync completes, detect changed features, mark them stale,
    and enqueue background regeneration within 60 seconds.

    Args:
        session: Active database session (post-sync, committed).
        pre_snapshot: Snapshot captured before the sync via
                      `capture_pre_sync_snapshot`.

    Returns:
        Number of narratives marked stale.
    """
    changed_ids = detect_stale_after_sync(session, pre_snapshot)

    if not changed_ids:
        return 0

    stale_count = mark_stale(session, changed_ids)

    if stale_count > 0:
        # Enqueue background regeneration after 60 seconds
        timer = threading.Timer(
            60.0,
            _background_regenerate,
            args=[changed_ids],
        )
        timer.daemon = True
        timer.start()
        logger.info(
            "Marked %d narrative(s) stale; background regeneration "
            "scheduled in 60 seconds for feature_issue_ids=%s.",
            stale_count,
            changed_ids,
        )

    return stale_count
