from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.errors import register_error_handlers
from app.middleware.cors import add_cors


def create_app() -> FastAPI:
    app = FastAPI(title="AI eGate Kiosk API", version="0.1.0")
    add_cors(app)
    register_error_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
# Chạy:  uvicorn app.main:app --reload     Swagger:  http://localhost:8000/docs
