"""
app/stakeholders/orchestrator.py

AnalysisOrchestrator — coordinates execution of all eight analysis sections
against a transcript using LLM adapters. Runs independent sections in parallel
via asyncio.TaskGroup and multiplexes SSE events onto a single stream.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import AsyncGenerator

from app.stakeholders.prompts import (
    SECTION_MAX_TOKENS,
    STAKEHOLDER_PROMPT_VERSION,
    build_section_prompt,
)

logger = logging.getLogger(__name__)

# Per-section timeout (configurable via env var)
STAKEHOLDER_STREAM_TIMEOUT_SECONDS = int(
    os.environ.get("STAKEHOLDER_STREAM_TIMEOUT_SECONDS", "30")
)

# The 8 analysis sections
SECTIONS: list[str] = [
    "speaker_statistics",
    "meeting_minutes",
    "raid_log",
    "delivery_signals",
    "team_health",
    "gap_analysis",
    "empathy_map",
    "stakeholder_register",
]


# ---------------------------------------------------------------------------
# SSE event helpers
# ---------------------------------------------------------------------------

def _section_start_event(section: str) -> dict:
    return {"data": json.dumps({"type": "section_start", "section": section})}


def _chunk_event(section: str, text: str) -> dict:
    return {"data": json.dumps({"type": "chunk", "section": section, "text": text})}


def _section_done_event(section: str) -> dict:
    return {"data": json.dumps({"type": "section_done", "section": section})}


def _section_error_event(section: str, error: str) -> dict:
    return {"data": json.dumps({"type": "section_error", "section": section, "error": error})}


def _all_done_event() -> dict:
    return {"data": json.dumps({"type": "all_done"})}


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

class AnalysisOrchestrator:
    """Runs analysis sections against a transcript using LLM adapters.

    Runs all 8 sections in parallel via asyncio.TaskGroup. Uses an
    asyncio.Queue as a fan-in point for multiplexing SSE events from
    parallel sections onto a single output stream.
    """

    SECTIONS = SECTIONS

    def __init__(self, transcript: str, adapter, session_id: str):
        """
        Args:
            transcript: The full meeting transcript text.
            adapter: An LLM adapter with an async `stream(prompt)` method.
            session_id: The database session ID for persisting results.
        """
        self.transcript = transcript
        self.adapter = adapter
        self.session_id = session_id

    async def run_all(self) -> AsyncGenerator[dict, None]:
        """Run all 8 sections in parallel and yield multiplexed SSE events.

        Event sequence per section:
          section_start → chunk* → section_done | section_error

        After all sections complete: all_done

        On section failure, remaining sections continue processing.
        """
        queue: asyncio.Queue[dict | None] = asyncio.Queue()
        sections_remaining = len(self.SECTIONS)

        async def _run_section_task(section: str) -> None:
            """Run a single section and put events into the shared queue."""
            nonlocal sections_remaining
            try:
                await queue.put(_section_start_event(section))

                prompt = build_section_prompt(section, self.transcript)
                accumulated: list[str] = []

                try:
                    async with asyncio.timeout(STAKEHOLDER_STREAM_TIMEOUT_SECONDS):
                        async for chunk in self.adapter.stream(prompt):
                            accumulated.append(chunk)
                            await queue.put(_chunk_event(section, chunk))
                except asyncio.TimeoutError:
                    error_msg = (
                        f"Section '{section}' timed out after "
                        f"{STAKEHOLDER_STREAM_TIMEOUT_SECONDS}s."
                    )
                    logger.warning(error_msg)
                    await queue.put(_section_error_event(section, error_msg))
                    # Persist error state
                    self._persist_section_error(section, error_msg)
                    return

                # Section completed successfully
                result_text = "".join(accumulated)
                await queue.put(_section_done_event(section))
                self._persist_section_result(section, result_text)

            except Exception as exc:
                error_msg = f"Section '{section}' failed: {exc}"
                logger.exception(error_msg)
                await queue.put(_section_error_event(section, str(exc)))
                self._persist_section_error(section, str(exc))

            finally:
                sections_remaining -= 1
                if sections_remaining == 0:
                    await queue.put(None)  # Sentinel: all done

        # Launch all sections in parallel
        async with asyncio.TaskGroup() as tg:
            for section in self.SECTIONS:
                tg.create_task(_run_section_task(section))

            # Yield events from the queue while tasks are running
            while True:
                event = await queue.get()
                if event is None:
                    break
                yield event

        # All sections complete — update session status and emit all_done
        self._complete_session()
        yield _all_done_event()

    async def run_section(self, section: str) -> AsyncGenerator[dict, None]:
        """Run a single section and yield SSE events for it.

        Used for section regeneration.
        """
        if section not in self.SECTIONS:
            yield _section_error_event(section, f"Unknown section: {section}")
            return

        yield _section_start_event(section)

        prompt = build_section_prompt(section, self.transcript)
        accumulated: list[str] = []

        try:
            async with asyncio.timeout(STAKEHOLDER_STREAM_TIMEOUT_SECONDS):
                async for chunk in self.adapter.stream(prompt):
                    accumulated.append(chunk)
                    yield _chunk_event(section, chunk)
        except asyncio.TimeoutError:
            error_msg = (
                f"Section '{section}' timed out after "
                f"{STAKEHOLDER_STREAM_TIMEOUT_SECONDS}s."
            )
            logger.warning(error_msg)
            yield _section_error_event(section, error_msg)
            self._persist_section_error(section, error_msg)
            return
        except Exception as exc:
            error_msg = str(exc)
            logger.exception(
                "Section '%s' failed during regeneration: %s", section, error_msg
            )
            yield _section_error_event(section, error_msg)
            self._persist_section_error(section, error_msg)
            return

        result_text = "".join(accumulated)
        yield _section_done_event(section)
        self._persist_section_result(section, result_text)

    # ---------------------------------------------------------------------------
    # Persistence helpers (run in sync context since SQLAlchemy session is sync)
    # ---------------------------------------------------------------------------

    def _persist_section_result(self, section: str, result_text: str) -> None:
        """Persist a successful section result to the database."""
        from app.models import get_session_maker, AnalysisSectionResult
        from sqlalchemy import select

        SessionLocal = get_session_maker()
        with SessionLocal() as db:
            try:
                row = db.scalar(
                    select(AnalysisSectionResult).where(
                        AnalysisSectionResult.session_id == self.session_id,
                        AnalysisSectionResult.section_key == section,
                    )
                )
                if row:
                    row.status = "complete"
                    row.result_text = result_text
                    row.generated_at = datetime.now(timezone.utc)
                    row.model_name = getattr(self.adapter, "model", None)
                    db.commit()
                else:
                    logger.error(
                        "No section result row for session=%s section=%s",
                        self.session_id,
                        section,
                    )
            except Exception:
                logger.exception(
                    "Failed to persist result for session=%s section=%s",
                    self.session_id,
                    section,
                )
                db.rollback()

    def _persist_section_error(self, section: str, error_message: str) -> None:
        """Persist an error state for a section."""
        from app.models import get_session_maker, AnalysisSectionResult
        from sqlalchemy import select

        SessionLocal = get_session_maker()
        with SessionLocal() as db:
            try:
                row = db.scalar(
                    select(AnalysisSectionResult).where(
                        AnalysisSectionResult.session_id == self.session_id,
                        AnalysisSectionResult.section_key == section,
                    )
                )
                if row:
                    row.status = "error"
                    row.error_message = error_message
                    db.commit()
            except Exception:
                logger.exception(
                    "Failed to persist error for session=%s section=%s",
                    self.session_id,
                    section,
                )
                db.rollback()

    def _complete_session(self) -> None:
        """Update the session status to 'complete' and set completed_at."""
        from app.models import get_session_maker, AnalysisSession
        from sqlalchemy import select

        SessionLocal = get_session_maker()
        with SessionLocal() as db:
            try:
                session_row = db.scalar(
                    select(AnalysisSession).where(
                        AnalysisSession.id == self.session_id
                    )
                )
                if session_row:
                    session_row.status = "complete"
                    session_row.completed_at = datetime.now(timezone.utc)
                    db.commit()
            except Exception:
                logger.exception(
                    "Failed to complete session=%s", self.session_id
                )
                db.rollback()
