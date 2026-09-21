from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.models.user import User, UserRole
from app.models.cart import Cart
from app.models.wishlist import Wishlist
from app.schemas.auth import RegisterRequest, LoginRequest

class AuthService:
    @staticmethod
    def register(db: Session, req: RegisterRequest) -> Tuple[User, str, str]:
        # Check if email exists
        existing = db.query(User).filter(User.email == req.email.lower()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists."
            )

        hashed_password = get_password_hash(req.password)
        new_user = User(
            first_name=req.first_name.strip(),
            last_name=req.last_name.strip(),
            email=req.email.lower().strip(),
            phone=req.phone.strip() if req.phone else None,
            password_hash=hashed_password,
            role=UserRole.CUSTOMER,
            is_active=True,
            is_verified=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Initialize empty cart and wishlist for customer
        cart = Cart(user_id=new_user.id)
        wishlist = Wishlist(user_id=new_user.id)
        db.add_all([cart, wishlist])
        db.commit()

        access_token = create_access_token(new_user.id)
        refresh_token = create_refresh_token(new_user.id)

        return new_user, access_token, refresh_token

    @staticmethod
    def login(db: Session, req: LoginRequest) -> Tuple[User, str, str]:
        user = db.query(User).filter(User.email == req.email.lower().strip()).first()
        if not user or not verify_password(req.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password."
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated. Please contact support."
            )

        # Extend duration if remember_me
        expires = timedelta(days=7) if req.remember_me else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(user.id, expires_delta=expires)
        refresh_token = create_refresh_token(user.id)

        return user, access_token, refresh_token

    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> Tuple[User, str]:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token."
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token credentials."
            )
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User no longer active."
            )
        access_token = create_access_token(user.id)
        return user, access_token

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> None:
        payload = decode_token(token)
        if not payload or payload.get("type") != "reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token."
            )
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
        user.password_hash = get_password_hash(new_password)
        db.commit()

auth_service = AuthService()
