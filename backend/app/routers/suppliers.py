"""
Supplier & Procurement Management API Router
=============================================
Endpoints for managing suppliers, product sourcing relationships,
and the purchase order lifecycle with inventory sync upon receipt.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User
from app.models.product import Product
from app.models.supplier import (
    Supplier,
    SupplierProduct,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    SupplierAvailability,
)
from app.models.inventory import InventoryTransaction, InventoryTransactionType
from app.ai.procurement.supplier_ranking import (
    calculate_supplier_metrics,
    rank_suppliers_for_product,
)
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers & Procurement"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    company: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = "India"
    website: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = "Net 30"
    min_order_value: Optional[float] = None
    avg_lead_time_days: Optional[float] = 7.0


class SupplierProductCreate(BaseModel):
    product_id: int
    supplier_sku: Optional[str] = None
    supplier_price: float
    moq: int = 1
    lead_time_days: int = 7
    priority: int = 1
    availability: str = "IN_STOCK"


class PurchaseOrderItemSchema(BaseModel):
    product_id: int
    product_name: str
    sku: str
    quantity_ordered: int
    unit_cost: float


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    items: List[PurchaseOrderItemSchema]
    notes: Optional[str] = None
    expected_delivery_at: Optional[datetime] = None


class POStatusUpdate(BaseModel):
    status: PurchaseOrderStatus


# ── Supplier Endpoints ─────────────────────────────────────────────────────────

@router.get("")
def list_suppliers(
    is_active: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List all suppliers with their computed performance and reliability scores."""
    q = db.query(Supplier)
    if is_active is not None:
        q = q.filter(Supplier.is_active == is_active)
    total = q.count()
    suppliers = q.order_by(Supplier.name.asc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "suppliers": [
            {
                "id": s.id,
                "name": s.name,
                "company": s.company,
                "contact_person": s.contact_person,
                "email": s.email,
                "phone": s.phone,
                "city": s.city,
                "country": s.country,
                "payment_terms": s.payment_terms,
                "reliability_score": s.reliability_score,
                "avg_lead_time_days": s.avg_lead_time_days,
                "lead_time_variance": s.lead_time_variance,
                "on_time_delivery_rate": s.on_time_delivery_rate,
                "total_orders": s.total_orders,
                "is_active": s.is_active,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in suppliers
        ],
    }


@router.get("/{supplier_id}")
def get_supplier_detail(
    supplier_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get full supplier profile with supplied products and recent purchase orders."""
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")

    products = (
        db.query(SupplierProduct)
        .filter(SupplierProduct.supplier_id == supplier_id, SupplierProduct.is_active == True)
        .all()
    )

    recent_pos = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.supplier_id == supplier_id)
        .order_by(PurchaseOrder.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "id": s.id,
        "name": s.name,
        "company": s.company,
        "contact_person": s.contact_person,
        "email": s.email,
        "phone": s.phone,
        "address": s.address,
        "city": s.city,
        "country": s.country,
        "website": s.website,
        "notes": s.notes,
        "payment_terms": s.payment_terms,
        "min_order_value": float(s.min_order_value) if s.min_order_value else None,
        "reliability_score": s.reliability_score,
        "avg_lead_time_days": s.avg_lead_time_days,
        "lead_time_variance": s.lead_time_variance,
        "on_time_delivery_rate": s.on_time_delivery_rate,
        "avg_delay_days": s.avg_delay_days,
        "total_orders": s.total_orders,
        "is_active": s.is_active,
        "products": [
            {
                "id": sp.id,
                "product_id": sp.product_id,
                "product_name": sp.product.name if sp.product else "Unknown",
                "supplier_sku": sp.supplier_sku,
                "supplier_price": float(sp.supplier_price) if sp.supplier_price else 0.0,
                "moq": sp.moq,
                "lead_time_days": sp.lead_time_days,
                "priority": sp.priority,
                "availability": sp.availability.value if hasattr(sp.availability, "value") else str(sp.availability),
            }
            for sp in products
        ],
        "recent_purchase_orders": [
            {
                "id": po.id,
                "po_number": po.po_number,
                "status": po.status.value if hasattr(po.status, "value") else str(po.status),
                "total_amount": float(po.total_amount),
                "created_at": po.created_at.isoformat() if po.created_at else None,
                "received_at": po.received_at.isoformat() if po.received_at else None,
            }
            for po in recent_pos
        ],
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Create a new supplier vendor."""
    supplier = Supplier(
        name=payload.name,
        company=payload.company,
        contact_person=payload.contact_person,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        city=payload.city,
        country=payload.country,
        website=payload.website,
        notes=payload.notes,
        payment_terms=payload.payment_terms,
        min_order_value=payload.min_order_value,
        avg_lead_time_days=payload.avg_lead_time_days,
        reliability_score=75.0,  # default baseline
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return {"id": supplier.id, "message": f"Supplier '{supplier.name}' created successfully."}


@router.post("/{supplier_id}/recalculate-score")
def recalculate_score(
    supplier_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Recalculate performance metrics from real PO delivery history."""
    metrics = calculate_supplier_metrics(db, supplier_id)
    return metrics


@router.get("/products/{product_id}/rankings")
def get_product_supplier_rankings(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get multi-criteria ranked suppliers for a given product."""
    rankings = rank_suppliers_for_product(db, product_id)
    return {"product_id": product_id, "rankings": rankings}


@router.post("/{supplier_id}/products")
def link_product_to_supplier(
    supplier_id: int,
    payload: SupplierProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Link a product to a supplier with supplier-specific price, MOQ, and lead time."""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    avail = SupplierAvailability(payload.availability) if payload.availability in SupplierAvailability.__members__ else SupplierAvailability.IN_STOCK

    sp = SupplierProduct(
        supplier_id=supplier_id,
        product_id=payload.product_id,
        supplier_sku=payload.supplier_sku,
        supplier_price=payload.supplier_price,
        moq=payload.moq,
        lead_time_days=payload.lead_time_days,
        priority=payload.priority,
        availability=avail,
    )
    db.add(sp)
    db.commit()
    db.refresh(sp)
    return {"id": sp.id, "message": f"Product linked to supplier '{supplier.name}'."}


# ── Purchase Order Endpoints ──────────────────────────────────────────────────

@router.get("/purchase-orders/list")
def list_purchase_orders(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List purchase orders with optional status filter."""
    q = db.query(PurchaseOrder)
    if status_filter:
        q = q.filter(PurchaseOrder.status == status_filter)
    total = q.count()
    pos = q.order_by(PurchaseOrder.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "purchase_orders": [
            {
                "id": po.id,
                "po_number": po.po_number,
                "supplier_id": po.supplier_id,
                "supplier_name": po.supplier.name if po.supplier else "Unknown",
                "status": po.status.value if hasattr(po.status, "value") else str(po.status),
                "total_amount": float(po.total_amount),
                "items_count": len(po.items),
                "expected_delivery_at": po.expected_delivery_at.isoformat() if po.expected_delivery_at else None,
                "submitted_at": po.submitted_at.isoformat() if po.submitted_at else None,
                "received_at": po.received_at.isoformat() if po.received_at else None,
                "created_at": po.created_at.isoformat() if po.created_at else None,
            }
            for po in pos
        ],
    }


@router.post("/purchase-orders", status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Create a new DRAFT purchase order requiring explicit admin submission."""
    supplier = db.query(Supplier).filter(Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    total_amount = sum(item.quantity_ordered * item.unit_cost for item in payload.items)
    po_number = f"PO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    po = PurchaseOrder(
        po_number=po_number,
        supplier_id=payload.supplier_id,
        status=PurchaseOrderStatus.DRAFT,
        subtotal=total_amount,
        shipping_cost=0.0,
        total_amount=total_amount,
        notes=payload.notes,
        created_by_id=admin.id,
        expected_delivery_at=payload.expected_delivery_at,
    )
    db.add(po)
    db.flush()

    for it in payload.items:
        item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=it.product_id,
            product_name=it.product_name,
            sku=it.sku,
            quantity_ordered=it.quantity_ordered,
            quantity_received=0,
            unit_cost=it.unit_cost,
            total_cost=round(it.quantity_ordered * it.unit_cost, 2),
        )
        db.add(item)

    db.commit()
    db.refresh(po)
    return {"id": po.id, "po_number": po.po_number, "status": po.status.value, "total_amount": float(po.total_amount)}


@router.patch("/purchase-orders/{po_id}/status")
def update_po_status(
    po_id: int,
    payload: POStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Transitions purchase order status:
    DRAFT -> PENDING -> CONFIRMED -> RECEIVED -> CANCELLED
    When marked as RECEIVED:
    - Increments inventory stock_quantity
    - Records an InventoryTransaction of type 'PURCHASE'
    - Triggers supplier score recalculation
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    old_status = po.status
    new_status = payload.status
    now = datetime.now(timezone.utc)

    po.status = new_status

    if new_status == PurchaseOrderStatus.PENDING and not po.submitted_at:
        po.submitted_at = now
        po.approved_by_id = admin.id

    elif new_status == PurchaseOrderStatus.RECEIVED and not po.received_at:
        po.received_at = now

        # Update inventory for all received items
        for item in po.items:
            if item.product_id:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if product:
                    product.stock_quantity = (product.stock_quantity or 0) + item.quantity_ordered
                    item.quantity_received = item.quantity_ordered

                    # Record transaction
                    tx = InventoryTransaction(
                        product_id=product.id,
                        transaction_type=InventoryTransactionType.RECEIPT,
                        quantity=item.quantity_ordered,
                        reference_type="PURCHASE_ORDER",
                        reference_id=po.id,
                        notes=f"Received PO {po.po_number}",
                    )
                    db.add(tx)

        db.flush()
        # Recalculate supplier performance metrics
        calculate_supplier_metrics(db, po.supplier_id)

    db.commit()
    logger.info(f"PurchaseOrder {po.po_number} transitioned from {old_status} to {new_status}")
    return {"id": po.id, "po_number": po.po_number, "status": po.status.value, "updated_at": now.isoformat()}
