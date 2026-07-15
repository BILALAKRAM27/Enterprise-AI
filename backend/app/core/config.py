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
    
    GEMINI_API_KEY: Optional[str] = None  # Set in .env — must be a Gemini API key from https://aistudio.google.com/apikey

    @field_validator("GEMINI_API_KEY", mode="before")
    @classmethod
    def validate_gemini_key(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip()  # strip any accidental leading/trailing whitespace from .env
        if v and not v.startswith("AIza"):
            import warnings
            warnings.warn(
                f"GEMINI_API_KEY does not look like a valid Google API key "
                f"(expected 'AIza...' prefix, got '{v[:6]}...'). "
                "Get a valid key at https://aistudio.google.com/apikey",
                stacklevel=2,
            )
        return v if v else None

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()
