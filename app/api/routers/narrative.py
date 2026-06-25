"""
Narrative router — exposes on-demand AI narrative generation for features.

Endpoints:
  POST /api/features/{feature_key}/narrative/generate — generate narrative for a single feature
  POST /api/pis/{pi}/narratives/generate — batch generation for all features in a PI
"""
from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.api.routers.enrich import (
    ProviderNotConfiguredError,
    ProviderAuthError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    LLMParseError,
)
from app.models import FeatureMembership, Issue, IssueType, ProgramIncrement, Sprint
from app.narrative import generate_narrative


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/features", tags=["narratives"])
batch_router = APIRouter(prefix="/api/pis", tags=["narratives"])


# ─── Response Schema ──────────────────────────────────────────────────────────

class NarrativeGenerateResponse(BaseModel):
    narrative_text: str
    generated_at: str  # ISO 8601 UTC


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _determine_pi_id(session: Session, feature_issue_id: int) -> int | None:
    """
    Determine the PI for a feature by looking at its child stories' sprint
    membership. Returns the pi_id of the most recent active or future sprint,
    falling back to any sprint associated with a child story.
    """
    # Get child story IDs via feature membership
    child_story_ids = session.scalars(
        select(FeatureMembership.issue_id).where(
            FeatureMembership.feature_issue_id == feature_issue_id
        )
    ).all()

    if not child_story_ids:
        # No child stories — try the feature's own sprint
        feature = session.get(Issue, feature_issue_id)
        if feature and feature.sprint_id:
            sprint = session.get(Sprint, feature.sprint_id)
            if sprint and sprint.pi_id:
                return sprint.pi_id
        return None

    # Look up sprints for child stories, prefer active sprint's PI
    child_issues = session.scalars(
        select(Issue).where(Issue.id.in_(child_story_ids))
    ).all()

    sprint_ids = {i.sprint_id for i in child_issues if i.sprint_id is not None}
    if not sprint_ids:
        return None

    # Get sprints and find the one with a PI, preferring active > future > closed
    sprints = session.scalars(
        select(Sprint).where(Sprint.id.in_(sprint_ids))
    ).all()

    # Filter to sprints with a PI
    sprints_with_pi = [s for s in sprints if s.pi_id is not None]
    if not sprints_with_pi:
        return None

    # Prefer active, then future, then closed
    state_priority = {"active": 0, "future": 1, "closed": 2}
    sprints_with_pi.sort(key=lambda s: state_priority.get(s.state, 3))

    return sprints_with_pi[0].pi_id


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.post(
    "/{feature_key}/narrative/generate",
    response_model=NarrativeGenerateResponse,
)
def generate_feature_narrative(
    feature_key: str,
    session: Session = Depends(get_session),
):
    """
    On-demand narrative generation for a single feature.

    Looks up the feature by jira_key, determines the PI from sprint membership,
    calls the narrative generator, and returns the result.
    """
    # 1. Look up the feature issue by jira_key
    feature = session.scalar(
        select(Issue).where(
            Issue.jira_key == feature_key,
            Issue.issue_type == IssueType.EPIC.value,
        )
    )
    if not feature:
        raise HTTPException(
            status_code=404,
            detail=f"Feature '{feature_key}' not found.",
        )

    # 2. Determine PI from sprint membership
    pi_id = _determine_pi_id(session, feature.id)
    if pi_id is None:
        raise HTTPException(
            status_code=404,
            detail=f"Cannot determine PI for feature '{feature_key}'. "
                   "No sprints with PI association found.",
        )

    # 3. Call narrative generator
    try:
        result = generate_narrative(session, feature.id, pi_id)
    except ProviderNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=exc.message)
    except ProviderAuthError as exc:
        raise HTTPException(status_code=401, detail=exc.message)
    except ProviderRateLimitError as exc:
        raise HTTPException(status_code=429, detail=exc.message)
    except ProviderTimeoutError as exc:
        raise HTTPException(status_code=504, detail=exc.message)
    except LLMParseError as exc:
        raise HTTPException(status_code=502, detail=exc.message)

    # 4. Return response
    return NarrativeGenerateResponse(
        narrative_text=result.narrative_text,
        generated_at=result.generated_at.isoformat(),
    )


