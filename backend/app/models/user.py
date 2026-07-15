from sqlalchemy import String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base
import datetime
from typing import List

class User(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    documents: Mapped[List["Document"]] = relationship("Document", back_populates="owner")
    chats: Mapped[List["Chat"]] = relationship("Chat", back_populates="owner")
