from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User
from app.models.coupon import Coupon, DiscountType
from app.schemas.common import ApiResponse
from app.schemas.coupon import (
    CouponResponse,
    CouponCreate,
    CouponUpdate,
    CouponValidateRequest
)

router = APIRouter(prefix="/coupons", tags=["Coupons"])

@router.post("/validate", response_model=ApiResponse[dict])
def validate_coupon(req: CouponValidateRequest, db: Session = Depends(get_db)):
    coupon = db.query(Coupon).filter(
        Coupon.code == req.code.strip().upper(),
        Coupon.is_active == True
    ).first()

    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid coupon code")

    if coupon.used_count >= coupon.usage_limit:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coupon usage limit has been reached")

    if req.cart_total < coupon.minimum_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order of ₹{coupon.minimum_order} required for this coupon"
        )

    if coupon.discount_type == DiscountType.PERCENTAGE:
        discount = (req.cart_total * coupon.discount_value) / Decimal("100.00")
    else:
        discount = coupon.discount_value

    if coupon.maximum_discount and discount > coupon.maximum_discount:
        discount = coupon.maximum_discount

    if discount > req.cart_total:
        discount = req.cart_total

    return ApiResponse(
        success=True,
        message="Coupon applied successfully!",
        data={
            "code": coupon.code,
            "discount_type": coupon.discount_type,
            "discount_value": float(coupon.discount_value),
            "calculated_discount": float(discount.quantize(Decimal("0.01"))),
            "new_total": float(max(Decimal("0.00"), req.cart_total - discount).quantize(Decimal("0.01")))
        }
    )

@router.get("", response_model=ApiResponse[List[CouponResponse]])
def get_coupons(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    coupons = db.query(Coupon).order_by(Coupon.created_at.desc()).all()
    return ApiResponse(
        success=True,
        message="Coupons retrieved",
        data=[CouponResponse.model_validate(c) for c in coupons]
    )

@router.post("", response_model=ApiResponse[CouponResponse], status_code=status.HTTP_201_CREATED)
def create_coupon(
    coupon_in: CouponCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    code_upper = coupon_in.code.strip().upper()
    if db.query(Coupon).filter(Coupon.code == code_upper).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Coupon code '{code_upper}' already exists")

    coupon = Coupon(
        code=code_upper,
        discount_type=coupon_in.discount_type,
        discount_value=coupon_in.discount_value,
        minimum_order=coupon_in.minimum_order,
        maximum_discount=coupon_in.maximum_discount,
        start_date=coupon_in.start_date,
        end_date=coupon_in.end_date,
        usage_limit=coupon_in.usage_limit,
        is_active=coupon_in.is_active
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return ApiResponse(success=True, message="Coupon created successfully", data=CouponResponse.model_validate(coupon))

@router.put("/{coupon_id}", response_model=ApiResponse[CouponResponse])
def update_coupon(
    coupon_id: int,
    coupon_in: CouponUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")

    update_data = coupon_in.model_dump(exclude_unset=True)
    if "code" in update_data:
        code_upper = update_data["code"].strip().upper()
        if db.query(Coupon).filter(Coupon.code == code_upper, Coupon.id != coupon.id).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Coupon code '{code_upper}' already exists")
        update_data["code"] = code_upper

    for field, val in update_data.items():
        setattr(coupon, field, val)

    db.commit()
    db.refresh(coupon)
    return ApiResponse(success=True, message="Coupon updated successfully", data=CouponResponse.model_validate(coupon))

@router.delete("/{coupon_id}", response_model=ApiResponse[dict])
def delete_coupon(
    coupon_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    db.delete(coupon)
    db.commit()
    return ApiResponse(success=True, message="Coupon deleted successfully", data={"coupon_id": coupon_id})
