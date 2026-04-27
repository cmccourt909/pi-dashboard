"""
The rule implementations.

Each rule is a function decorated with @register that yields Findings.
Rules are pure: no DB access, no HTTP. They consume the pre-loaded Context.

Adding a new rule:
  1. Write a function  def my_rule(ctx: Context) -> Iterable[Finding]
  2. Decorate with @register(id='category.slug', description='...')
  3. Add a test in tests/rules_test.py

Rule IDs are stable strings — users will eventually silence specific rules,
so don't rename them casually.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Iterable

from . import Category, Context, Finding, Severity, register as _register


# ---------- decorator shim so we can attach id/description ----------

def register(id: str, description: str):
    def wrap(fn):
        fn.id = id
        fn.description = description
        _register(fn)
        return fn
    return wrap


# ---------- helpers ----------

def _is_active_sprint_issue(issue, sprint_by_id) -> bool:
    if not issue.sprint_id:
        return False
    sprint = sprint_by_id.get(issue.sprint_id)
    return sprint is not None and sprint.state == "active"


def _days_since(dt, today) -> int:
    if not dt:
        return 10**6
    if isinstance(dt, datetime):
        dt = dt.date()
    return (today - dt).days


def _is_in_progress(issue) -> bool:
    return issue.status_category == "indeterminate"


def _is_done(issue) -> bool:
    return issue.status_category == "done"


# ============================================================
# HYGIENE rules
# ============================================================

@register(
    id="hygiene.unassigned_in_active_sprint",
    description="Stories in an active sprint with no assignee.",
)
def unassigned_in_active_sprint(ctx: Context) -> Iterable[Finding]:
    offenders = [
        i for i in ctx.issues
        if i.issue_type == "story"
        and not i.assignee
        and _is_active_sprint_issue(i, ctx.sprint_by_id)
    ]
    if not offenders:
        return
    keys = tuple(sorted(i.jira_key for i in offenders))
    yield Finding(
        rule_id="hygiene.unassigned_in_active_sprint",
        severity=Severity.WARNING if len(offenders) >= 3 else Severity.INFO,
        category=Category.HYGIENE,
        title=f"{len(offenders)} active-sprint stories have no assignee",
        detail=(
            f"{len(offenders)} stories are in an active sprint but nobody owns them. "
            "Work without an owner tends to slip late in the sprint."
        ),
        issue_keys=keys,
        recommendation=(
            "Review the backlog in today's standup and assign each story to someone. "
            "If the work isn't ready to be owned yet, move it out of the sprint."
        ),
        evidence={"count": len(offenders)},
    )


@register(
    id="hygiene.unestimated_in_active_sprint",
    description="Stories in an active sprint with no story points.",
)
def unestimated_in_active_sprint(ctx: Context) -> Iterable[Finding]:
    offenders = [
        i for i in ctx.issues
        if i.issue_type == "story"
        and i.story_points is None
        and _is_active_sprint_issue(i, ctx.sprint_by_id)
    ]
    if not offenders:
        return
    keys = tuple(sorted(i.jira_key for i in offenders))
    yield Finding(
        rule_id="hygiene.unestimated_in_active_sprint",
        severity=Severity.INFO,
        category=Category.HYGIENE,
        title=f"{len(offenders)} active-sprint stories are unestimated",
        detail=(
            f"{len(offenders)} stories have no story point estimate. Velocity math "
            "can't project completion on unestimated work."
        ),
        issue_keys=keys,
        recommendation="Add estimates in refinement, or remove from sprint until sized.",
        evidence={"count": len(offenders)},
    )


@register(
    id="hygiene.missing_due_date_for_feature",
    description="Feature epic has no due date set.",
)
def feature_missing_due_date(ctx: Context) -> Iterable[Finding]:
    for issue in ctx.issues:
        if issue.issue_type != "epic":
            continue
        if issue.due_date:
            continue
        # Only flag epics that have members (actual feature work)
        if not ctx.feature_members.get(issue.id):
            continue
        yield Finding(
            rule_id="hygiene.missing_due_date_for_feature",
            severity=Severity.WARNING,
            category=Category.HYGIENE,
            title=f"Feature {issue.jira_key} has no target date",
            detail=(
                "Without a target date we can't tell whether the feature is on track. "
                "Trajectory and risk rules have nothing to compare against."
            ),
            issue_keys=(issue.jira_key,),
            recommendation=(
                "Set a target end date on the epic based on the current PI commitment."
            ),
            evidence={"feature_key": issue.jira_key},
        )


# ============================================================
# FLOW rules
# ============================================================

@register(
    id="flow.stale_in_progress",
    description="Issues in-progress with no update for 10+ days.",
)
def stale_in_progress(ctx: Context) -> Iterable[Finding]:
    STALE_DAYS = 10
    offenders = [
        i for i in ctx.issues
        if _is_in_progress(i)
        and _days_since(i.updated_at, ctx.today) >= STALE_DAYS
    ]
    if not offenders:
        return
    offenders.sort(key=lambda i: _days_since(i.updated_at, ctx.today), reverse=True)
    keys = tuple(i.jira_key for i in offenders[:10])
    worst = offenders[0]
    worst_age = _days_since(worst.updated_at, ctx.today)
    yield Finding(
        rule_id="flow.stale_in_progress",
        severity=Severity.WARNING,
        category=Category.FLOW,
        title=f"{len(offenders)} in-progress stories haven't moved in 10+ days",
        detail=(
            f"Stories sit in active statuses but show no recent updates. "
            f"Oldest is {worst.jira_key} at {worst_age} days since last change."
        ),
        issue_keys=keys,
        recommendation=(
            "In standup, ask the owners: is this blocked, waiting, or abandoned? "
            "Move to Blocked, pull something else in, or close."
        ),
        evidence={"count": len(offenders), "oldest_days": worst_age},
    )


@register(
    id="flow.in_progress_without_assignee",
    description="Issue is in-progress but has no assignee (something is off).",
)
def in_progress_without_assignee(ctx: Context) -> Iterable[Finding]:
    offenders = [
        i for i in ctx.issues
        if _is_in_progress(i) and not i.assignee
    ]
    if not offenders:
        return
    keys = tuple(sorted(i.jira_key for i in offenders))
    yield Finding(
        rule_id="flow.in_progress_without_assignee",
        severity=Severity.CRITICAL if len(offenders) >= 5 else Severity.WARNING,
        category=Category.FLOW,
        title=f"{len(offenders)} in-progress stories have no assignee",
        detail=(
            "Stories can't be 'in progress' without someone progressing them. "
            "Either the status is wrong or someone forgot to assign."
        ),
        issue_keys=keys,
        recommendation=(
            "Walk the list: confirm who's actually working on each, assign them, "
            "or move the status back to To Do."
        ),
        evidence={"count": len(offenders)},
    )


# ============================================================
# DEPENDENCY rules
# ============================================================

@register(
    id="dependency.blocker_not_started",
    description="Issue is blocked by another issue that hasn't started yet.",
)
def blocker_not_started(ctx: Context) -> Iterable[Finding]:
    # Collect 'blocks' relationships: source blocks target.
    # We flag the TARGET as at risk when SOURCE is not yet in progress.
    offenders = []
    for link in ctx.links:
        if link.link_type != "blocks":
            continue
        src = ctx.issue_by_id.get(link.source_issue_id)
        tgt = ctx.issue_by_id.get(link.target_issue_id)
        if not src or not tgt:
            continue
        # If the blocker hasn't started yet
        if src.status_category == "new":
            offenders.append((src, tgt))

    if not offenders:
        return

    # Group by the blocked issue to avoid spamming one per link
    by_blocked = defaultdict(list)
    for src, tgt in offenders:
        by_blocked[tgt.jira_key].append(src.jira_key)

    for blocked_key, blockers in sorted(by_blocked.items()):
        yield Finding(
            rule_id="dependency.blocker_not_started",
            severity=Severity.CRITICAL,
            category=Category.DEPENDENCY,
            title=f"{blocked_key} is blocked by un-started work",
            detail=(
                f"{blocked_key} is blocked by {len(blockers)} issue(s) that haven't started: "
                f"{', '.join(sorted(blockers))}. It cannot progress until those do."
            ),
            issue_keys=(blocked_key, *sorted(blockers)),
            recommendation=(
                f"Decide: pull {blockers[0]} into the current sprint to unblock, "
                "or explicitly deprioritize the blocked work."
            ),
            evidence={"blocked": blocked_key, "blockers": sorted(blockers)},
        )


@register(
    id="dependency.cross_project_chain",
    description="Highlight cross-project blocks dependencies for cross-team planning.",
)
def cross_project_chain(ctx: Context) -> Iterable[Finding]:
    cross = []
    for link in ctx.links:
        if link.link_type != "blocks":
            continue
        src = ctx.issue_by_id.get(link.source_issue_id)
        tgt = ctx.issue_by_id.get(link.target_issue_id)
        if not src or not tgt:
            continue
        src_proj = ctx.project_by_id.get(src.project_id)
        tgt_proj = ctx.project_by_id.get(tgt.project_id)
        if src_proj and tgt_proj and src_proj.id != tgt_proj.id:
            cross.append((src, tgt, src_proj.jira_key, tgt_proj.jira_key))
    if not cross:
        return
    # One aggregate finding for the delivery manager's awareness.
    keys: list[str] = []
    for src, tgt, _, _ in cross:
        if src.jira_key not in keys:
            keys.append(src.jira_key)
        if tgt.jira_key not in keys:
            keys.append(tgt.jira_key)
    yield Finding(
        rule_id="dependency.cross_project_chain",
        severity=Severity.WARNING,
        category=Category.DEPENDENCY,
        title=f"{len(cross)} blocks links cross project boundaries",
        detail=(
            "Dependencies that cross teams need coordinated planning. "
            "Sprint boundaries between projects often misalign on these."
        ),
        issue_keys=tuple(keys[:10]),
        recommendation=(
            "In the next scrum-of-scrums, walk the cross-project dependency list "
            "and confirm both sides have the work in the same PI."
        ),
        evidence={"count": len(cross)},
    )


# ============================================================
# TRAJECTORY rules
# ============================================================

@register(
    id="trajectory.feature_progress",
    description="Report % complete (by story points) and projected completion per feature.",
)
def feature_progress(ctx: Context) -> Iterable[Finding]:
    for feature_id, member_ids in ctx.feature_members.items():
        feature = ctx.issue_by_id.get(feature_id)
        if not feature:
            continue
        members = [ctx.issue_by_id[mid] for mid in member_ids if mid in ctx.issue_by_id]
        if not members:
            continue

        estimated = [m for m in members if m.story_points]
        total_sp = sum(m.story_points or 0 for m in estimated)
        done_sp = sum(m.story_points or 0 for m in estimated if _is_done(m))
        done_count = sum(1 for m in members if _is_done(m))

        pct_by_count = (done_count / len(members)) * 100 if members else 0
        pct_by_sp = (done_sp / total_sp) * 100 if total_sp else 0

        # Determine severity from a combination of factors
        severity = Severity.INFO
        if feature.due_date:
            days_left = (feature.due_date.date() - ctx.today).days if isinstance(feature.due_date, datetime) else (feature.due_date - ctx.today).days
            if days_left < 14 and pct_by_sp < 70:
                severity = Severity.CRITICAL
            elif days_left < 30 and pct_by_sp < 50:
                severity = Severity.WARNING

        yield Finding(
            rule_id="trajectory.feature_progress",
            severity=severity,
            category=Category.TRAJECTORY,
            title=f"{feature.jira_key}: {pct_by_count:.0f}% of stories done ({done_count}/{len(members)})",
            detail=(
                f"Story-point completion: {done_sp:.0f}/{total_sp:.0f} ({pct_by_sp:.0f}%). "
                f"Unestimated stories: {len(members) - len(estimated)}. "
                f"Target: {feature.due_date.date() if feature.due_date else 'not set'}."
            ),
            issue_keys=(feature.jira_key,),
            recommendation=(
                "If completion % is well below target-date % elapsed, plan remediation now: "
                "reduce scope, pull more capacity in, or adjust the date."
            ),
            evidence={
                "done_count": done_count,
                "total_count": len(members),
                "done_sp": done_sp,
                "total_sp": total_sp,
                "pct_by_count": round(pct_by_count, 1),
                "pct_by_sp": round(pct_by_sp, 1),
            },
        )


@register(
    id="trajectory.carryover_risk",
    description="Active sprints with majority of story points still not done.",
)
def carryover_risk(ctx: Context) -> Iterable[Finding]:
    active_sprints = [s for s in ctx.sprints if s.state == "active"]
    for sprint in active_sprints:
        members = [i for i in ctx.issues if i.sprint_id == sprint.id]
        if not members:
            continue
        total_sp = sum(i.story_points or 0 for i in members)
        done_sp = sum(i.story_points or 0 for i in members if _is_done(i))
        if total_sp == 0:
            continue

        # How far through the sprint are we?
        if not (sprint.start_date and sprint.end_date):
            continue
        start = sprint.start_date.date() if isinstance(sprint.start_date, datetime) else sprint.start_date
        end = sprint.end_date.date() if isinstance(sprint.end_date, datetime) else sprint.end_date
        sprint_days = max((end - start).days, 1)
        elapsed = max((ctx.today - start).days, 0)
        pct_elapsed = min(elapsed / sprint_days, 1.0) * 100
        pct_done = (done_sp / total_sp) * 100

        # Flag if we're >60% through the sprint but <40% done
        if pct_elapsed > 60 and pct_done < 40:
            yield Finding(
                rule_id="trajectory.carryover_risk",
                severity=Severity.CRITICAL if pct_elapsed > 80 else Severity.WARNING,
                category=Category.TRAJECTORY,
                title=f"Sprint {sprint.name}: {pct_done:.0f}% done at {pct_elapsed:.0f}% elapsed",
                detail=(
                    f"Sprint is {pct_elapsed:.0f}% through its timebox but only "
                    f"{pct_done:.0f}% of committed story points are complete. "
                    "Carryover is likely."
                ),
                issue_keys=tuple(sorted(i.jira_key for i in members if not _is_done(i))[:10]),
                recommendation=(
                    "Identify what slips to next sprint now, not at sprint-end. "
                    "Call it out in the next standup so the team can plan."
                ),
                evidence={
                    "sprint": sprint.name,
                    "pct_elapsed": round(pct_elapsed, 1),
                    "pct_done": round(pct_done, 1),
                    "total_sp": total_sp,
                    "done_sp": done_sp,
                },
            )
