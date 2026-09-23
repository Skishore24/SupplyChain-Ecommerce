"""
Customer Intelligence — RFM Segmentation
==========================================
Segments customers based on RFM scores computed from real order data.
Segments: NEW, ACTIVE, REPEAT, HIGH_VALUE, INACTIVE, AT_RISK

RFM scoring (1-5 scale):
- Recency: 5 = purchased recently, 1 = purchased long ago
- Frequency: 5 = many orders, 1 = one order
- Monetary: 5 = high spend, 1 = low spend
"""
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User, UserRole
from app.models.ai_models import CustomerFeature, CustomerSegment, CustomerSegmentEnum

logger = logging.getLogger(__name__)


def score_rfm(value: float, breakpoints: List[float], reverse: bool = False) -> int:
    """
    Score a value 1-5 against breakpoints.
    reverse=True means lower value = higher score (used for Recency).
    """
    for i, bp in enumerate(breakpoints):
        if value <= bp:
            score = i + 1
            return (6 - score) if reverse else score
    return 5 if not reverse else 1


def compute_rfm_scores(
    recency: int,
    frequency: int,
    monetary: float,
    all_features: List[Dict],
) -> Tuple[int, int, int]:
    """
    Compute RFM scores relative to the customer population.
    Uses percentile breakpoints from all customer data.
    """
    if not all_features:
        return 3, 3, 3  # default middle score

    def percentiles(values: List[float], pcts: List[float]) -> List[float]:
        sorted_v = sorted(values)
        n = len(sorted_v)
        return [sorted_v[int(p * n / 100)] for p in pcts]

    pcts = [20, 40, 60, 80]
    all_r = [f.get("recency_days", 0) for f in all_features]
    all_f = [f.get("frequency", 0) for f in all_features]
    all_m = [f.get("monetary_value", 0) for f in all_features]

    r_breaks = percentiles(all_r, pcts)
    f_breaks = percentiles(all_f, pcts)
    m_breaks = percentiles(all_m, pcts)

    r_score = score_rfm(recency, r_breaks, reverse=True)   # lower recency = better
    f_score = score_rfm(frequency, f_breaks, reverse=False)
    m_score = score_rfm(monetary, m_breaks, reverse=False)

    return r_score, f_score, m_score


def assign_segment(
    r_score: int,
    f_score: int,
    m_score: int,
    recency_days: int,
    frequency: int,
) -> CustomerSegmentEnum:
    """
    Rule-based segment assignment from RFM scores.
    Rules are transparent and business-interpretable.
    """
    total = r_score + f_score + m_score

    if recency_days > 180:
        return CustomerSegmentEnum.INACTIVE
    if recency_days > 90 and frequency <= 2:
        return CustomerSegmentEnum.AT_RISK
    if frequency == 1 and recency_days <= 30:
        return CustomerSegmentEnum.NEW
    if m_score >= 4 and f_score >= 4:
        return CustomerSegmentEnum.HIGH_VALUE
    if f_score >= 3:
        return CustomerSegmentEnum.REPEAT
    if r_score >= 3:
        return CustomerSegmentEnum.ACTIVE
    return CustomerSegmentEnum.AT_RISK


def compute_all_segments(db: Session) -> int:
    """
    Compute RFM segments for all customers with features.
    Idempotent. Returns count of segmented customers.
    """
    features = db.query(CustomerFeature).all()
    if not features:
        return 0

    all_feature_dicts = [
        {
            "recency_days": f.recency_days or 999,
            "frequency": f.frequency or 0,
            "monetary_value": float(f.monetary_value or 0),
        }
        for f in features
    ]

    count = 0
    now = datetime.now(timezone.utc)

    for cf in features:
        try:
            r_score, f_score, m_score = compute_rfm_scores(
                cf.recency_days or 999,
                cf.frequency or 0,
                float(cf.monetary_value or 0),
                all_feature_dicts,
            )
            segment = assign_segment(r_score, f_score, m_score, cf.recency_days or 999, cf.frequency or 0)

            existing = db.query(CustomerSegment).filter(CustomerSegment.user_id == cf.user_id).first()
            if existing:
                existing.segment = segment
                existing.rfm_recency_score = r_score
                existing.rfm_frequency_score = f_score
                existing.rfm_monetary_score = m_score
                existing.rfm_total_score = r_score + f_score + m_score
                existing.computed_at = now
            else:
                cs = CustomerSegment(
                    user_id=cf.user_id,
                    segment=segment,
                    rfm_recency_score=r_score,
                    rfm_frequency_score=f_score,
                    rfm_monetary_score=m_score,
                    rfm_total_score=r_score + f_score + m_score,
                    segment_method="RFM_RULES",
                    computed_at=now,
                )
                db.add(cs)
            count += 1
        except Exception as e:
            logger.warning(f"[segmentation] Failed for user {cf.user_id}: {e}")

    db.commit()
    logger.info(f"[segmentation] Segmented {count} customers")
    return count


def get_segment_summary(db: Session) -> Dict[str, Any]:
    """Summary of customer segments for the dashboard."""
    rows = db.query(
        CustomerSegment.segment,
        func.count(CustomerSegment.id).label("count")
    ).group_by(CustomerSegment.segment).all()

    total = sum(r.count for r in rows)
    breakdown = {r.segment.value: r.count for r in rows}

    return {
        "total_segmented": total,
        "segments": breakdown,
        "high_value_count": breakdown.get("HIGH_VALUE", 0),
        "at_risk_count": breakdown.get("AT_RISK", 0),
        "inactive_count": breakdown.get("INACTIVE", 0),
    }
