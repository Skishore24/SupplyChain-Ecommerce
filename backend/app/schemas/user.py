from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import UserRole
from app.schemas.address import AddressResponse

class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    addresses: List[AddressResponse] = []

    model_config = ConfigDict(from_attributes=True)

class CustomerAdminView(UserBase):
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    orders_count: int = 0
    total_spent: float = 0.0

    model_config = ConfigDict(from_attributes=True)

