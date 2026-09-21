from datetime import datetime
from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.schemas.product import ProductResponse

class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemResponse(BaseModel):
    id: int
    cart_id: int
    product_id: int
    quantity: int
    price_at_time: Decimal
    product: ProductResponse
    subtotal: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CartResponse(BaseModel):
    id: int
    user_id: int
    items: List[CartItemResponse] = []
    item_count: int = 0
    subtotal: Decimal = Decimal("0.00")
    discount: Decimal = Decimal("0.00")
    shipping: Decimal = Decimal("0.00")
    tax: Decimal = Decimal("0.00")
    total: Decimal = Decimal("0.00")
    coupon_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

