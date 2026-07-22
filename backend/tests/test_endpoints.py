import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.chat import Chat
from app.models.message import Message
from app.models.citation import Citation
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.chat import ChatService
from app.services.document import DocumentService

@pytest.mark.asyncio
async def test_chat_deletion(db_session: AsyncSession):
    # Setup test chat, messages, citations
    chat = Chat(user_id=1, title="Test Deletion Chat")
    db_session.add(chat)
    await db_session.commit()
    await db_session.refresh(chat)

    message = Message(chat_id=chat.id, role="user", content="Hello test query")
    db_session.add(message)
    await db_session.commit()
    await db_session.refresh(message)

    # Verify they exist
    assert chat.id is not None
    assert message.id is not None

    # Call service deletion
    success = await ChatService.delete_chat(db_session, chat.id, 1)
    assert success is True

    # Verify they are deleted
    result = await db_session.execute(select(Chat).where(Chat.id == chat.id))
    assert result.scalar_one_or_none() is None

    result_msg = await db_session.execute(select(Message).where(Message.id == message.id))
    assert result_msg.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_user_isolation_retriever(monkeypatch):
    from app.rag.retriever import Retriever
    from app.vector_db.qdrant_client import qdrant_db

    called_filter = None

    async def mock_search(query_vector, user_id, limit=5):
        nonlocal called_filter
        called_filter = user_id
        return []

    monkeypatch.setattr(qdrant_db, "search", mock_search)
    
    # Test that user_id is passed down to qdrant search correctly
    await Retriever.get_relevant_chunks("test query", user_id=42)
    assert called_filter == 42

