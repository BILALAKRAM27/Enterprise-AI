from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database.session import get_db
from app.schemas.chat import ChatCreate, ChatResponse, MessageCreate, MessageResponse
from app.services.chat import ChatService
from app.models.chat import Chat
from app.models.message import Message
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=ChatResponse)
async def create_chat(
    chat_in: ChatCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await ChatService.create_chat(db, current_user.id, chat_in.title)

@router.get("/history", response_model=List[ChatResponse])
async def list_chats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Chat).where(Chat.user_id == current_user.id).order_by(Chat.created_at.desc()))
    return result.scalars().all()

@router.post("/{chat_id}/completions", response_model=MessageResponse)
async def chat_completion(
    chat_id: int,
    msg_in: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = await db.get(Chat, chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    ai_msg = await ChatService.process_query(db, chat_id, msg_in.content)
    return ai_msg

@router.get("/{chat_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    chat_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = await db.get(Chat, chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    from app.models.citation import Citation
    result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .options(selectinload(Message.citations).selectinload(Citation.document))
        .order_by(Message.created_at.asc())
    )
    return result.scalars().all()

@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = await ChatService.delete_chat(db, chat_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"status": "success"}
