from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional
from app.models.message import MessageRole

class CitationResponse(BaseModel):
    id: int
    document_id: int
    page_number: Optional[int]
    score: Optional[float]
    filename: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: int
    role: MessageRole
    created_at: datetime
    citations: List[CitationResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

class ChatBase(BaseModel):
    title: str

class ChatCreate(ChatBase):
    pass

class ChatResponse(ChatBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)
