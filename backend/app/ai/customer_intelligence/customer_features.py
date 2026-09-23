"""
Customer Intelligence — Feature Engineering
=============================================
Computes RFM (Recency, Frequency, Monetary) features and behavioral
metrics from real order data. No fake values.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.models.coupon import CouponUsage
from app.models.ai_models import CustomerFeature

logger = logging.getLogger(__name__)


def compute_customer_features(
    db: Session,
    user_id: int,
) -> Optional[Dict[str, Any]]:
    """
    Compute RFM + behavioral features for a single customer from their order history.
    Returns None if the customer has no orders.
    """
    now = datetime.now(timezone.utc)

    # Fetch all non-cancelled orders
    orders = (
        db.query(Order)
        .filter(
            Order.user_id == user_id,
            Order.status != OrderStatus.CANCELLED,
        )
        .order_by(Order.created_at.desc())
        .all()
    )

    if not orders:
        return None

    # Recency
    last_order_date = orders[0].created_at
    if last_order_date.tzinfo is None:
        last_order_date = last_order_date.replace(tzinfo=timezone.utc)
    recency_days = (now - last_order_date).days

    # Frequency
    frequency = len(orders)

    # Monetary
    total_spend = float(sum(o.total for o in orders))
    avg_order_value = total_spend / frequency if frequency > 0 else 0.0

    # Days between orders (if multiple orders)
    if frequency >= 2:
        sorted_dates = sorted(o.created_at for o in orders)
        gaps = [(sorted_dates[i+1] - sorted_dates[i]).days for i in range(len(sorted_dates)-1)]
        avg_days_between = sum(gaps) / len(gaps)
    else:
        avg_days_between = None

    # Return rate (orders with status RETURNED)
    returned = sum(1 for o in orders if o.status == OrderStatus.RETURNED)
    return_rate = returned / frequency if frequency > 0 else 0.0

    # Coupon/discount usage
    coupon_orders = db.query(func.count(CouponUsage.id)).filter(
        CouponUsage.user_id == user_id
    ).scalar() or 0
    discount_usage_rate = coupon_orders / frequency if frequency > 0 else 0.0

    return {
        "user_id": user_id,
        "recency_days": recency_days,
        "frequency": frequency,
        "monetary_value": round(total_spend, 2),
        "avg_order_value": round(avg_order_value, 2),
        "return_rate": round(return_rate, 4),
        "discount_usage_rate": round(discount_usage_rate, 4),
        "days_since_last_purchase": recency_days,
        "avg_days_between_orders": round(avg_days_between, 2) if avg_days_between is not None else None,
    }


def save_customer_features(db: Session, features: Dict[str, Any]) -> CustomerFeature:
    """Upsert CustomerFeature record."""
    existing = db.query(CustomerFeature).filter(CustomerFeature.user_id == features["user_id"]).first()
    now = datetime.now(timezone.utc)

    if existing:
        for key, val in features.items():
            if hasattr(existing, key):
                setattr(existing, key, val)
        existing.computed_at = now
        db.commit()
        db.refresh(existing)
        return existing
    else:
        cf = CustomerFeature(**features, computed_at=now)
        db.add(cf)
        db.commit()
        db.refresh(cf)
        return cf


def compute_all_customer_features(db: Session) -> int:
    """
    Batch compute features for all customers. Idempotent.
    Returns count of updated records.
    """
    customers = db.query(User).filter(User.role == UserRole.CUSTOMER, User.is_active == True).all()
    count = 0
    for customer in customers:
        try:
            features = compute_customer_features(db, customer.id)
            if features:
                save_customer_features(db, features)
                count += 1
        except Exception as e:
            logger.warning(f"[customer_features] Failed for user {customer.id}: {e}")
    logger.info(f"[customer_features] Computed features for {count} customers")
    return count
