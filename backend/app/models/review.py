from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class ReviewStatus(str, enum.Enum):
    APPROVED = "APPROVED"
    PENDING = "PENDING"
    REJECTED = "REJECTED"

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    rating = Column(Float, nullable=False)
    comment = Column(Text, nullable=False)
    status = Column(Enum(ReviewStatus), default=ReviewStatus.APPROVED, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")
