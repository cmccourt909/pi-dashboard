from __future__ import annotations
from fastapi import APIRouter
from app.engine import run_site
from app.models import get_session_maker
from app.api.queries import get_feature_summaries
from app.api.schemas import FeatureSummary

router = APIRouter(prefix="/api/features", tags=["features"])

@router.get("", response_model=list[FeatureSummary])
def list_features():
    SessionLocal = get_session_maker()
    with SessionLocal() as session:
        _, findings = run_site()
        return get_feature_summaries(session, findings)
