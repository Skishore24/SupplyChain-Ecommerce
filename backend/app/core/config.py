from typing import List, Union, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json
import os


class Settings(BaseSettings):
    # ── Project Identity ──────────────────────────────────────────────────
    PROJECT_NAME: str = "SHOPERA"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"

    # ── Database ──────────────────────────────────────────────────────────
    # REQUIRED: Set DATABASE_URL in .env — never commit real credentials
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/ecommerce_db"

    # ── Security & JWT ────────────────────────────────────────────────────
    # REQUIRED: Set JWT_SECRET_KEY in .env — never use the default in production
    JWT_SECRET_KEY: str = "CHANGE_THIS_KEY_IN_PRODUCTION_ENV_FILE"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ──────────────────────────────────────────────────────────────
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        return v

    # ── AI / LLM Provider ────────────────────────────────────────────────
    # Optional — GenAI features degrade gracefully if not set
    LLM_PROVIDER: str = "none"              # "gemini", "openai", "none"
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    LLM_MODEL_NAME: str = "gemini-1.5-flash"

    # ── Embeddings ───────────────────────────────────────────────────────
    EMBEDDING_PROVIDER: str = "local"       # "local", "gemini", "openai"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # ── Vector Database ───────────────────────────────────────────────────
    VECTOR_DB_TYPE: str = "chroma"          # "chroma", "qdrant"
    VECTOR_DB_PATH: str = "./data/vector_db"
    VECTOR_DB_COLLECTION: str = "supply_chain_knowledge"

    # ── ML / Forecasting ─────────────────────────────────────────────────
    MIN_DAYS_FOR_ML: int = 30              # minimum days of data to train ML model
    MIN_DAYS_FOR_DL: int = 90             # minimum days of data to train deep learning model
    FORECAST_HORIZONS: List[int] = [7, 14, 30, 90]
    MODEL_STORAGE_PATH: str = "./ml/models"

    # ── File Storage ─────────────────────────────────────────────────────
    KNOWLEDGE_UPLOAD_PATH: str = "./data/knowledge"
    MAX_UPLOAD_SIZE_MB: int = 50

    # ── Background Jobs ───────────────────────────────────────────────────
    ENABLE_BACKGROUND_JOBS: bool = True
    JOB_AGGREGATION_HOUR: int = 1          # daily aggregation at 1am
    JOB_FORECAST_HOUR: int = 2            # daily forecast at 2am
    JOB_ANOMALY_HOUR: int = 3             # anomaly detection at 3am

    # ── Demo Mode ────────────────────────────────────────────────────────
    ENABLE_DEMO_MODE: bool = True          # allows demo seed data

    model_config = SettingsConfigDict(
        env_file=os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
