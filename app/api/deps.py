from typing import Iterator

from sqlalchemy.orm import Session

from app.models import get_session_maker

_SessionLocal = get_session_maker()


def get_session() -> Iterator[Session]:
    session = _SessionLocal()
    try:
        yield session
    finally:
        session.close()