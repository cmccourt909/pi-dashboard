from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.api.schemas import (
    FeatureHeader,
    FeatureResponse,
    Finding,
    Link,
    ProjectGroup,
    SprintRef,
    Story,
    StoryCount,
)
from app.engine import run_rules  # adjust if your engine entrypoint has a different name
from app.models import (
    FeatureMembership,
    Issue,
    IssueLink,
    Project,
    Sprint,
)

router = APIRouter(prefix="/features", tags=["features"])


@router.get("/{feature_key}", response_model=FeatureResponse)
def get_feature(feature_key: str, session: Session = Depends(get_session)) -> FeatureResponse:
    # 1. Find the feature issue itself
    feature = session.execute(
        select(Issue).where(Issue.key == feature_key)
    ).scalar_one_or_none()
    if feature is None:
        raise HTTPException(status_code=404, detail=f"Feature {feature_key} not found")

    # 2. Load member stories + their projects + sprints in one go
    membership_rows = session.execute(
        select(Issue, Project, Sprint)
        .join(FeatureMembership, FeatureMembership.issue_id == Issue.id)
        .join(Project, Project.id == Issue.project_id)
        .outerjoin(Sprint, Sprint.id == Issue.sprint_id)
        .where(FeatureMembership.feature_issue_id == feature.id)
    ).all()

    if not membership_rows:
        raise HTTPException(
            status_code=404,
            detail=f"Feature {feature_key} exists but has no member stories",
        )

    # 3. Load blocks links where either end is a member story
    member_issue_ids = {row.Issue.id for row in membership_rows}
    link_rows = session.execute(
        select(IssueLink, Issue.key.label("source_key"), Issue.project_id.label("source_project"))
        .join(Issue, Issue.id == IssueLink.source_issue_id)
        .where(IssueLink.source_issue_id.in_(member_issue_ids))
        .where(IssueLink.link_type == "blocks")
    ).all()

    # Resolve target keys + cross-project flag
    target_ids = {row.IssueLink.target_issue_id for row in link_rows}
    targets = {
        t.id: t
        for t in session.execute(select(Issue).where(Issue.id.in_(target_ids))).scalars()
    } if target_ids else {}

    # 4. Denormalize blocks info per story
    blocks_by_source: dict[int, list[int]] = defaultdict(list)
    for row in link_rows:
        blocks_by_source[row.IssueLink.source_issue_id].append(row.IssueLink.target_issue_id)

    blocked_ids = {row.IssueLink.target_issue_id for row in link_rows if row.IssueLink.target_issue_id in member_issue_ids}

    # 5. Build the links array
    links: list[Link] = []
    for row in link_rows:
        target = targets.get(row.IssueLink.target_issue_id)
        if target is None:
            continue
        links.append(
            Link(
                source_key=row.source_key,
                target_key=target.key,
                type="blocks",
                is_cross_project=(row.source_project != target.project_id),
            )
        )

    # 6. Group stories by project, compute per-project counts
    stories_by_project: dict[str, list[Story]] = defaultdict(list)
    project_meta: dict[str, Project] = {}
    counts: dict[str, dict[str, int]] = defaultdict(lambda: {"todo": 0, "in_progress": 0, "done": 0})

    for row in membership_rows:
        issue, project, sprint = row.Issue, row.Project, row.Sprint
        project_meta[project.key] = project

        cat = (issue.status_category or "").lower()
        bucket = "done" if cat == "done" else "in_progress" if cat == "indeterminate" else "todo"
        counts[project.key][bucket] += 1

        stories_by_project[project.key].append(
            Story(
                key=issue.key,
                summary=issue.summary or "",
                status=issue.status or "",
                status_category=issue.status_category or "new",
                assignee=issue.assignee_display_name,
                sprint=SprintRef(id=sprint.id, name=sprint.name, state=sprint.state.value if hasattr(sprint.state, "value") else sprint.state) if sprint else None,
                story_points=issue.story_points,
                is_blocked=issue.id in blocked_ids,
                blocks_count=len(blocks_by_source.get(issue.id, [])),
            )
        )

    projects_out: list[ProjectGroup] = []
    for pkey, stories in stories_by_project.items():
        p = project_meta[pkey]
        projects_out.append(
            ProjectGroup(
                key=p.key,
                name=p.name,
                story_counts=StoryCount(**counts[pkey]),
                stories=sorted(stories, key=lambda s: (s.status_category == "done", s.key)),
            )
        )
    projects_out.sort(key=lambda g: g.key)

    # 7. Percent complete
    total = sum(len(s) for s in stories_by_project.values())
    done = sum(c["done"] for c in counts.values())
    percent_complete = round(100 * done / total) if total else 0

    # 8. Findings — run rules, filter to this feature's issue keys (+ the feature itself)
    member_keys = {row.Issue.key for row in membership_rows} | {feature.key}
    all_findings = run_rules(session)  # adjust to your engine's real signature
    feature_findings = [
        Finding(
            rule_id=f.rule_id,
            severity=f.severity,
            category=f.category,
            issue_key=f.issue_key,
            title=f.title,
            detail=f.detail,
            recommendation=f.recommendation,
            evidence=f.evidence or {},
        )
        for f in all_findings
        if f.issue_key in member_keys
    ]

    # 9. Assemble
    last_ingested = max((row.Issue.updated_at for row in membership_rows if row.Issue.updated_at), default=None)

    return FeatureResponse(
        feature=FeatureHeader(
            key=feature.key,
            summary=feature.summary or "",
            status=feature.status or "",
            percent_complete=percent_complete,
            story_count=total,
            project_count=len(project_meta),
            last_ingested_at=last_ingested,
        ),
        projects=projects_out,
        links=links,
        findings=feature_findings,
    )