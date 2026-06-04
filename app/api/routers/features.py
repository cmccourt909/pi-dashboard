from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.engine import run_site
from app.api.deps import get_session
from app.api.queries import get_feature_summaries
from app.api.schemas import FeatureSummary

router = APIRouter(prefix="/api/features", tags=["features"])

@router.get("", response_model=list[FeatureSummary])
def list_features(session: Session = Depends(get_session)):
    _, findings = run_site()
    return get_feature_summaries(session, findings)
