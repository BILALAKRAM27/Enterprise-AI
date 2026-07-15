from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.document import DocumentStatus

class DocumentBase(BaseModel):
    filename: str
    file_type: str

class DocumentCreate(DocumentBase):
    user_id: int

class DocumentResponse(DocumentBase):
    id: int
    user_id: int
    status: DocumentStatus
    uploaded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
