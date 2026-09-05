from __future__ import annotations

import logging
from collections.abc import Callable

from app.core.request_context import get_request_id

RecordFactory = Callable[..., logging.LogRecord]
_BASE_RECORD_FACTORY: RecordFactory = logging.getLogRecordFactory()


def _record_factory(*args: object, **kwargs: object) -> logging.LogRecord:
    record = _BASE_RECORD_FACTORY(*args, **kwargs)
    record.request_id = get_request_id()
    return record


def configure_logging(level: str) -> None:
    logging.setLogRecordFactory(_record_factory)
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s request_id=%(request_id)s %(message)s",
        force=True,
    )
