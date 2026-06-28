"""
app/api/routers/lodestar.py

Lodestar SSE streaming endpoint — Phase 3 update (T3.3, T3.4, T3.7).

Phase 3 changes vs Phase 2:
  T3.3 — Replace hardcoded rag_status='amber' with compute_rag_status()
  T3.4 — Replace hardcoded team='Unassigned' with _derive_team()
  T3.7 — Add staleness gate: query FeatureNarrative, compare major
          versions, stream fresh if stored version is structurally stale.

Unchanged from Phase 2:
  - SSE event sequence (meta → chunk → done)
  - _write_lodestar_cache background task
  - _lodestar_generator streaming logic
  - Adapter factory and LODESTAR_ADAPTER env var
  - Route path and response headers
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import AsyncGenerator

import anyio
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.lodestar.context import _derive_team, compute_rag_status
from app.lodestar.prompts import (
    CURRENT_PROMPT_VERSION,
    LodestarPromptInput,
    PortfolioPromptInput,
    build_lodestar_prompt,
    build_portfolio_prompt,
    get_prompt_major_version,
)
from app.models import (
    FeatureNarrative,
    Issue,
    IssueLink,
    IssueType,
    ProgramIncrement,
    Sprint,
    FeatureMembership,
)

try:
    from sse_starlette.sse import EventSourceResponse
except ImportError as e:
    raise ImportError(
        "sse-starlette is required for Lodestar streaming. "
        "Add 'sse-starlette>=1.6.5' to app/requirements.txt and reinstall."
    ) from e

logger = logging.getLogger(__name__)

lodestar_router = APIRouter(prefix="/api/pis", tags=["lodestar"])

LODESTAR_STREAM_TIMEOUT_SECONDS = 12


# ---------------------------------------------------------------------------
# Adapter factory — unchanged from Phase 2
# ---------------------------------------------------------------------------

def _get_adapter():
    """
    Select the LLM adapter from LODESTAR_ADAPTER env var.
    Default: azure_openai (managed identity, gpt-4o-mini).
    """
    adapter_name = os.getenv("LODESTAR_ADAPTER", "azure_openai").lower()

    if adapter_name == "claude":
        from app.lodestar.adapters import ClaudeAdapter
        return ClaudeAdapter(model="claude-sonnet-4-6")
    if adapter_name == "openai":
        from app.lodestar.adapters import OpenAIAdapter
        return OpenAIAdapter()

    from app.lodestar.adapters import AzureOpenAIAdapter
    return AzureOpenAIAdapter()


# ---------------------------------------------------------------------------
# SSE event helpers — unchanged from Phase 2
# ---------------------------------------------------------------------------

def _meta_event(prompt_version: str) -> dict:
    return {"data": json.dumps({"type": "meta", "promptVersion": prompt_version})}


def _chunk_event(text: str) -> dict:
    return {"data": json.dumps({"type": "chunk", "text": text})}


def _done_event() -> dict:
    return {"data": json.dumps({"type": "done"})}


def _error_event(message: str) -> dict:
    return {"data": json.dumps({"type": "error", "error": message})}


# ---------------------------------------------------------------------------
# Background writeback — unchanged from Phase 2
# ---------------------------------------------------------------------------

def _write_lodestar_cache(
    feature_issue_id: int,
    accumulated_text: str,
    prompt_version: str,
) -> None:
    """
    Write completed narrative and prompt version to FeatureNarrative table.
    Called as a FastAPI BackgroundTask after SSE response is sent.
    Only called on successful (complete) streams — never on disconnect or error.
    """
    from app.models import get_session_maker
    SessionLocal = get_session_maker()

    with SessionLocal() as session:
        try:
            narrative = session.scalar(
                select(FeatureNarrative).where(
                    FeatureNarrative.feature_issue_id == feature_issue_id
                )
            )
            now = datetime.now(timezone.utc)
            if narrative:
                narrative.narrative_text = accumulated_text
                narrative.generated_at = now
                narrative.lodestar_prompt_version = prompt_version
                narrative.is_stale = False
            else:
                narrative = FeatureNarrative(
                    feature_issue_id=feature_issue_id,
                    narrative_text=accumulated_text,
                    generated_at=now,
                    model_name=os.getenv("LODESTAR_ADAPTER", "azure_openai"),
                    is_stale=False,
                    lodestar_prompt_version=prompt_version,
                )
                session.add(narrative)
            session.commit()
            logger.info(
                "Lodestar cache written for feature_issue_id=%s (prompt=%s)",
                feature_issue_id,
                prompt_version,
            )
        except Exception:
            logger.exception(
                "Lodestar cache writeback failed for feature_issue_id=%s",
                feature_issue_id,
            )
            session.rollback()


# ---------------------------------------------------------------------------
# Streaming generator — unchanged from Phase 2
# ---------------------------------------------------------------------------

async def _lodestar_generator(
    adapter,
    prompt: str,
    feature_issue_id: int,
    background_tasks: BackgroundTasks,
) -> AsyncGenerator[dict, None]:
    """
    Core SSE generator. Sequence:
      1. Emit meta event (prompt version).
      2. Stream chunks from adapter, accumulate text.
      3. On exhaustion: emit done, schedule background writeback.
      4. On adapter exception: emit error event, close cleanly.
      5. On client disconnect: cancel adapter, do NOT schedule writeback.
    """
    accumulated: list[str] = []
    completed = False

    yield _meta_event(CURRENT_PROMPT_VERSION)

    try:
        async with asyncio.timeout(LODESTAR_STREAM_TIMEOUT_SECONDS):
            async for chunk in adapter.stream(prompt):
                accumulated.append(chunk)
                yield _chunk_event(chunk)

        completed = True
        yield _done_event()

    except asyncio.TimeoutError:
        logger.warning(
            "Lodestar stream timed out (feature_issue_id=%s)", feature_issue_id
        )
        yield _error_event(
            f"Narrative generation timed out after {LODESTAR_STREAM_TIMEOUT_SECONDS}s."
        )

    except (anyio.EndOfStream, asyncio.CancelledError):
        logger.info(
            "Lodestar stream cancelled (client disconnect, feature_issue_id=%s)",
            feature_issue_id,
        )
        if hasattr(adapter, "cancel"):
            try:
                await adapter.cancel()
            except Exception:
                pass
        return

    except Exception as exc:
        logger.exception(
            "Lodestar adapter error (feature_issue_id=%s)", feature_issue_id
        )
        yield _error_event(str(exc))

    finally:
        if completed:
            background_tasks.add_task(
                _write_lodestar_cache,
                feature_issue_id,
                "".join(accumulated),
                CURRENT_PROMPT_VERSION,
            )


# ---------------------------------------------------------------------------
# T3.7 — Staleness gate helper
# ---------------------------------------------------------------------------

def _is_stale(stored_version: str | None) -> bool:
    """
    Return True if the stored prompt version's major version differs from
    CURRENT_PROMPT_VERSION's major version.

    Delegates to get_prompt_major_version from prompts.py — no duplicated
    version string parsing logic.

    Examples (CURRENT_PROMPT_VERSION = 'v2.0'):
      None    → False (no cached narrative — not stale, just absent)
      'v1.0'  → True  (different major: v1 vs v2)
      'v1.9'  → True  (different major: v1 vs v2)
      'v2.0'  → False (same major)
      'v2.1'  → False (same major, minor difference only — R21.6)
    """
    if stored_version is None:
        return False
    try:
        return (
            get_prompt_major_version(stored_version)
            != get_prompt_major_version(CURRENT_PROMPT_VERSION)
        )
    except (AttributeError, IndexError):
        logger.warning(
            "Malformed lodestar_prompt_version '%s', treating as stale",
            stored_version,
        )
        return True


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@lodestar_router.get(
    "/{pi}/features/{feature_key}/lodestar",
    summary="Stream Lodestar AI narrative for a feature (SSE)",
)
def stream_lodestar_narrative(
    pi: str,
    feature_key: str,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """
    GET /api/pis/{pi}/features/{feature_key}/lodestar

    Returns a text/event-stream SSE response streaming the Lodestar AI
    narrative for the given feature.

    Phase 3 behaviour changes:
      - rag_status is derived from completion_pct and blockers (not hardcoded).
      - team is derived from PI stories' project keys (not hardcoded).
      - Staleness gate: if stored FeatureNarrative.lodestar_prompt_version
        has a different major version than CURRENT_PROMPT_VERSION, the
        existing narrative is considered structurally stale and a fresh stream is forced.

    SSE event sequence (unchanged from Phase 2):
        { type: 'meta', promptVersion: 'v2.0' }
        { type: 'chunk', text: '...' }
        { type: 'done' }

    On error:
        { type: 'error', error: '<message>' }
    """
    # ── Validate PI ──────────────────────────────────────────────────────────
    pi_obj = session.scalar(
        select(ProgramIncrement).where(ProgramIncrement.name == pi)
    )
    if pi_obj is None:
        raise HTTPException(
            status_code=404,
            detail=f"Program Increment '{pi}' not found.",
        )

    # ── Resolve feature (epic) ───────────────────────────────────────────────
    epic = session.scalar(
        select(Issue).where(
            Issue.jira_key == feature_key,
            Issue.issue_type == IssueType.EPIC.value,
        )
    )
    if epic is None:
        raise HTTPException(
            status_code=404,
            detail=f"Feature '{feature_key}' not found.",
        )

    # ── Compute PI stories ───────────────────────────────────────────────────
    pi_sprints = session.scalars(
        select(Sprint).where(Sprint.pi_id == pi_obj.id)
    ).all()
    pi_sprint_ids = {s.id for s in pi_sprints}

    memberships = session.scalars(
        select(FeatureMembership).where(FeatureMembership.feature_issue_id == epic.id)
    ).all()
    story_ids = {m.issue_id for m in memberships}

    pi_stories = list(session.scalars(
        select(Issue).where(
            Issue.id.in_(story_ids),
            Issue.sprint_id.in_(pi_sprint_ids),
        )
    ).all()) if story_ids and pi_sprint_ids else []

    # ── Completion percentage ─────────────────────────────────────────────────
    total = len(pi_stories)
    done_count = sum(1 for s in pi_stories if s.status_category == "done")
    completion_pct = round(done_count / total * 100, 1) if total else 0.0

    future_sprints = sum(1 for s in pi_sprints if s.state == "future")

    # ── Blockers (scoped to this feature's stories + epic) ────────────────────
    # T3.3 fix: scope query to this feature's IDs rather than fetching all links
    all_feature_ids = story_ids | {epic.id}
    blocker_links = session.scalars(
        select(IssueLink).where(
            IssueLink.link_type == "blocks",
            IssueLink.target_issue_id.in_(all_feature_ids),
        )
    ).all()

    is_blocked_by: list[str] = []
    for lnk in blocker_links:
        blocker_issue = session.scalar(
            select(Issue).where(Issue.id == lnk.source_issue_id)
        )
        if blocker_issue:
            is_blocked_by.append(blocker_issue.jira_key)

    # ── T3.3 — derive rag_status from rule engine (replaces hardcoded 'amber') ─
    rag_status = compute_rag_status(
        completion_pct=completion_pct,
        has_active_blocker=bool(is_blocked_by),
    )

    # ── T3.4 — derive team from project keys (replaces hardcoded 'Unassigned') ─
    team = _derive_team(pi_stories, session)

    # ── T3.7 — staleness gate ─────────────────────────────────────────────────
    # Query FeatureNarrative for stored prompt version.
    # If major version differs from CURRENT_PROMPT_VERSION, the narrative is
    # structurally stale — mark it so the writeback will overwrite it.
    existing_narrative = session.scalar(
        select(FeatureNarrative).where(
            FeatureNarrative.feature_issue_id == epic.id
        )
    )
    stored_version = (
        existing_narrative.lodestar_prompt_version if existing_narrative else None
    )

    if existing_narrative and _is_stale(stored_version):
        logger.info(
            "Lodestar narrative for feature_issue_id=%s is stale "
            "(stored=%s, current=%s) — forcing fresh stream",
            epic.id,
            stored_version,
            CURRENT_PROMPT_VERSION,
        )
        # Mark as stale so the writeback knows to overwrite
        existing_narrative.is_stale = True
        session.commit()

    # ── Build prompt ──────────────────────────────────────────────────────────
    prompt_input = LodestarPromptInput(
        feature_key=epic.jira_key,
        summary=epic.summary,
        team=team,                    # T3.4: derived, not hardcoded
        rag_status=rag_status,        # T3.3: derived, not hardcoded
        blockers=[],
        is_blocked_by=is_blocked_by,
        completion_pct=completion_pct,
        sprints_remaining=future_sprints,
    )
    prompt = build_lodestar_prompt(prompt_input)

    adapter = _get_adapter()

    headers = {
        "X-Lodestar-Prompt-Version": CURRENT_PROMPT_VERSION,
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }

    return EventSourceResponse(
        _lodestar_generator(adapter, prompt, epic.id, background_tasks),
        headers=headers,
    )


# ---------------------------------------------------------------------------
# Portfolio-level briefing route
# ---------------------------------------------------------------------------

@lodestar_router.get(
    "/{pi}/lodestar",
    summary="Stream Lodestar AI portfolio briefing for a PI (SSE)",
)
def stream_portfolio_narrative(
    pi: str,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """
    GET /api/pis/{pi}/lodestar

    Returns a text/event-stream SSE response streaming a PI-level portfolio
    briefing generated by Lodestar AI. Uses aggregated PI stats rather than
    a specific feature context.

    SSE event sequence:
        { type: 'meta', promptVersion: 'v2.0' }
        { type: 'chunk', text: '...' }
        { type: 'done' }

    On error:
        { type: 'error', error: '<message>' }
    """
    from app.engine import run_site
    from app.api.queries import get_pi_summaries

    pi_obj = session.scalar(
        select(ProgramIncrement).where(ProgramIncrement.name == pi)
    )
    if pi_obj is None:
        raise HTTPException(status_code=404, detail=f"Program Increment '{pi}' not found.")

    _, findings = run_site()
    pi_summaries = get_pi_summaries(session, findings)
    pi_data = next((p for p in pi_summaries if p.name == pi), None)
    if pi_data is None:
        raise HTTPException(status_code=404, detail=f"PI summary for '{pi}' not found.")

    critical_count = sum(1 for f in findings if getattr(f.severity, 'value', f.severity) == "critical")

    total_features_est = max(1, int(pi_data.total_issues * 0.3))
    features_on_track = max(0, int(pi_data.pct_complete / 100 * total_features_est))

    prompt_input = PortfolioPromptInput(
        pi_name=pi_data.name,
        total_issues=pi_data.total_issues,
        done_issues=pi_data.done_issues,
        pct_complete=pi_data.pct_complete,
        critical_findings=critical_count,
        blocked_issues=pi_data.blocked_issues,
        health=pi_data.health,
        total_features=total_features_est,
        features_on_track=features_on_track,
    )
    prompt = build_portfolio_prompt(prompt_input)

    adapter = _get_adapter()

    headers = {
        "X-Lodestar-Prompt-Version": CURRENT_PROMPT_VERSION,
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }

    return EventSourceResponse(
        _lodestar_generator(adapter, prompt, pi_obj.id, background_tasks),
        headers=headers,
    )
