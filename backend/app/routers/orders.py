from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.models.user import User, UserRole
from app.models.order import OrderStatus
from app.schemas.common import ApiResponse, PaginatedApiResponse, PaginatedData
from app.schemas.order import (
    OrderResponse,
    OrderDetailResponse,
    OrderCreate,
    OrderStatusUpdate
)
from app.services.order_service import order_service

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("", response_model=ApiResponse[OrderDetailResponse], status_code=status.HTTP_201_CREATED)
def place_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = order_service.create_order(db, current_user.id, order_in)
    return ApiResponse(
        success=True,
        message="Order placed successfully! Thank you for your purchase.",
        data=OrderDetailResponse.model_validate(order)
    )

@router.get("", response_model=PaginatedApiResponse[OrderResponse])
def get_user_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items, total = order_service.get_customer_orders(db, current_user.id, page=page, page_size=page_size)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    data = PaginatedData(
        items=[OrderResponse.model_validate(o) for o in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
    return PaginatedApiResponse(
        success=True,
        message="Orders retrieved successfully",
        data=data
    )

@router.get("/{order_id}", response_model=ApiResponse[OrderDetailResponse])
def get_order_details(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # If customer, enforce user_id match. If admin, allow viewing any order.
    user_id_filter = current_user.id if current_user.role != UserRole.ADMIN else None
    order = order_service.get_order_by_id(db, order_id, user_id=user_id_filter)
    return ApiResponse(
        success=True,
        message="Order details retrieved",
        data=OrderDetailResponse.model_validate(order)
    )

@router.put("/{order_id}/cancel", response_model=ApiResponse[OrderDetailResponse])
def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = order_service.get_order_by_id(db, order_id, user_id=current_user.id)
    if order.status not in [OrderStatus.PENDING, OrderStatus.CONFIRMED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order in '{order.status}' status cannot be cancelled online. Please contact support."
        )

    updated_order = order_service.update_order_status(
        db, order_id, OrderStatusUpdate(status=OrderStatus.CANCELLED)
    )
    return ApiResponse(
        success=True,
        message="Order has been cancelled successfully",
        data=OrderDetailResponse.model_validate(updated_order)
    )

@router.put("/{order_id}/status", response_model=ApiResponse[OrderDetailResponse])
def update_order_status(
    order_id: int,
    status_in: OrderStatusUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    order = order_service.update_order_status(db, order_id, status_in)
    return ApiResponse(
        success=True,
        message="Order status updated successfully",
        data=OrderDetailResponse.model_validate(order)
    )
