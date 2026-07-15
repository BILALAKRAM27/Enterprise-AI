from fastapi import APIRouter, Depends
from app.models.user import User
from app.schemas.user import UserResponse
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def read_user_me(current_user: User = Depends(get_current_user)):
    return current_user
