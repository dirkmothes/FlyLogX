from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "FlyLogX API"
    api_prefix: str = "/api"
    database_url: str = "postgresql+psycopg://flylogx:flylogx@postgres:5432/flylogx"
    cors_origins: str = "http://localhost:3000"
    jwt_secret_key: str = "change-me-in-production"
    jwt_expires_minutes: int = 120

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
