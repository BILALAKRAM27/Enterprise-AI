from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.chat import Chat
from app.models.message import Message, MessageRole
from app.models.citation import Citation
from app.rag.generator import generator

class ChatService:
    @staticmethod
    async def create_chat(db: AsyncSession, user_id: int, title: str) -> Chat:
        db_chat = Chat(user_id=user_id, title=title)
        db.add(db_chat)
        await db.commit()
        await db.refresh(db_chat)
        return db_chat

    @staticmethod
    async def process_query(db: AsyncSession, chat_id: int, query: str) -> Message:
        # Save user message
        user_msg = Message(chat_id=chat_id, role=MessageRole.USER, content=query)
        db.add(user_msg)
        await db.commit()
        await db.refresh(user_msg)
        
        # Run RAG Pipeline
        rag_result = await generator.generate_answer(query)
        
        # Save AI message
        ai_msg = Message(chat_id=chat_id, role=MessageRole.AI, content=rag_result["answer"])
        db.add(ai_msg)
        await db.commit()
        await db.refresh(ai_msg)
        
        # Save Citations
        for chunk in rag_result["citations"]:
            if chunk.get("document_id"):
                citation = Citation(
                    message_id=ai_msg.id,
                    document_id=int(chunk["document_id"]),
                    page_number=chunk.get("page_number"),
                    score=chunk.get("score")
                )
                db.add(citation)
        
        await db.commit()
        # Refresh to load citations
        from sqlalchemy.orm import selectinload
        # Let's load citations manually or via query to be safe with async
        result = await db.execute(
            select(Message).where(Message.id == ai_msg.id).options(selectinload(Message.citations))
        )
        ai_msg = result.scalar_one()
        return ai_msg
