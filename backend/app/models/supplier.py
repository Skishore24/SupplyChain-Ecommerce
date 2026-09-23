"""
Supplier Management Models
==========================
Tracks suppliers, their product relationships, and purchase orders.
All scoring fields are calculated from real transaction data, never hardcoded.
"""
from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Boolean,
    DateTime, ForeignKey, Enum, Float, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class PurchaseOrderStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"


class SupplierAvailability(str, enum.Enum):
    IN_STOCK = "IN_STOCK"
    ON_REQUEST = "ON_REQUEST"
    DISCONTINUED = "DISCONTINUED"


class Supplier(Base):
    """
    Represents a product supplier / vendor.
    reliability_score and avg_lead_time are computed from
    PurchaseOrder history — never manually set.
    """
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True, default="India")
    website = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    # Payment & operational terms
    payment_terms = Column(String(100), nullable=True)  # e.g. "Net 30", "COD"
    min_order_value = Column(Numeric(10, 2), nullable=True)

    # Computed performance metrics (updated by background jobs from PO history)
    reliability_score = Column(Float, nullable=True)      # 0-100, from on-time delivery rate
    avg_lead_time_days = Column(Float, nullable=True)     # average actual lead time
    lead_time_variance = Column(Float, nullable=True)     # std dev of lead times
    on_time_delivery_rate = Column(Float, nullable=True)  # fraction of orders on time
    avg_delay_days = Column(Float, nullable=True)         # average days late when late
    total_orders = Column(Integer, default=0, nullable=False)
    total_received = Column(Integer, default=0, nullable=False)
    defect_rate = Column(Float, nullable=True)            # fraction of defective items received

    is_active = Column(Boolean, default=True, nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False)  # marks demo-seeded records
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    supplier_products = relationship("SupplierProduct", back_populates="supplier", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")


class SupplierProduct(Base):
    """
    Maps a supplier to a product with supplier-specific pricing and logistics.
    A product can have multiple suppliers (for comparison and redundancy).
    """
    __tablename__ = "supplier_products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)

    supplier_sku = Column(String(100), nullable=True)        # supplier's own SKU for this product
    supplier_price = Column(Numeric(10, 2), nullable=True)   # supplier's unit price
    moq = Column(Integer, default=1, nullable=False)         # minimum order quantity
    lead_time_days = Column(Integer, nullable=True)          # configured lead time (days)
    availability = Column(
        Enum(SupplierAvailability),
        default=SupplierAvailability.IN_STOCK,
        nullable=False
    )
    priority = Column(Integer, default=1, nullable=False)    # 1=primary, 2=secondary, etc.
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    supplier = relationship("Supplier", back_populates="supplier_products")
    product = relationship("Product")


class PurchaseOrder(Base):
    """
    A purchase order sent to a supplier.
    Financial/operational actions require explicit admin approval.
    status=DRAFT means not yet submitted.
    """
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    po_number = Column(String(50), unique=True, index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False, index=True)

    status = Column(
        Enum(PurchaseOrderStatus),
        default=PurchaseOrderStatus.DRAFT,
        nullable=False,
        index=True
    )

    subtotal = Column(Numeric(10, 2), default=0.0, nullable=False)
    shipping_cost = Column(Numeric(10, 2), default=0.0, nullable=False)
    total_amount = Column(Numeric(10, 2), default=0.0, nullable=False)

    notes = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)

    # Who created / approved this PO
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # If generated from an AIRecommendation
    ai_recommendation_id = Column(Integer, nullable=True)

    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    expected_delivery_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    received_at = Column(DateTime, nullable=True)

    # Relationships
    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])


class PurchaseOrderItem(Base):
    """Line items within a purchase order."""
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    purchase_order_id = Column(
        Integer,
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    product_name = Column(String(255), nullable=False)  # denormalized for history
    sku = Column(String(100), nullable=False)           # denormalized for history

    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0, nullable=False)
    unit_cost = Column(Numeric(10, 2), nullable=False)
    total_cost = Column(Numeric(10, 2), nullable=False)

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")
