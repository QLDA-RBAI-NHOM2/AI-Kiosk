from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings


def add_cors(app: FastAPI) -> None:
    """Cho phép frontend (cổng khác) gọi API. Nếu thiếu, trình duyệt sẽ chặn request."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
