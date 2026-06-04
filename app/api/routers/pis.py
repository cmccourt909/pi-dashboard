from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.engine import run_site
from app.api.deps import get_session
from app.api.queries import get_pi_summaries
from app.api.schemas import PISummary

router = APIRouter(prefix="/api/pis", tags=["pis"])

@router.get("", response_model=list[PISummary])
def list_pis(session: Session = Depends(get_session)):
    _, findings = run_site()
    return get_pi_summaries(session, findings)
