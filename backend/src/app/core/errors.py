from __future__ import annotations

import logging
from dataclasses import dataclass, field
from traceback import walk_tb
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.request_context import get_request_id

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class AppError(Exception):
    status_code: int
    code: str
    message: str
    details: dict[str, Any] = field(default_factory=dict)


async def app_error_handler(request: Request, exception: Exception) -> JSONResponse:
    del request
    if not isinstance(exception, AppError):
        raise exception

    payload: dict[str, Any] = {
        "error": {
            "code": exception.code,
            "message": exception.message,
        }
    }
    if exception.details:
        payload["error"]["details"] = exception.details
    return JSONResponse(status_code=exception.status_code, content=payload)


async def unhandled_error_handler(request: Request, exception: Exception) -> JSONResponse:
    """Log unexpected failures while returning a stable, non-sensitive response."""
    del request
    # Retain stack locations without exception values, source text, or local variables.
    stack = "\n".join(
        f'  File "{frame.f_code.co_filename}", line {line_number}, in {frame.f_code.co_name}'
        for frame, line_number in walk_tb(exception.__traceback__)
    )
    logger.error(
        "Unhandled request error type=%s request_id=%s\nTraceback (most recent call last):\n%s",
        type(exception).__name__,
        get_request_id(),
        stack,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_error",
                "message": "An unexpected error occurred.",
            }
        },
    )
