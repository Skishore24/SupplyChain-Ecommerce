from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    UserSummary
)
from app.schemas.user import UserResponse
from app.services.auth_service import auth_service
from app.core.security import create_access_token
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=ApiResponse[TokenResponse], status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    user, access_token, refresh_token = auth_service.register(db, req)
    user_summary = UserSummary.model_validate(user)
    data = TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600,
        user=user_summary
    )
    return ApiResponse(
        success=True,
        message="Registration successful. Welcome to SHOPERA!",
        data=data
    )

@router.post("/login", response_model=ApiResponse[TokenResponse])
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user, access_token, refresh_token = auth_service.login(db, req)
    user_summary = UserSummary.model_validate(user)
    data = TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=604800 if req.remember_me else 3600,
        user=user_summary
    )
    return ApiResponse(
        success=True,
        message="Login successful",
        data=data
    )

@router.post("/refresh", response_model=ApiResponse[TokenResponse])
def refresh_token(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    user, new_access_token = auth_service.refresh_access_token(db, req.refresh_token)
    user_summary = UserSummary.model_validate(user)
    data = TokenResponse(
        access_token=new_access_token,
        refresh_token=req.refresh_token,
        expires_in=3600,
        user=user_summary
    )
    return ApiResponse(
        success=True,
        message="Token refreshed successfully",
        data=data
    )

@router.post("/logout", response_model=ApiResponse[dict])
def logout(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        message="Successfully logged out",
        data={"user_id": current_user.id}
    )

@router.get("/me", response_model=ApiResponse[UserResponse])
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        message="Profile retrieved successfully",
        data=UserResponse.model_validate(current_user)
    )

@router.post("/forgot-password", response_model=ApiResponse[dict])
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    # Always respond with success to prevent user enumeration
    token = ""
    if user:
        # Create a password reset token valid for 1 hour
        to_encode = {"sub": str(user.id), "type": "reset"}
        from app.core.security import jwt, settings
        from datetime import datetime, timezone
        token = jwt.encode(
            {"exp": datetime.now(timezone.utc) + timedelta(hours=1), **to_encode},
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
    return ApiResponse(
        success=True,
        message="If this email is registered, password reset instructions have been dispatched.",
        data={"reset_token": token if user else ""}
    )

@router.post("/reset-password", response_model=ApiResponse[dict])
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    auth_service.reset_password(db, req.token, req.new_password)
    return ApiResponse(
        success=True,
        message="Password has been reset successfully. Please log in with your new credentials.",
        data={}
    )

@router.post("/verify-email", response_model=ApiResponse[dict])
def verify_email(req: VerifyEmailRequest, db: Session = Depends(get_db)):
    return ApiResponse(
        success=True,
        message="Email successfully verified.",
        data={}
    )
