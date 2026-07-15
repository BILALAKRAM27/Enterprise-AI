from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool = True
    is_superuser: bool = False

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
