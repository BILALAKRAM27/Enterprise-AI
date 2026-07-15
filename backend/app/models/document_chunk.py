from sqlalchemy import Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base_class import Base

class DocumentChunk(Base):
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("document.id"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)

    document: Mapped["Document"] = relationship("Document", back_populates="chunks")
