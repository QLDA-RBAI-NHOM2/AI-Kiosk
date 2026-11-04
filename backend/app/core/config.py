"""Cấu hình đọc từ biến môi trường / file .env (không hard-code bí mật vào code)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "dev"
    database_url: str = "postgresql+psycopg://kiosk:kiosk@localhost:5432/kiosk"
    hmac_pepper: str = "dev-only-change-me"   # dùng để hash CCCD (ADR 0002)
    admin_token: str = "dev-admin-token"      # tạm; sẽ làm xác thực admin sau
    session_ttl_seconds: int = 120            # phiên hết hạn sau 2 phút
    cors_origins: list[str] = ["http://localhost:5173"]  # địa chỉ frontend (Vite)

@lru_cache
def get_settings() -> Settings:
    return Settings()
