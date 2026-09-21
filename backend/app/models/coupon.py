from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class DiscountType(str, enum.Enum):
    PERCENTAGE = "PERCENTAGE"
    FIXED = "FIXED"

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    discount_type = Column(Enum(DiscountType), default=DiscountType.PERCENTAGE, nullable=False)
    discount_value = Column(Numeric(10, 2), nullable=False)
    minimum_order = Column(Numeric(10, 2), default=0.0, nullable=False)
    maximum_discount = Column(Numeric(10, 2), nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    usage_limit = Column(Integer, default=100, nullable=False)
    used_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    usages = relationship("CouponUsage", back_populates="coupon", cascade="all, delete-orphan")

class CouponUsage(Base):
    __tablename__ = "coupon_usages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    coupon = relationship("Coupon", back_populates="usages")
    user = relationship("User", back_populates="coupon_usages")
    order = relationship("Order", back_populates="coupon_usages")