# ─── Batch Generation Response Schema ────────────────────────────────────────

class BatchFailureItem(BaseModel):
    feature_key: str
    error: str


class BatchGenerateResponse(BaseModel):
    total: int
    generated: int
    failed: int
    failures: List[BatchFailureItem]


# ─── Batch Generation Helpers ─────────────────────────────────────────────────

def _get_pi_feature_ids(session: Session, pi_id: int) -> list[tuple[int, str]]:
    """
    Find all features (epics) that belong to a PI.

    A feature belongs to a PI if it has child stories (via FeatureMembership)
    that are assigned to sprints within the PI.

    Returns a list of (feature_issue_id, feature_jira_key) tuples.
    """
    # Load sprints belonging to this PI
    pi_sprint_ids = session.scalars(
        select(Sprint.id).where(Sprint.pi_id == pi_id)
    ).all()

    if not pi_sprint_ids:
        return []

    # Find all stories in these sprints
    stories_in_pi = session.scalars(
        select(Issue.id).where(
            Issue.sprint_id.in_(pi_sprint_ids),
            Issue.issue_type == IssueType.STORY.value,
        )
    ).all()

    if not stories_in_pi:
        return []

    # Find distinct feature_issue_ids via FeatureMembership
    feature_issue_ids = session.scalars(
        select(FeatureMembership.feature_issue_id).where(
            FeatureMembership.issue_id.in_(stories_in_pi)
        ).distinct()
    ).all()

    if not feature_issue_ids:
        return []

    # Look up jira_keys for these features
    features = session.scalars(
        select(Issue).where(
            Issue.id.in_(feature_issue_ids),
            Issue.issue_type == IssueType.EPIC.value,
        )
    ).all()

    return [(f.id, f.jira_key) for f in features]


# ─── Batch Generation Endpoint ───────────────────────────────────────────────

@batch_router.post(
    "/{pi}/narratives/generate",
    response_model=BatchGenerateResponse,
)
def batch_generate_narratives(
    pi: str,
    session: Session = Depends(get_session),
):
    """
    Batch narrative generation for all features in a PI.

    Processes features sequentially to avoid Azure OpenAI rate limiting.
    On individual feature failure, logs the error and continues with the
    remaining features. Returns a summary of successes and failures.
    """
    # 1. Validate PI exists
    pi_obj = session.scalar(
        select(ProgramIncrement).where(ProgramIncrement.name == pi)
    )
    if pi_obj is None:
        raise HTTPException(
            status_code=404,
            detail=f"Program Increment '{pi}' not found.",
        )

    # 2. Query all features in this PI
    feature_tuples = _get_pi_feature_ids(session, pi_obj.id)
    total = len(feature_tuples)

    if total == 0:
        return BatchGenerateResponse(
            total=0,
            generated=0,
            failed=0,
            failures=[],
        )

    # 3. Process each feature sequentially
    generated = 0
    failures: List[BatchFailureItem] = []

    for feature_issue_id, feature_key in feature_tuples:
        try:
            generate_narrative(session, feature_issue_id, pi_obj.id)
            generated += 1
        except Exception as exc:
            # Log the failure and continue
            error_msg = f"{type(exc).__name__}: {str(exc)}"
            logger.warning(
                "Batch narrative generation failed for feature %s: %s",
                feature_key,
                error_msg,
            )
            failures.append(BatchFailureItem(
                feature_key=feature_key,
                error=error_msg,
            ))

    # 4. Return summary
    return BatchGenerateResponse(
        total=total,
        generated=generated,
        failed=len(failures),
        failures=failures,
    )
