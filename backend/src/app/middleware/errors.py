from __future__ import annotations

from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.errors import unhandled_error_handler


class ErrorResponseMiddleware(BaseHTTPMiddleware):
    """Translate unexpected errors before outer CORS and request-ID middleware runs."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        try:
            return await call_next(request)
        except Exception as exception:
            return await unhandled_error_handler(request, exception)
