"""
Core types for the risk detection engine.

A Rule is a pure function over the ingested data. It returns Findings.
A Finding is a structured object that:
  - names what's wrong (category + message)
  - says how bad it is (severity)
  - points at affected issues (so UI can link)
  - suggests what to do (recommendation)
  - explains the signal (evidence — for transparency / debugging)

Keep this file small. Additions go in rules/checks.py.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Iterable, Protocol


class Severity(str, Enum):
    CRITICAL = "critical"   # will miss a date, or blocks others who will
    WARNING = "warning"     # trending the wrong way, needs attention
    INFO = "info"           # hygiene / housekeeping


class Category(str, Enum):
    HYGIENE = "hygiene"
    FLOW = "flow"
    DEPENDENCY = "dependency"
    TRAJECTORY = "trajectory"


# Stable ordering for deterministic output.
_SEVERITY_ORDER = {Severity.CRITICAL: 0, Severity.WARNING: 1, Severity.INFO: 2}
_CATEGORY_ORDER = {
    Category.TRAJECTORY: 0,
    Category.DEPENDENCY: 1,
    Category.FLOW: 2,
    Category.HYGIENE: 3,
}


@dataclass(frozen=True)
class Finding:
    rule_id: str                # e.g. 'hygiene.unassigned_in_active_sprint'
    severity: Severity
    category: Category
    title: str                  # one-line headline, no period
    detail: str                 # 1-3 sentences
    issue_keys: tuple[str, ...] = ()   # issues implicated (tuple for hashability)
    recommendation: str = ""
    evidence: dict = field(default_factory=dict, hash=False, compare=False)

    def sort_key(self):
        """Deterministic ordering: worst first, then category, then first key."""
        return (
            _SEVERITY_ORDER[self.severity],
            _CATEGORY_ORDER[self.category],
            self.rule_id,
            self.issue_keys[0] if self.issue_keys else "",
        )


class Rule(Protocol):
    """A Rule is any callable that takes a Context and yields Findings."""
    id: str
    description: str

    def __call__(self, ctx: "Context") -> Iterable[Finding]: ...


@dataclass
class Context:
    """
    Pre-loaded data passed to every rule. Each rule pulls what it needs.
    Loading once keeps rules fast and DB-agnostic.
    """
    site_id: int
    site_name: str
    today: "datetime.date"
    issues: list            # list[Issue]
    sprints: list           # list[Sprint]
    projects: list          # list[Project]
    links: list             # list[IssueLink]
    memberships: list       # list[FeatureMembership]

    # Precomputed indices — built once by the engine loader
    issue_by_id: dict = field(default_factory=dict)
    issue_by_key: dict = field(default_factory=dict)
    sprint_by_id: dict = field(default_factory=dict)
    project_by_id: dict = field(default_factory=dict)
    feature_members: dict = field(default_factory=dict)   # feature_id -> [issue_ids]


# ---------- registry ----------

_RULES: list[Rule] = []


def register(rule: Rule) -> Rule:
    """Decorator to register a rule with the engine."""
    _RULES.append(rule)
    return rule


def all_rules() -> list[Rule]:
    return list(_RULES)
