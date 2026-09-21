from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.cart import CartResponse, CartItemCreate, CartItemUpdate
from app.services.cart_service import cart_service

router = APIRouter(prefix="/cart", tags=["Shopping Cart"])

@router.get("", response_model=ApiResponse[CartResponse])
def get_cart(
    coupon_code: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_data = cart_service.calculate_cart_totals(db, current_user.id, coupon_code=coupon_code)
    return ApiResponse(
        success=True,
        message="Cart retrieved successfully",
        data=cart_data
    )

@router.post("/items", response_model=ApiResponse[CartResponse])
def add_item_to_cart(
    item_in: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_service.add_to_cart(db, current_user.id, item_in.product_id, item_in.quantity)
    cart_data = cart_service.calculate_cart_totals(db, current_user.id)
    return ApiResponse(
        success=True,
        message="Item added to cart",
        data=cart_data
    )

@router.put("/items/{item_id}", response_model=ApiResponse[CartResponse])
def update_cart_item_quantity(
    item_id: int,
    item_in: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_service.update_cart_item(db, current_user.id, item_id, item_in.quantity)
    cart_data = cart_service.calculate_cart_totals(db, current_user.id)
    return ApiResponse(
        success=True,
        message="Cart updated",
        data=cart_data
    )

@router.delete("/items/{item_id}", response_model=ApiResponse[CartResponse])
def remove_item_from_cart(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_service.remove_cart_item(db, current_user.id, item_id)
    cart_data = cart_service.calculate_cart_totals(db, current_user.id)
    return ApiResponse(
        success=True,
        message="Item removed from cart",
        data=cart_data
    )

@router.delete("", response_model=ApiResponse[dict])
def clear_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_service.clear_cart(db, current_user.id)
    return ApiResponse(
        success=True,
        message="Cart cleared",
        data={}
    )
