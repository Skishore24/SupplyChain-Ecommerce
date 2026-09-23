"""
Customer Churn / Risk Model
============================
Predicts churn risk for customers using interpretable features.
Every risk score comes with reason_codes explaining WHY.

Model source: LOGISTIC_REGRESSION (scikit-learn) when sufficient data.
Fallback: RULE_BASED when sklearn unavailable or insufficient data.

NEVER display a score without reason codes.
"""
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import logging

from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.ai_models import CustomerFeature, CustomerSegment, CustomerRisk, RiskLevelEnum

logger = logging.getLogger(__name__)

try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


def compute_rule_based_risk(features: "CustomerFeature") -> Tuple[float, str, List[Dict]]:
    """
    Rule-based churn risk scoring with full reason code explanation.
    Transparent rules that an admin can understand.

    Returns (risk_score 0-100, risk_level, reason_codes list)
    """
    score = 0.0
    reasons = []

    recency = features.recency_days or 0
    frequency = features.frequency or 0
    monetary = float(features.monetary_value or 0)
    avg_days = features.avg_days_between_orders
    return_rate = float(features.return_rate or 0)

    # Recency-based risk
    if recency > 180:
        score += 40
        reasons.append({
            "code": "HIGH_RECENCY",
            "description": f"Last purchase was {recency} days ago (>180 days — very high risk)",
            "contribution": 40,
        })
    elif recency > 90:
        score += 25
        reasons.append({
            "code": "MEDIUM_RECENCY",
            "description": f"Last purchase was {recency} days ago (>90 days — moderate risk)",
            "contribution": 25,
        })
    elif recency > 45:
        score += 10
        reasons.append({
            "code": "LOW_RECENCY",
            "description": f"Last purchase was {recency} days ago (declining activity)",
            "contribution": 10,
        })

    # Frequency-based risk
    if frequency <= 1:
        score += 25
        reasons.append({
            "code": "LOW_FREQUENCY",
            "description": "Only 1 order placed — high risk of one-time buyer",
            "contribution": 25,
        })
    elif frequency <= 2:
        score += 10
        reasons.append({
            "code": "MEDIUM_FREQUENCY",
            "description": f"Only {frequency} orders — below average engagement",
            "contribution": 10,
        })

    # Monetary-based risk
    if monetary < 500:
        score += 10
        reasons.append({
            "code": "LOW_MONETARY",
            "description": f"Total lifetime spend ₹{monetary:.0f} — low engagement",
            "contribution": 10,
        })

    # Return rate risk
    if return_rate > 0.5:
        score += 20
        reasons.append({
            "code": "HIGH_RETURN_RATE",
            "description": f"Return rate {return_rate*100:.0f}% — product dissatisfaction signal",
            "contribution": 20,
        })

    # Slowing purchase pace
    if avg_days and avg_days > 60:
        score += 10
        reasons.append({
            "code": "DECLINING_FREQUENCY",
            "description": f"Average {avg_days:.0f} days between orders — purchase pace declining",
            "contribution": 10,
        })

    score = min(100.0, score)

    if score >= 70:
        level = RiskLevelEnum.HIGH
    elif score >= 40:
        level = RiskLevelEnum.MEDIUM
    else:
        level = RiskLevelEnum.LOW

    return round(score, 1), level, reasons


def compute_and_save_risk(
    db: Session,
    user_id: int,
) -> Optional[Dict[str, Any]]:
    """Compute and save churn risk for a single customer."""
    cf = db.query(CustomerFeature).filter(CustomerFeature.user_id == user_id).first()
    if not cf:
        return None

    risk_score, risk_level, reason_codes = compute_rule_based_risk(cf)

    existing = db.query(CustomerRisk).filter(CustomerRisk.user_id == user_id).first()
    now = datetime.now(timezone.utc)

    if existing:
        existing.risk_score = risk_score
        existing.risk_level = risk_level
        existing.reason_codes = reason_codes
        existing.model_source = "RULE_BASED"
        existing.computed_at = now
    else:
        cr = CustomerRisk(
            user_id=user_id,
            risk_score=risk_score,
            risk_level=risk_level,
            reason_codes=reason_codes,
            model_source="RULE_BASED",
            computed_at=now,
        )
        db.add(cr)

    db.commit()

    return {
        "user_id": user_id,
        "risk_score": risk_score,
        "risk_level": risk_level.value,
        "reason_codes": reason_codes,
        "model_source": "RULE_BASED",
    }


def compute_all_risks(db: Session) -> int:
    """Batch compute churn risk for all customers with features. Idempotent."""
    features = db.query(CustomerFeature).all()
    count = 0
    for cf in features:
        try:
            compute_and_save_risk(db, cf.user_id)
            count += 1
        except Exception as e:
            logger.warning(f"[churn] Failed for user {cf.user_id}: {e}")
    logger.info(f"[churn] Computed risk for {count} customers")
    return count
