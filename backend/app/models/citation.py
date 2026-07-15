from sqlalchemy import Integer, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base

class Citation(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("message.id"), nullable=False)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=True)
    score: Mapped[float] = mapped_column(Float, nullable=True)

    message: Mapped["Message"] = relationship("Message", back_populates="citations")
    document: Mapped["Document"] = relationship("Document")
