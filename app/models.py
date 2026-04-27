"""
Data model for the Jira delivery health app.

Design principles:
  * Raw snapshots are append-only JSON, indexed by pull time + issue key.
    Everything else is derived from them.
  * Normalized tables reflect OUR concepts, not Jira's. Jira is one source.
  * Field discovery is per-site, because every enterprise Jira has different
    custom field IDs for the same semantic concepts.
  * Links are first-class, not denormalized into issues.
  * Works against SQLite for local dev, Postgres for deployment — change
    one env var.

Run this file directly to create the schema:  python -m app.models
"""
from __future__ import annotations

import os
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    Index,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker


# ---------- base ----------

class Base(DeclarativeBase):
    pass
class Organization(Base):
    """A delivery organization. One org can have multiple Jira instances (sites)."""
    __tablename__ = "organization"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    sites: Mapped[list["Site"]] = relationship(back_populates="org")
    program_increments: Mapped[list["ProgramIncrement"]] = relationship(back_populates="org")

# ---------- enums ----------

class HealthStatus(str, Enum):
    GREEN = "green"
    AMBER = "amber"
    RED = "red"
    UNKNOWN = "unknown"


class SprintState(str, Enum):
    FUTURE = "future"
    ACTIVE = "active"
    CLOSED = "closed"


class IssueType(str, Enum):
    STORY = "story"
    EPIC = "epic"
    TASK = "task"
    BUG = "bug"
    SUBTASK = "subtask"
    OTHER = "other"


# ---------- site & field mapping ----------

class Site(Base):
    """A connected Jira instance. You start with one (your sandbox), grow from there."""
    __tablename__ = "site"

    id: Mapped[int] = mapped_column(primary_key=True)
    base_url: Mapped[str] = mapped_column(String(500), unique=True)
    display_name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    field_mappings: Mapped[list["FieldMapping"]] = relationship(back_populates="site")
    projects: Mapped[list["Project"]] = relationship(back_populates="site")
    org_id: Mapped[Optional[int]] = mapped_column(ForeignKey("organization.id"), nullable=True)
    org: Mapped[Optional["Organization"]] = relationship(back_populates="sites")

