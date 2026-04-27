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
