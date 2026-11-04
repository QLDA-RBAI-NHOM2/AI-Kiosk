"""Lỗi kỹ thuật + cách trả JSON thống nhất: {"error": {"code": ..., "message": ...}}."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.enums import ErrorCode


class AppError(Exception):
    """Ném lỗi này ở bất kỳ đâu trong service; handler bên dưới sẽ đổi thành JSON."""

    def __init__(self, code: ErrorCode, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _body(code: ErrorCode, message: str) -> dict:
    return {"error": {"code": code.value, "message": message}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content=_body(exc.code, exc.message))

    @app.exception_handler(RequestValidationError)
    async def handle_validation(_: Request, __: RequestValidationError):
        # Cố ý KHÔNG trả lại dữ liệu người dùng gửi lên (có thể chứa CCCD) -> tránh lộ PII.
        return JSONResponse(
            status_code=422,
            content=_body(ErrorCode.INVALID_REQUEST, "Dữ liệu gửi lên không hợp lệ"),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, __: Exception):
        return JSONResponse(
            status_code=500,
            content=_body(ErrorCode.INTERNAL_ERROR, "Lỗi hệ thống"),
        )
