from __future__ import annotations

from typing import TYPE_CHECKING, Optional
from sqlalchemy import Integer, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base

if TYPE_CHECKING:
    from app.models.message import Message
    from app.models.document import Document


class Citation(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("message.id"), nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), nullable=False)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    message: Mapped[Message] = relationship("Message", back_populates="citations")
    document: Mapped[Document] = relationship("Document")

    @property
    def filename(self) -> str:
        return self.document.filename if self.document else "Unknown Document"

