from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.models.coupon import DiscountType

class CouponBase(BaseModel):
    code: str
    discount_type: DiscountType
    discount_value: Decimal
    minimum_order: Decimal = Decimal("0.00")
    maximum_discount: Optional[Decimal] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    usage_limit: int = 100
    is_active: bool = True

class CouponCreate(CouponBase):
    pass

class CouponUpdate(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[Decimal] = None
    minimum_order: Optional[Decimal] = None
    maximum_discount: Optional[Decimal] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    usage_limit: Optional[int] = None
    is_active: Optional[bool] = None

class CouponValidateRequest(BaseModel):
    code: str
    cart_total: Decimal

class CouponResponse(CouponBase):
    id: int
    used_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

