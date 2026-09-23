"""
Supplier Performance & Ranking Engine
=====================================
Evaluates vendor reliability, lead time compliance, and price competitiveness
using real historical purchase order data and inventory metrics.
Never outputs arbitrary scores — always accompanied by calculation dicts and reason codes.
"""
from typing import Dict, Any, List, Optional
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.supplier import Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderStatus
import logging
logger = logging.getLogger(__name__)


def calculate_supplier_metrics(db: Session, supplier_id: int) -> Dict[str, Any]:
    """
    Computes performance metrics for a supplier based on completed purchase orders:
    - on_time_delivery_rate
    - avg_lead_time_days
    - lead_time_variance
    - reliability_score (0-100)
    """
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        return {"error": "Supplier not found"}

    # Get all received purchase orders
    received_pos = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.supplier_id == supplier_id,
            PurchaseOrder.status == PurchaseOrderStatus.RECEIVED,
            PurchaseOrder.submitted_at.isnot(None),
            PurchaseOrder.received_at.isnot(None),
        )
        .all()
    )

    total_orders = len(received_pos)
    if total_orders == 0:
        # Default baseline when no completed PO history exists
        return {
            "supplier_id": supplier_id,
            "supplier_name": supplier.name,
            "total_orders": 0,
            "on_time_delivery_rate": 1.0,
            "avg_lead_time_days": supplier.avg_lead_time_days or 7.0,
            "lead_time_variance": 0.0,
            "reliability_score": 75.0,  # neutral baseline for unrated suppliers
            "reason_codes": ["NO_PO_HISTORY_BASELINE_ASSIGNED"],
            "calculation": {
                "sample_size": 0,
                "confidence": "LOW",
            },
        }

    actual_lead_times = []
    on_time_count = 0
    delays = []

    for po in received_pos:
        actual_lead = (po.received_at - po.submitted_at).total_seconds() / 86400.0
        actual_lead_times.append(actual_lead)

        if po.expected_delivery_at:
            if po.received_at <= po.expected_delivery_at:
                on_time_count += 1
            else:
                delay = (po.received_at - po.expected_delivery_at).total_seconds() / 86400.0
                delays.append(delay)
        else:
            on_time_count += 1

    avg_lead_time = float(np.mean(actual_lead_times))
    lead_variance = float(np.std(actual_lead_times)) if len(actual_lead_times) > 1 else 0.0
    on_time_rate = float(on_time_count / total_orders)
    avg_delay = float(np.mean(delays)) if delays else 0.0

    # Reliability composite score:
    # 70% on-time delivery rate + 30% lead-time consistency (lower variance = higher score)
    variance_penalty = min(30.0, lead_variance * 5.0)
    reliability_score = max(0.0, min(100.0, (on_time_rate * 70.0) + (30.0 - variance_penalty)))

    reason_codes = []
    if on_time_rate >= 0.95:
        reason_codes.append("HIGH_ON_TIME_PERFORMANCE")
    elif on_time_rate < 0.75:
        reason_codes.append("CHRONIC_DELAYS_DETECTED")

    if lead_variance > 3.0:
        reason_codes.append("ERRATIC_LEAD_TIME")

    # Update supplier record in DB
    supplier.reliability_score = round(reliability_score, 1)
    supplier.avg_lead_time_days = round(avg_lead_time, 1)
    supplier.lead_time_variance = round(lead_variance, 2)
    supplier.on_time_delivery_rate = round(on_time_rate, 3)
    supplier.avg_delay_days = round(avg_delay, 1)
    supplier.total_orders = total_orders
    supplier.total_received = total_orders
    db.commit()

    return {
        "supplier_id": supplier_id,
        "supplier_name": supplier.name,
        "total_orders": total_orders,
        "on_time_delivery_rate": round(on_time_rate, 3),
        "avg_lead_time_days": round(avg_lead_time, 1),
        "lead_time_variance": round(lead_variance, 2),
        "reliability_score": round(reliability_score, 1),
        "avg_delay_days": round(avg_delay, 1),
        "reason_codes": reason_codes,
        "calculation": {
            "on_time_weight": 0.7,
            "variance_penalty": round(variance_penalty, 2),
            "sample_size": total_orders,
            "confidence": "HIGH" if total_orders >= 5 else "MEDIUM",
        },
    }


def rank_suppliers_for_product(db: Session, product_id: int) -> List[Dict[str, Any]]:
    """
    Ranks all available suppliers for a specific product using multi-criteria optimization:
    - Reliability score (40%)
    - Lead time speed (30%)
    - Unit price competitiveness (30%)
    """
    supplier_products = (
        db.query(SupplierProduct)
        .filter(
            SupplierProduct.product_id == product_id,
            SupplierProduct.is_active == True,
        )
        .all()
    )

    if not supplier_products:
        return []

    results = []
    prices = [float(sp.supplier_price) for sp in supplier_products if sp.supplier_price]
    min_price = min(prices) if prices else 1.0

    lead_times = [float(sp.lead_time_days or 7) for sp in supplier_products]
    min_lead_time = min(lead_times) if lead_times else 1.0

    for sp in supplier_products:
        supplier = sp.supplier
        if not supplier or not supplier.is_active:
            continue

        rel_score = supplier.reliability_score if supplier.reliability_score is not None else 75.0

        # Price score: 100 for lowest price, proportionally lower for higher prices
        price = float(sp.supplier_price or 1.0)
        price_score = min(100.0, (min_price / price) * 100.0) if price > 0 else 50.0

        # Lead time score: 100 for fastest lead time, scaled
        lt = float(sp.lead_time_days or 7.0)
        lead_time_score = min(100.0, (min_lead_time / lt) * 100.0) if lt > 0 else 50.0

        # Composite score
        composite_score = round(
            (rel_score * 0.40) + (lead_time_score * 0.30) + (price_score * 0.30),
            1,
        )

        results.append({
            "supplier_id": supplier.id,
            "supplier_name": supplier.name,
            "composite_score": composite_score,
            "reliability_score": rel_score,
            "price": price,
            "price_score": round(price_score, 1),
            "lead_time_days": int(lt),
            "lead_time_score": round(lead_time_score, 1),
            "moq": sp.moq,
            "priority": sp.priority,
            "availability": sp.availability.value if hasattr(sp.availability, "value") else str(sp.availability),
        })

    # Sort descending by composite score
    results.sort(key=lambda x: x["composite_score"], reverse=True)
    return results
