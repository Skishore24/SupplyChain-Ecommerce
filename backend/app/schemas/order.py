from datetime import datetime
from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from app.models.order import OrderStatus, PaymentStatus
from app.schemas.address import AddressResponse

class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    product_id: Optional[int] = None
    product_name: str
    sku: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal

    model_config = ConfigDict(from_attributes=True)

class PaymentResponse(BaseModel):
    id: int
    order_id: int
    payment_reference: str
    payment_method: str
    amount: Decimal
    status: PaymentStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ShipmentResponse(BaseModel):
    id: int
    order_id: int
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    status: str
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class OrderCreate(BaseModel):
    shipping_address_id: int
    billing_address_id: Optional[int] = None
    payment_method: str = "Credit/Debit Card"
    coupon_code: Optional[str] = None
    notes: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None

class OrderResponse(BaseModel):
    id: int
    user_id: int
    order_number: str
    subtotal: Decimal
    discount: Decimal
    shipping: Decimal
    tax: Decimal
    total: Decimal
    status: OrderStatus
    payment_status: PaymentStatus
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []
    payment: Optional[PaymentResponse] = None
    shipment: Optional[ShipmentResponse] = None

    model_config = ConfigDict(from_attributes=True)

class OrderDetailResponse(OrderResponse):
    shipping_address: Optional[AddressResponse] = None
    billing_address: Optional[AddressResponse] = None
    notes: Optional[str] = None

