from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import APIException, api_exception_handler, global_exception_handler
from loguru import logger
import os

# Create logs directory if it doesn't exist
os.makedirs("logs", exist_ok=True)
logger.add("logs/app.log", rotation="500 MB", level="INFO")

from app.database.session import engine
from app.database import base
from app.api.v1.api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.on_event("startup")
async def on_startup():
    logger.info("Initializing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(base.Base.metadata.create_all)
    logger.info("Database schema initialized.")

    # Initialize Qdrant collection
    try:
        from app.vector_db.qdrant_client import qdrant_db
        from app.services.document import DocumentService
        await qdrant_db.init_collection()
        logger.info("Qdrant collection ready.")
        import asyncio
        # asyncio.create_task(DocumentService.reindex_all_documents())
    except Exception as e:
        logger.warning(f"Qdrant init / reindex skipped: {e}")

app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Build CORS origins list from settings.
# "*" stays as a single wildcard; comma-separated URLs are split into a list.
_cors_origins: list = (
    ["*"]
    if settings.CORS_ORIGINS.strip() == "*"
    else [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(api_router, prefix=settings.API_V1_STR)
