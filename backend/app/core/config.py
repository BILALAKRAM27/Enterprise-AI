from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, ValidationInfo
from typing import Optional, Any

class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise Knowledge AI Assistant"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "supersecretkey"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Postgres
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "enterprise_ai"
    SQLALCHEMY_DATABASE_URI: Optional[str] = None
    
    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info: ValidationInfo) -> Any:
        if isinstance(v, str):
            return v
        return (
            f"postgresql+asyncpg://{info.data.get('POSTGRES_USER')}:"
            f"{info.data.get('POSTGRES_PASSWORD')}@{info.data.get('POSTGRES_SERVER')}/"
            f"{info.data.get('POSTGRES_DB')}"
        )
        
    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_API_KEY: Optional[str] = None
    
    # LLM — OpenRouter is the primary provider for both chat and embeddings.
    # Get your key at https://openrouter.ai/keys
    OPENROUTER_API_KEY: str = ""
    
    # OpenRouter base URL (do not change)
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
