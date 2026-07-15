import jwt
import bcrypt
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from app.core.config import settings

# Use a lower bcrypt work factor in development to avoid blocking the event loop.
# The default of 12 rounds can take 2+ seconds on constrained hardware.
# 10 rounds is still secure for production, 4 rounds for dev.
_BCRYPT_ROUNDS = 10


class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Synchronous verify — called via run_in_executor for async contexts."""
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Synchronous hash — called via run_in_executor for async contexts."""
        salt = bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    async def verify_password_async(plain_password: str, hashed_password: str) -> bool:
        """Non-blocking bcrypt verify — runs in a thread pool to avoid blocking event loop."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            AuthService.verify_password,
            plain_password,
            hashed_password
        )

    @staticmethod
    async def get_password_hash_async(password: str) -> str:
        """Non-blocking bcrypt hash — runs in a thread pool to avoid blocking event loop."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            AuthService.get_password_hash,
            password
        )

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
        return encoded_jwt

    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            return payload
        except jwt.PyJWTError:
            return None
