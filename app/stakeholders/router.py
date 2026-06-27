"""
app/stakeholders/router.py

FastAPI APIRouter for the Stakeholder Analysis feature.

Endpoints:
  POST /api/stakeholders/upload          — Upload transcript and create session
  GET  /api/stakeholders/sessions        — List past sessions
  GET  /api/stakeholders/sessions/{id}   — Get session detail with section results
  GET  /api/stakeholders/sessions/{id}/stream — Stream analysis (SSE)
  POST /api/stakeholders/sessions/{id}/sections/{section}/regenerate — Regenerate section
  GET  /api/stakeholders/sessions/{id}/export — Export session as Markdown
  DELETE /api/stakeholders/sessions/{id} — Delete session
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_session
from app.models import AnalysisSession, AnalysisSectionResult
from app.stakeholders.prompts import STAKEHOLDER_PROMPT_VERSION

try:
    from sse_starlette.sse import EventSourceResponse
except ImportError as e:
    raise ImportError(
        "sse-starlette is required for stakeholder streaming. "
        "Add 'sse-starlette>=1.6.5' to app/requirements.txt and reinstall."
    ) from e

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stakeholders", tags=["stakeholders"])

# Maximum upload file size: 5 MB
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

# The 8 analysis sections
ANALYSIS_SECTIONS = [
    "speaker_statistics",
    "meeting_minutes",
    "raid_log",
    "delivery_signals",
    "team_health",
    "gap_analysis",
    "empathy_map",
    "stakeholder_register",
]

# Regex to detect speaker attribution patterns.
# Matches lines like "Name:" or "Speaker Name:" at the start of a line.
_SPEAKER_PATTERN = re.compile(r"^\s*[A-Z][A-Za-z\s\-'.]+:\s", re.MULTILINE)


# ---------------------------------------------------------------------------
# Adapter factory (same pattern as lodestar)
# ---------------------------------------------------------------------------

def _get_adapter():
    """Select the LLM adapter from STAKEHOLDER_ADAPTER env var."""
    adapter_name = os.getenv("STAKEHOLDER_ADAPTER", os.getenv("LODESTAR_ADAPTER", "azure_openai")).lower()

    if adapter_name == "claude":
        from app.lodestar.adapters import ClaudeAdapter
        return ClaudeAdapter()
    if adapter_name == "openai":
        from app.lodestar.adapters import OpenAIAdapter
        return OpenAIAdapter()

    from app.lodestar.adapters import AzureOpenAIAdapter
    return AzureOpenAIAdapter()


# ---------------------------------------------------------------------------
# POST /api/stakeholders/upload
# ---------------------------------------------------------------------------

@router.post("/upload")
def upload_transcript(
    file: UploadFile,
    db: Session = Depends(get_session),
):
    """Upload a transcript file and create a new analysis session.

    Accepts multipart/form-data with a single file field.
    Returns session_id, filename, and an optional warning if no speaker
    attribution is detected.
    """
    # Validate file extension
    filename = file.filename or ""
    if not filename.lower().endswith(".txt"):
        raise HTTPException(
            status_code=415,
            detail="Only .txt files are supported",
        )

    # Read file content and validate size
    content_bytes = file.file.read()
    if len(content_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File exceeds 5MB limit",
        )

    transcript_text = content_bytes.decode("utf-8", errors="replace")

    # Detect speaker attribution
    has_speaker_attribution = bool(_SPEAKER_PATTERN.search(transcript_text))

    # Create session
    session_id = str(uuid.uuid4())
    analysis_session = AnalysisSession(
        id=session_id,
        filename=filename,
        file_size_bytes=len(content_bytes),
        transcript_text=transcript_text,
        has_speaker_attribution=has_speaker_attribution,
        status="pending",
        prompt_version=STAKEHOLDER_PROMPT_VERSION,
    )
    db.add(analysis_session)

    # Create 8 section result rows with status "pending"
    for section_key in ANALYSIS_SECTIONS:
        section_result = AnalysisSectionResult(
            session_id=session_id,
            section_key=section_key,
            status="pending",
        )
        db.add(section_result)

    db.commit()

    # Build response
    warning = None
    if not has_speaker_attribution:
        warning = (
            "No speaker attribution detected in the transcript. "
            "Results may be limited for speaker-dependent analyses."
        )

    return {
        "session_id": session_id,
        "filename": filename,
        "warning": warning,
    }


# ---------------------------------------------------------------------------
# GET /api/stakeholders/sessions
# ---------------------------------------------------------------------------

@router.get("/sessions")
def list_sessions(db: Session = Depends(get_session)):
    """List all analysis sessions (most recent first)."""
    sessions = db.scalars(
        select(AnalysisSession).order_by(AnalysisSession.created_at.desc())
    ).all()

    return [
        {
            "id": s.id,
            "filename": s.filename,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "status": s.status,
        }
        for s in sessions
    ]


# ---------------------------------------------------------------------------
# GET /api/stakeholders/sessions/{session_id}
# ---------------------------------------------------------------------------

@router.get("/sessions/{session_id}")
def get_session_detail(session_id: str, db: Session = Depends(get_session)):
    """Get session detail with all section results."""
    session_row = db.scalar(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")

    sections = db.scalars(
        select(AnalysisSectionResult).where(
            AnalysisSectionResult.session_id == session_id
        )
    ).all()

    return {
        "id": session_row.id,
        "filename": session_row.filename,
        "file_size_bytes": session_row.file_size_bytes,
        "has_speaker_attribution": session_row.has_speaker_attribution,
        "status": session_row.status,
        "created_at": session_row.created_at.isoformat() if session_row.created_at else None,
        "completed_at": session_row.completed_at.isoformat() if session_row.completed_at else None,
        "prompt_version": session_row.prompt_version,
        "sections": [
            {
                "section_key": sec.section_key,
                "status": sec.status,
                "result_text": sec.result_text,
                "error_message": sec.error_message,
                "generated_at": sec.generated_at.isoformat() if sec.generated_at else None,
                "model_name": sec.model_name,
            }
            for sec in sections
        ],
    }


# ---------------------------------------------------------------------------
# DELETE /api/stakeholders/sessions/{session_id}
# ---------------------------------------------------------------------------

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_session)):
    """Delete a session and cascade to section results."""
    session_row = db.scalar(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(session_row)
    db.commit()
    return {"status": "deleted", "session_id": session_id}


# ---------------------------------------------------------------------------
# GET /api/stakeholders/sessions/{session_id}/stream
# ---------------------------------------------------------------------------

@router.get("/sessions/{session_id}/stream")
def stream_analysis(session_id: str, db: Session = Depends(get_session)):
    """Stream analysis results for a session via SSE.

    Runs all 8 sections in parallel, multiplexing SSE events.

    Event types:
      { type: "section_start", section: "..." }
      { type: "chunk", section: "...", text: "..." }
      { type: "section_done", section: "..." }
      { type: "section_error", section: "...", error: "..." }
      { type: "all_done" }
    """
    session_row = db.scalar(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update session status to running
    session_row.status = "running"
    db.commit()

    transcript = session_row.transcript_text
    adapter = _get_adapter()

    from app.stakeholders.orchestrator import AnalysisOrchestrator

    orchestrator = AnalysisOrchestrator(
        transcript=transcript,
        adapter=adapter,
        session_id=session_id,
    )

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }

    return EventSourceResponse(
        orchestrator.run_all(),
        headers=headers,
    )


# ---------------------------------------------------------------------------
# POST /api/stakeholders/sessions/{session_id}/sections/{section}/regenerate
# ---------------------------------------------------------------------------

@router.post("/sessions/{session_id}/sections/{section}/regenerate")
def regenerate_section(
    session_id: str,
    section: str,
    db: Session = Depends(get_session),
):
    """Regenerate a single analysis section via SSE streaming.

    Validates the session and section key, then streams the regenerated
    result for that section only.
    """
    # Validate session
    session_row = db.scalar(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")

    # Validate section key
    if section not in ANALYSIS_SECTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid section '{section}'. Valid sections: {ANALYSIS_SECTIONS}",
        )

    # Reset section status to pending before regeneration
    section_row = db.scalar(
        select(AnalysisSectionResult).where(
            AnalysisSectionResult.session_id == session_id,
            AnalysisSectionResult.section_key == section,
        )
    )
    if section_row:
        section_row.status = "running"
        section_row.result_text = None
        section_row.error_message = None
        db.commit()

    transcript = session_row.transcript_text
    adapter = _get_adapter()

    from app.stakeholders.orchestrator import AnalysisOrchestrator

    orchestrator = AnalysisOrchestrator(
        transcript=transcript,
        adapter=adapter,
        session_id=session_id,
    )

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }

    return EventSourceResponse(
        orchestrator.run_section(section),
        headers=headers,
    )


# ---------------------------------------------------------------------------
# GET /api/stakeholders/sessions/{session_id}/export
# ---------------------------------------------------------------------------

@router.get("/sessions/{session_id}/export")
def export_session(
    session_id: str,
    format: str = Query(default="markdown"),
    db: Session = Depends(get_session),
):
    """Export a completed session as a Markdown file download."""
    session_row = db.scalar(
        select(AnalysisSession).where(AnalysisSession.id == session_id)
    )
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")

    from app.stakeholders.export import ExportService

    export_service = ExportService(session_row, db)
    markdown_content = export_service.to_markdown()

    # Create a safe filename
    safe_filename = re.sub(r"[^\w\-.]", "_", session_row.filename or "analysis")
    if safe_filename.endswith(".txt"):
        safe_filename = safe_filename[:-4]
    download_filename = f"{safe_filename}_analysis.md"

    return PlainTextResponse(
        content=markdown_content,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"',
        },
    )
