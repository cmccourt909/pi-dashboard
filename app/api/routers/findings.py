from __future__ import annotations
from fastapi import APIRouter, Query
from app.engine import run_site
from app.api.schemas import FindingOut
from typing import Optional

router = APIRouter(prefix="/api/findings", tags=["findings"])

@router.get("", response_model=list[FindingOut])
def list_findings(
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
):
    _, findings = run_site()
    result = []
    for f in findings:
        if severity and f.severity.value != severity:
            continue
        if category and f.category.value != category:
            continue
        result.append(FindingOut(
            rule_id=f.rule_id,
            severity=f.severity.value,
            category=f.category.value,
            title=f.title,
            detail=f.detail,
            recommendation=f.recommendation,
            issue_keys=list(f.issue_keys),
        ))
    return result
