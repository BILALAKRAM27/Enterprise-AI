from sqlalchemy import DateTime, ForeignKey, Text, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
import datetime
import enum
from typing import List

class MessageRole(str, enum.Enum):
    USER = "user"
    AI = "ai"

class Message(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chat.id"), nullable=False)
    role: Mapped[MessageRole] = mapped_column(Enum(MessageRole), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chat: Mapped["Chat"] = relationship("Chat", back_populates="messages")
    citations: Mapped[List["Citation"]] = relationship("Citation", back_populates="message", cascade="all, delete-orphan")
