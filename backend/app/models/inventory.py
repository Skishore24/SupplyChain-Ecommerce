"""
Inventory Tracking Models
=========================
Provides full inventory movement audit trail and daily snapshots.
Stock quantity on Product model remains the live/current value.
These models provide history and analytics capability.
"""
from datetime import datetime, timezone, date
import enum
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Boolean,
    DateTime, Date, ForeignKey, Enum, Float, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class InventoryTransactionType(str, enum.Enum):
    RECEIPT = "RECEIPT"           # Stock received from supplier
    SALE = "SALE"                 # Stock sold via order
    RETURN = "RETURN"             # Customer return added back
    ADJUSTMENT = "ADJUSTMENT"     # Manual admin adjustment
    DAMAGE = "DAMAGE"             # Stock written off as damaged
    TRANSFER = "TRANSFER"         # Between locations (future)
    INITIAL = "INITIAL"           # Opening stock entry


class InventoryTransaction(Base):
    """
    Full audit trail of every inventory movement.
    Positive quantity = stock added (RECEIPT, RETURN, ADJUSTMENT+)
    Negative quantity = stock removed (SALE, DAMAGE, ADJUSTMENT-)
    """
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    transaction_type = Column(
        Enum(InventoryTransactionType),
        nullable=False,
        index=True
    )
    quantity = Column(Integer, nullable=False)            # +/- units
    stock_before = Column(Integer, nullable=True)         # stock level before transaction
    stock_after = Column(Integer, nullable=True)          # stock level after transaction

    # Optional reference to source document
    reference_type = Column(String(50), nullable=True)   # "order", "purchase_order", "manual"
    reference_id = Column(Integer, nullable=True)         # ID in the reference table

    notes = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    product = relationship("Product")
    created_by = relationship("User", foreign_keys=[created_by_id])


class InventorySnapshot(Base):
    """
    Daily snapshot of inventory state per product.
    Used for trend analysis and forecasting features.
    Created by daily background job — idempotent.
    """
    __tablename__ = "inventory_snapshots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    snapshot_date = Column(Date, nullable=False, index=True)

    opening_stock = Column(Integer, nullable=False, default=0)
    closing_stock = Column(Integer, nullable=False, default=0)
    units_sold = Column(Integer, nullable=False, default=0)
    units_received = Column(Integer, nullable=False, default=0)
    units_returned = Column(Integer, nullable=False, default=0)
    units_damaged = Column(Integer, nullable=False, default=0)
    units_adjusted = Column(Integer, nullable=False, default=0)

    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    product = relationship("Product")

    __table_args__ = (
        UniqueConstraint("product_id", "snapshot_date", name="uq_inventory_snapshot_product_date"),
    )


class DailySalesAggregate(Base):
    """
    Pre-computed daily sales aggregates per product.
    Primary input for the ML demand forecasting pipeline.
    Created/refreshed by daily background job — idempotent.
    """
    __tablename__ = "daily_sales_aggregates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    sale_date = Column(Date, nullable=False, index=True)

    units_sold = Column(Integer, nullable=False, default=0)
    order_count = Column(Integer, nullable=False, default=0)
    revenue = Column(Numeric(12, 2), nullable=False, default=0.0)
    units_returned = Column(Integer, nullable=False, default=0)
    avg_selling_price = Column(Numeric(10, 2), nullable=True)
    stock_at_eod = Column(Integer, nullable=True)         # stock at end of day (from snapshot)

    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    product = relationship("Product")

    __table_args__ = (
        UniqueConstraint("product_id", "sale_date", name="uq_daily_sales_product_date"),
    )
