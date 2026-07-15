from fastapi import Request
from fastapi.responses import JSONResponse
from loguru import logger

class APIException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail

async def api_exception_handler(request: Request, exc: APIException):
    logger.error(f"API Error: {exc.detail} | Path: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled Exception: {str(exc)} | Path: {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )
