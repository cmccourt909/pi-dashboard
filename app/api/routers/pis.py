from __future__ import annotations
from fastapi import APIRouter
from app.engine import run_site
from app.models import get_session_maker
from app.api.queries import get_pi_summaries
from app.api.schemas import PISummary

router = APIRouter(prefix="/api/pis", tags=["pis"])

@router.get("", response_model=list[PISummary])
def list_pis():
    SessionLocal = get_session_maker()
    with SessionLocal() as session:
        _, findings = run_site()
        return get_pi_summaries(session, findings)
