"""
app/api/routers/lodestar.py

Lodestar SSE streaming endpoint — Phase 2 (T1.5–T1.8).

Registers on the existing pi_features_router from roadmap.py:
    GET /api/pis/{pi}/features/{feature_key}/lodestar

Add to app/api/main.py:
    from app.api.routers.lodestar import lodestar_router
    app.include_router(lodestar_router)

Requires sse-starlette — add to app/requirements.txt:
    sse-starlette>=1.6.5
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
from app.lodestar.prompts import (
    CURRENT_PROMPT_VERSION,
    LodestarPromptInput,
    build_lodestar_prompt,
)
from app.models import (
    FeatureNarrative,
    Issue,
    IssueType,
    ProgramIncrement,
    Sprint,
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
# Adapter factory — mirrors ILLMAdapter pattern from existing app/narrative.py
# ---------------------------------------------------------------------------

def _get_adapter():
    """
    Select the LLM adapter from LODESTAR_ADAPTER env var.
    Default: azure_openai (managed identity, gpt-4o-mini).

    Adapters must implement an async stream(prompt: str) -> AsyncGenerator[str].
    The ILLMAdapter interface lives in app/lodestar/adapters.py (Phase 2 build).
    Until that module exists, the AzureOpenAI adapter is imported directly.
    """
    adapter_name = os.getenv("LODESTAR_ADAPTER", "azure_openai").lower()

    if adapter_name == "claude":
        from app.lodestar.adapters import ClaudeAdapter
        return ClaudeAdapter(model="claude-sonnet-4-6")
    if adapter_name == "openai":
        from app.lodestar.adapters import OpenAIAdapter
        return OpenAIAdapter()

    # Default: azure_openai
    from app.lodestar.adapters import AzureOpenAIAdapter
    return AzureOpenAIAdapter()


# ---------------------------------------------------------------------------
# SSE event helpers
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
# Background writeback — uses sync session (matches existing pattern)
# ---------------------------------------------------------------------------

def _write_lodestar_cache(
    feature_issue_id: int,
    accumulated_text: str,
    prompt_version: str,
) -> None:
    """
    Write completed narrative and prompt version to feature_narrative table.

    Called as a FastAPI BackgroundTask after SSE response is sent.
    Uses a fresh sync session (matches existing get_session pattern).
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
# Streaming generator
# ---------------------------------------------------------------------------

async def _lodestar_generator(
    adapter,
    prompt: str,
    feature_issue_id: int,
    background_tasks: BackgroundTasks,
) -> AsyncGenerator[dict, None]:
    """
    Core SSE generator.

    Sequence:
      1. Emit meta event (prompt version) — first frame before any chunk.
      2. Stream chunks from adapter, accumulate text.
      3. On exhaustion: emit done, schedule background writeback.
      4. On adapter exception: emit error event, close cleanly.
      5. On client disconnect (CancelledError): cancel adapter, emit nothing,
         do NOT schedule writeback.

    Timeout: 12s hard limit. Emits error event if exceeded.
    """
    accumulated: list[str] = []
    completed = False

    # Step 1 — meta event carries prompt version to the browser hook
    # (native EventSource cannot read response headers)
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
        # Client disconnected mid-stream — cancel adapter, emit nothing.
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

    SSE event sequence:
        { type: 'meta', promptVersion: 'v1.0' }   — first frame
        { type: 'chunk', text: '...' }             — one per token batch
        { type: 'done' }                           — stream complete

    On error:
        { type: 'error', error: '<message>' }

    The X-Lodestar-Prompt-Version response header echoes the prompt version
    for server-side tooling (curl). Browser hook reads the 'meta' SSE event
    instead — native EventSource cannot access response headers.
    """
    # Validate PI
    pi_obj = session.scalar(
        select(ProgramIncrement).where(ProgramIncrement.name == pi)
    )
    if pi_obj is None:
        raise HTTPException(
            status_code=404,
            detail=f"Program Increment '{pi}' not found.",
        )

    # Resolve feature (epic) by jira_key
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

    # Compute completion_pct and sprints_remaining from PI sprints
    # (mirrors logic in roadmap.py get_pi_features)
    pi_sprints = session.scalars(
        select(Sprint).where(Sprint.pi_id == pi_obj.id)
    ).all()
    pi_sprint_ids = {s.id for s in pi_sprints}

    from app.models import FeatureMembership, IssueLink
    memberships = session.scalars(
        select(FeatureMembership).where(FeatureMembership.feature_issue_id == epic.id)
    ).all()
    story_ids = {m.issue_id for m in memberships}

    pi_stories = session.scalars(
        select(Issue).where(
            Issue.id.in_(story_ids),
            Issue.sprint_id.in_(pi_sprint_ids),
        )
    ).all() if story_ids and pi_sprint_ids else []

    total = len(pi_stories)
    done_count = sum(1 for s in pi_stories if s.status_category == "done")
    completion_pct = round(done_count / total * 100, 1) if total else 0.0

    future_sprints = sum(1 for s in pi_sprints if s.state == "future")

    # Blockers
    links = session.scalars(
        select(IssueLink).where(IssueLink.link_type == "blocks")
    ).all()
    all_feature_ids = story_ids | {epic.id}
    is_blocked_by = [
        session.scalar(select(Issue).where(Issue.id == lnk.source_issue_id)).jira_key
        for lnk in links
        if lnk.target_issue_id in all_feature_ids
        and session.scalar(select(Issue).where(Issue.id == lnk.source_issue_id))
    ]

    # Build prompt
    prompt_input = LodestarPromptInput(
        feature_key=epic.jira_key,
        summary=epic.summary,
        team="Unassigned",  # team derivation matches roadmap.py _derive_team
        rag_status="amber",
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
        "X-Accel-Buffering": "no",  # prevents Azure/nginx buffering SSE
    }

    return EventSourceResponse(
        _lodestar_generator(adapter, prompt, epic.id, background_tasks),
        headers=headers,
    )