class FieldMapping(Base):
    """
    Per-site mapping of semantic concept -> Jira customfield id.
    E.g. on chrismc90: 'story_points' -> 'customfield_10016'.
    Populated by the schema-discovery step during site onboarding.
    """
    __tablename__ = "field_mapping"
    __table_args__ = (UniqueConstraint("site_id", "concept"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("site.id"))
    concept: Mapped[str] = mapped_column(String(100))   # 'story_points', 'feature_link', ...
    jira_field_id: Mapped[str] = mapped_column(String(100))   # 'customfield_10016'
    discovered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    site: Mapped[Site] = relationship(back_populates="field_mappings")


# ---------- raw snapshots ----------

class RawIssueSnapshot(Base):
    """
    Append-only. One row per (issue, pull) — full JSON blob as returned by Jira.
    Used for history, velocity math, and re-derivation without re-pulling.
    """
    __tablename__ = "raw_issue_snapshot"
    __table_args__ = (
        Index("ix_raw_issue_key_pulled", "issue_key", "pulled_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("site.id"))
    issue_key: Mapped[str] = mapped_column(String(50))   # e.g. 'PNR-1'
    pulled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    payload: Mapped[dict] = mapped_column(JSON)   # the full Jira response


# ---------- normalized current state ----------
class ProgramIncrement(Base):
    """
    A named planning interval (e.g. '26.2') belonging to an organization.
    Scoped to org, not site — a PI spans all Jira instances for that org.
    """
    __tablename__ = "program_increment"
    __table_args__ = (UniqueConstraint("org_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = mapped_column(ForeignKey("organization.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)   # "26.2"
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    org: Mapped["Organization"] = relationship(back_populates="program_increments")
    sprints: Mapped[list["Sprint"]] = relationship(back_populates="pi")
class Project(Base):
    __tablename__ = "project"
    __table_args__ = (UniqueConstraint("site_id", "jira_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("site.id"))
    jira_key: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(200))

    site: Mapped[Site] = relationship(back_populates="projects")
    sprints: Mapped[list["Sprint"]] = relationship(back_populates="project")
    issues: Mapped[list["Issue"]] = relationship(back_populates="project")


class Sprint(Base):
    __tablename__ = "sprint"
    __table_args__ = (UniqueConstraint("site_id", "jira_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("site.id"))
    project_id: Mapped[int] = mapped_column(ForeignKey("project.id"))
    jira_id: Mapped[int] = mapped_column(Integer)   # Jira's numeric sprint id
    name: Mapped[str] = mapped_column(String(200))
    state: Mapped[str] = mapped_column(String(20))   # SprintState value
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    project: Mapped[Project] = relationship(back_populates="sprints")
    pi_id: Mapped[Optional[int]] = mapped_column(ForeignKey("program_increment.id"), nullable=True)
    pi: Mapped[Optional["ProgramIncrement"]] = relationship(back_populates="sprints")


class Issue(Base):
    """
    Normalized current state of an issue. Updated by ingest. Historical
    versions live in RawIssueSnapshot.
    """
    __tablename__ = "issue"
    __table_args__ = (UniqueConstraint("site_id", "jira_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("site.id"))
    project_id: Mapped[int] = mapped_column(ForeignKey("project.id"))
    sprint_id: Mapped[Optional[int]] = mapped_column(ForeignKey("sprint.id"), nullable=True)

    jira_key: Mapped[str] = mapped_column(String(50))
    jira_id: Mapped[int] = mapped_column(Integer)

    issue_type: Mapped[str] = mapped_column(String(20))   # IssueType value
    summary: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50))
    status_category: Mapped[str] = mapped_column(String(20))   # 'new', 'indeterminate', 'done'
    priority: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    assignee: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reporter: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    story_points: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    last_ingested_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped[Project] = relationship(back_populates="issues")
    sprint: Mapped[Optional[Sprint]] = relationship()


class IssueLink(Base):
    """
    Typed link between two issues. Type examples: 'blocks', 'relates', 'clones'.
    Directional: source_key is the 'from', target_key is the 'to'.
    """
    __tablename__ = "issue_link"
    __table_args__ = (
        UniqueConstraint("site_id", "source_issue_id", "target_issue_id", "link_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("site.id"))
    source_issue_id: Mapped[int] = mapped_column(ForeignKey("issue.id"))
    target_issue_id: Mapped[int] = mapped_column(ForeignKey("issue.id"))
    link_type: Mapped[str] = mapped_column(String(50))   # 'blocks', 'relates', ...

    source: Mapped[Issue] = relationship(foreign_keys=[source_issue_id])
    target: Mapped[Issue] = relationship(foreign_keys=[target_issue_id])


class FeatureMembership(Base):
    """
    Maps issues to their parent feature epic. Supports multiple inference sources
    (explicit parent, explicit link, custom field, label-based). Tracking the source
    lets us explain to users WHY a story rolls up to a feature.
    """
    __tablename__ = "feature_membership"
    __table_args__ = (UniqueConstraint("site_id", "issue_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("site.id"))
    issue_id: Mapped[int] = mapped_column(ForeignKey("issue.id"))
    feature_issue_id: Mapped[int] = mapped_column(ForeignKey("issue.id"))
    source: Mapped[str] = mapped_column(String(50))   # 'parent', 'relates_link', 'feature_link_field', 'label'


# ---------- bootstrap ----------

def get_engine():
    url = os.environ.get("DB_URL", "sqlite:///app.db")
    return create_engine(url, echo=False, future=True)


def get_session_maker():
    return sessionmaker(bind=get_engine(), future=True)


def create_all():
    engine = get_engine()
    Base.metadata.create_all(engine)
    print(f"Schema created on {engine.url}")
    print("Tables:")
    for t in Base.metadata.sorted_tables:
        print(f"  {t.name}")


if __name__ == "__main__":
    create_all()
