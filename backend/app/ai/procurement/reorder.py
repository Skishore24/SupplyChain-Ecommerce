"""
Automated Reorder & Procurement Recommendation Engine
======================================================
Identifies items approaching stockout thresholds, chooses the optimal supplier
via multi-criteria ranking, and drafts an AI recommendation requiring explicit
admin approval before creating purchase orders.
"""
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.ai_models import (
    AIRecommendation,
    RecommendationStatusEnum,
    SupplyChainAlert,
    AlertTypeEnum,
    AlertStatusEnum,
    RiskLevelEnum,
)
from app.models.supplier import SupplierProduct, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus
from app.services.inventory_service import inventory_intelligence_service
from app.ai.procurement.supplier_ranking import rank_suppliers_for_product
import logging
logger = logging.getLogger(__name__)


def generate_reorder_recommendations(db: Session) -> List[Dict[str, Any]]:
    """
    Evaluates all active products, checks if current stock is below reorder point,
    ranks suppliers, and records PENDING AI recommendations.
    """
    products = db.query(Product).filter(Product.is_active == True).all()
    recommendations_created = []

    for product in products:
        intel = inventory_intelligence_service.get_product_inventory_intelligence(db, product)
        if not intel.get("needs_reorder"):
            continue

        # Check if an open/pending recommendation already exists for this product
        existing = (
            db.query(AIRecommendation)
            .filter(
                AIRecommendation.rec_type == "reorder",
                AIRecommendation.entity_type == "product",
                AIRecommendation.entity_id == product.id,
                AIRecommendation.status == RecommendationStatusEnum.PENDING,
            )
            .first()
        )
        if existing:
            continue

        # Rank candidate suppliers for this product
        ranked_suppliers = rank_suppliers_for_product(db, product.id)
        best_supplier = ranked_suppliers[0] if ranked_suppliers else None

        base_qty = intel.get("recommended_order_quantity") or 20
        moq = best_supplier["moq"] if best_supplier else 1
        order_qty = max(base_qty, moq)

        unit_price = best_supplier["price"] if best_supplier else float(product.price or 10.0) * 0.6
        estimated_cost = round(order_qty * unit_price, 2)

        risk_score = intel.get("stockout_risk_score", 0)
        priority = "CRITICAL" if risk_score >= 80 else "HIGH" if risk_score >= 60 else "MEDIUM"

        supplier_name = best_supplier["supplier_name"] if best_supplier else "Primary Default Supplier"
        supplier_id = best_supplier["supplier_id"] if best_supplier else None

        title = f"Procurement Reorder: {order_qty} units of '{product.name}'"
        description = (
            f"Current stock ({intel.get('current_stock')}) has fallen below reorder point ({intel.get('reorder_point')}). "
            f"Estimated stockout in {round(intel.get('days_of_supply') or 0)} days based on daily velocity of "
            f"{intel.get('daily_sales_velocity', 0):.1f} units/day. "
            f"Recommended vendor: {supplier_name} (Composite score: {best_supplier['composite_score'] if best_supplier else 'N/A'})."
        )

        rec = AIRecommendation(
            rec_type="reorder",
            entity_type="product",
            entity_id=product.id,
            entity_name=product.name,
            title=title,
            reason=description,
            evidence={
                "order_quantity": order_qty,
                "estimated_cost": estimated_cost,
                "supplier_id": supplier_id,
                "supplier_name": supplier_name,
                "stockout_risk_reduction": risk_score,
                "days_of_supply_after_reorder": round((intel.get("current_stock", 0) + order_qty) / max(0.1, intel.get("daily_sales_velocity", 1))),
            },
            calculations=intel.get("calculation_dict", {}),
            recommended_action=f"Create purchase order for {order_qty} units with supplier {supplier_name} (est. ${estimated_cost})",
            confidence=0.92,
            urgency=RiskLevelEnum.CRITICAL if risk_score >= 80 else RiskLevelEnum.HIGH if risk_score >= 60 else RiskLevelEnum.MEDIUM,
            status=RecommendationStatusEnum.PENDING,
        )
        db.add(rec)
        db.flush()

        # If risk is critical, also ensure a SupplyChainAlert exists
        if risk_score >= 75:
            alert = SupplyChainAlert(
                alert_type=AlertTypeEnum.STOCKOUT_RISK,
                severity=RiskLevelEnum.CRITICAL if risk_score >= 85 else RiskLevelEnum.HIGH,
                title=f"Critical Stockout Warning: {product.name}",
                description=f"Stock for '{product.name}' is critically low ({intel.get('current_stock')} units remaining). Reorder recommendation drafted.",
                entity_type="product",
                entity_id=product.id,
                entity_name=product.name,
                status=AlertStatusEnum.OPEN,
                evidence={
                    "current_stock": intel.get("current_stock"),
                    "reorder_point": intel.get("reorder_point"),
                    "days_remaining": intel.get("days_of_supply"),
                    "recommendation_id": rec.id,
                },
            )
            db.add(alert)

        recommendations_created.append({
            "recommendation_id": rec.id,
            "product_id": product.id,
            "product_name": product.name,
            "order_quantity": order_qty,
            "supplier_id": supplier_id,
            "estimated_cost": estimated_cost,
        })

    db.commit()
    logger.info(f"Generated {len(recommendations_created)} procurement reorder recommendations.")
    return recommendations_created


def execute_approved_reorder(db: Session, recommendation: AIRecommendation, admin_user_id: int) -> PurchaseOrder:
    """
    Called when an admin approves a REORDER recommendation.
    Automatically creates a formal DRAFT PurchaseOrder for the vendor.
    """
    ev = recommendation.evidence or {}
    supplier_id = ev.get("supplier_id")
    quantity = ev.get("order_quantity", 20)
    total_cost = float(ev.get("estimated_cost", 0.0))
    unit_cost = round(total_cost / max(1, quantity), 2) if total_cost > 0 else 10.0

    po_number = f"PO-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{recommendation.id}"
    expected_delivery = datetime.now(timezone.utc) + timedelta(days=7)

    po = PurchaseOrder(
        po_number=po_number,
        supplier_id=supplier_id,
        status=PurchaseOrderStatus.DRAFT,
        subtotal=total_cost,
        shipping_cost=0.0,
        total_amount=total_cost,
        notes=f"Auto-generated from AI Recommendation #{recommendation.id}",
        created_by_id=admin_user_id,
        approved_by_id=admin_user_id,
        ai_recommendation_id=recommendation.id,
        expected_delivery_at=expected_delivery,
    )
    db.add(po)
    db.flush()

    item = PurchaseOrderItem(
        purchase_order_id=po.id,
        product_id=recommendation.entity_id,
        product_name=recommendation.entity_name or "Product",
        sku=f"SKU-{recommendation.entity_id}",
        quantity_ordered=quantity,
        quantity_received=0,
        unit_cost=unit_cost,
        total_cost=total_cost,
    )
    db.add(item)

    recommendation.status = RecommendationStatusEnum.APPROVED
    db.commit()
    logger.info(f"Created PurchaseOrder {po_number} from approved AI recommendation #{recommendation.id}")
    return po
