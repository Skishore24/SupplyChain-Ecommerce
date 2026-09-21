from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    PROCESSING = "PROCESSING"
    SHIPPED = "SHIPPED"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    RETURNED = "RETURNED"

class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    discount = Column(Numeric(10, 2), default=0.0, nullable=False)
    shipping = Column(Numeric(10, 2), default=0.0, nullable=False)
    tax = Column(Numeric(10, 2), default=0.0, nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    
    shipping_address_id = Column(Integer, ForeignKey("addresses.id", ondelete="SET NULL"), nullable=True)
    billing_address_id = Column(Integer, ForeignKey("addresses.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False, cascade="all, delete-orphan")
    shipment = relationship("Shipment", back_populates="order", uselist=False, cascade="all, delete-orphan")
    shipping_address = relationship("Address", foreign_keys=[shipping_address_id])
    billing_address = relationship("Address", foreign_keys=[billing_address_id])
    coupon_usages = relationship("CouponUsage", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    product_name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    payment_reference = Column(String(100), unique=True, nullable=False)
    payment_method = Column(String(50), default="Credit/Debit Card", nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    order = relationship("Order", back_populates="payment")

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    tracking_number = Column(String(100), nullable=True)
    carrier = Column(String(100), default="Standard Express", nullable=True)
    status = Column(String(50), default="Processing", nullable=False)
    shipped_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)

    order = relationship("Order", back_populates="shipment")
