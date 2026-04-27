from __future__ import annotations
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import (
    Organization, ProgramIncrement, Sprint, Issue, IssueLink,
    FeatureMembership, Project, get_session_maker
)
from app.api.schemas import (
    PISummary, SprintSummary, FeatureSummary, FeatureStorySummary
)


BLOCKED_STATUSES = {"blocked", "impediment"}
BLOCKED_LINK_TYPES = {"blocks"}


def _is_blocked(issue: Issue, links: list[IssueLink], issue_by_id: dict) -> bool:
    for link in links:
        if link.target_issue_id == issue.id and link.link_type in BLOCKED_LINK_TYPES:
            blocker = issue_by_id.get(link.source_issue_id)
            if blocker and blocker.status_category != "done":
                return True
    return False


def _health(pct_complete: float, critical_findings: int, blocked_issues: int, total_issues: int) -> str:
    blocked_pct = (blocked_issues / total_issues * 100) if total_issues else 0
    if critical_findings > 1 or blocked_pct > 40:
        return "red"
    if critical_findings == 1 or blocked_pct >= 20:
        return "amber"
    return "green"


def get_pi_summaries(session: Session, findings: list) -> list[PISummary]:
    pis = session.scalars(
        select(ProgramIncrement).order_by(ProgramIncrement.name)
    ).all()

    critical_by_pi: dict[str, int] = {}
    for f in findings:
        if f.severity.value == "critical":
            pi_names_hit = set()
            for key in f.issue_keys:
                issue = session.scalars(
                    select(Issue).where(Issue.jira_key == key)
                ).first()
                if issue and issue.sprint_id:
                    sprint = session.get(Sprint, issue.sprint_id)
                    if sprint and sprint.pi:
                        pi_names_hit.add(sprint.pi.name)
            for pi_name in pi_names_hit:
                critical_by_pi[pi_name] = critical_by_pi.get(pi_name, 0) + 1

    all_links = session.scalars(select(IssueLink)).all()
    all_issues = session.scalars(select(Issue)).all()
    issue_by_id = {i.id: i for i in all_issues}

    results = []
    for pi in pis:
        sprint_summaries = []
        pi_total = pi_done = pi_blocked = 0

        for sprint in sorted(pi.sprints, key=lambda s: s.name):
            issues = [i for i in all_issues if i.sprint_id == sprint.id]
            total = len(issues)
            done = sum(1 for i in issues if i.status_category == "done")
            blocked = sum(1 for i in issues if _is_blocked(i, all_links, issue_by_id))
            pct = round(done / total * 100, 1) if total else 0.0

            sprint_summaries.append(SprintSummary(
                jira_id=sprint.jira_id,
                name=sprint.name,
                state=sprint.state,
                start_date=sprint.start_date.date().isoformat() if sprint.start_date else None,
                end_date=sprint.end_date.date().isoformat() if sprint.end_date else None,
                total_issues=total,
                done_issues=done,
                blocked_issues=blocked,
                pct_complete=pct,
            ))
            pi_total += total
            pi_done += done
            pi_blocked += blocked

        pct_complete = round(pi_done / pi_total * 100, 1) if pi_total else 0.0
        criticals = critical_by_pi.get(pi.name, 0)

        results.append(PISummary(
            name=pi.name,
            start_date=pi.start_date.date().isoformat(),
            end_date=pi.end_date.date().isoformat(),
            total_issues=pi_total,
            done_issues=pi_done,
            blocked_issues=pi_blocked,
            pct_complete=pct_complete,
            critical_findings=criticals,
            health=_health(pct_complete, criticals, pi_blocked, pi_total),
            sprints=sprint_summaries,
        ))

    return results


def get_feature_summaries(session: Session, findings: list) -> list[FeatureSummary]:
    memberships = session.scalars(select(FeatureMembership)).all()
    all_issues = session.scalars(select(Issue)).all()
    all_links = session.scalars(select(IssueLink)).all()
    issue_by_id = {i.id: i for i in all_issues}

    critical_by_feature: dict[int, int] = {}
    for f in findings:
        if f.severity.value == "critical":
            for key in f.issue_keys:
                issue = session.scalars(
                    select(Issue).where(Issue.jira_key == key)
                ).first()
                if issue:
                    for m in memberships:
                        if m.issue_id == issue.id:
                            fid = m.feature_issue_id
                            critical_by_feature[fid] = critical_by_feature.get(fid, 0) + 1

    feature_ids = list({m.feature_issue_id for m in memberships})
    results = []

    for fid in feature_ids:
        feature_issue = issue_by_id.get(fid)
        if not feature_issue:
            continue

        member_ids = {m.issue_id for m in memberships if m.feature_issue_id == fid}
        stories = [issue_by_id[mid] for mid in member_ids if mid in issue_by_id]

        total = len(stories)
        done = sum(1 for s in stories if s.status_category == "done")
        blocked = sum(1 for s in stories if _is_blocked(s, all_links, issue_by_id))
        pct = round(done / total * 100, 1) if total else 0.0
        criticals = critical_by_feature.get(fid, 0)

        story_summaries = []
        for s in sorted(stories, key=lambda x: x.jira_key):
            sprint = session.get(Sprint, s.sprint_id) if s.sprint_id else None
            project = session.get(Project, s.project_id)
            story_summaries.append(FeatureStorySummary(
                jira_key=s.jira_key,
                summary=s.summary,
                status=s.status,
                status_category=s.status_category,
                project_key=project.jira_key if project else "",
                sprint_name=sprint.name if sprint else None,
                assignee=s.assignee,
                story_points=s.story_points,
                blocked=_is_blocked(s, all_links, issue_by_id),
            ))

        results.append(FeatureSummary(
            feature_key=feature_issue.jira_key,
            feature_summary=feature_issue.summary,
            total_stories=total,
            done_stories=done,
            blocked_stories=blocked,
            pct_complete=pct,
            health=_health(pct, criticals, blocked, total),
            stories=story_summaries,
        ))

    return sorted(results, key=lambda f: f.feature_key)

