import re
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from app.models.user import UserRole

class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    confirm_password: str
    terms_accepted: bool = True

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[\W_]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("confirm_password")
    @classmethod
    def validate_passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserSummary"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[\W_]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("confirm_password")
    @classmethod
    def validate_passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v

class VerifyEmailRequest(BaseModel):
    token: str

class UserSummary(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    role: UserRole
    is_active: bool
    is_verified: bool

    model_config = ConfigDict(from_attributes=True)

TokenResponse.model_rebuild()

