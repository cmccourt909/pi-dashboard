from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class SprintSummary(BaseModel):
    jira_id: int
    name: str
    state: str
    start_date: Optional[str]
    end_date: Optional[str]
    total_issues: int
    done_issues: int
    blocked_issues: int
    pct_complete: float


class PISummary(BaseModel):
    name: str
    start_date: str
    end_date: str
    total_issues: int
    done_issues: int
    blocked_issues: int
    pct_complete: float
    critical_findings: int
    health: str   # green / amber / red
    sprints: list[SprintSummary]


class FeatureStorySummary(BaseModel):
    jira_key: str
    summary: str
    status: str
    status_category: str
    project_key: str
    sprint_name: Optional[str]
    assignee: Optional[str]
    story_points: Optional[float]
    blocked: bool


class FeatureSummary(BaseModel):
    feature_key: str
    feature_summary: str
    total_stories: int
    done_stories: int
    blocked_stories: int
    pct_complete: float
    health: str
    stories: list[FeatureStorySummary]


class FindingOut(BaseModel):
    rule_id: str
    severity: str
    category: str
    title: str
    detail: str
    recommendation: str
    issue_keys: list[str]


class PICompletionOut(BaseModel):
    pi_name: str
    done_pct: float
    prog_pct: float
    todo_pct: float
    story_count: int
    sp_done: float
    sp_total: float


class SprintBreakdownOut(BaseModel):
    sprint_name: str
    state: str  # "active" | "future" | "closed"
    story_count: int
    done_count: int


class FeatureItemOut(BaseModel):
    feature_key: str
    summary: str
    team: str
    assignee: Optional[str]
    status: str
    status_category: str
    rag_status: str  # "red" | "amber" | "green"
    pi_completion: list[PICompletionOut]
    blockers: list[str]
    is_blocked_by: list[str]
    sprint_breakdown: list[SprintBreakdownOut]
    lodestar_static: Optional[str]
    generated_at: Optional[str] = None
