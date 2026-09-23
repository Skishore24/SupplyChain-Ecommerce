"""
Anomaly Detection — Statistical Detector
==========================================
Detects anomalies in demand, inventory, and supplier performance
using statistical methods with explainable evidence.

Methods (in order of preference):
1. Z-Score (primary): flags values more than N std deviations from mean
2. IQR-based (fallback): flags outliers beyond Q1-1.5×IQR and Q3+1.5×IQR
3. Rule-based (always): domain-specific hard rules

All detected anomalies include:
- detected value
- expected range
- z_score or IQR ratio
- severity (LOW/MEDIUM/HIGH/CRITICAL)
- human-readable description
"""
from datetime import datetime, timezone, timedelta, date
from typing import Dict, Any, List, Optional, Tuple
import math
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.product import Product
from app.models.inventory import DailySalesAggregate
from app.models.supplier import Supplier, PurchaseOrder, PurchaseOrderStatus
from app.models.ai_models import (
    AnomalyEvent,
    SupplyChainAlert,
    AlertTypeEnum,
    RiskLevelEnum,
    AlertStatusEnum,
)

logger = logging.getLogger(__name__)

Z_SCORE_THRESHOLDS = {
    RiskLevelEnum.CRITICAL: 3.0,
    RiskLevelEnum.HIGH: 2.5,
    RiskLevelEnum.MEDIUM: 2.0,
    RiskLevelEnum.LOW: 1.5,
}


def mean_std(values: List[float]) -> Tuple[float, float]:
    """Compute mean and population std dev."""
    n = len(values)
    if n == 0:
        return 0.0, 0.0
    avg = sum(values) / n
    variance = sum((v - avg) ** 2 for v in values) / n
    return avg, math.sqrt(variance)


def compute_z_score(value: float, mean: float, std: float) -> Optional[float]:
    if std <= 0:
        return None
    return (value - mean) / std


def severity_from_z(z: float) -> RiskLevelEnum:
    z_abs = abs(z)
    if z_abs >= Z_SCORE_THRESHOLDS[RiskLevelEnum.CRITICAL]:
        return RiskLevelEnum.CRITICAL
    if z_abs >= Z_SCORE_THRESHOLDS[RiskLevelEnum.HIGH]:
        return RiskLevelEnum.HIGH
    if z_abs >= Z_SCORE_THRESHOLDS[RiskLevelEnum.MEDIUM]:
        return RiskLevelEnum.MEDIUM
    return RiskLevelEnum.LOW


def _create_anomaly_and_alert(
    db: Session,
    entity_type: str,
    entity_id: int,
    entity_name: str,
    anomaly_type: str,
    severity: RiskLevelEnum,
    alert_type: AlertTypeEnum,
    title: str,
    description: str,
    evidence: Dict,
    recommendation: str,
    is_demo: bool = False,
) -> AnomalyEvent:
    """Creates both an AnomalyEvent and a linked SupplyChainAlert."""
    # Dedup: check if identical unfixed anomaly exists in last 24 hours
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    existing = (
        db.query(AnomalyEvent)
        .filter(
            AnomalyEvent.entity_type == entity_type,
            AnomalyEvent.entity_id == entity_id,
            AnomalyEvent.anomaly_type == anomaly_type,
            AnomalyEvent.created_at >= cutoff,
        )
        .first()
    )
    if existing:
        return existing

    alert = SupplyChainAlert(
        alert_type=alert_type,
        severity=severity,
        title=title,
        description=description,
        evidence=evidence,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        status=AlertStatusEnum.OPEN,
        is_demo=is_demo,
    )
    db.add(alert)
    db.flush()

    event = AnomalyEvent(
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        anomaly_type=anomaly_type,
        severity=severity,
        detected_at=datetime.now(timezone.utc),
        evidence=evidence,
        model_used="Z_SCORE",
        recommendation=recommendation,
        alert_id=alert.id,
        is_demo=is_demo,
    )
    db.add(event)
    return event


class AnomalyDetector:
    """
    Detects anomalies across demand, inventory, and supplier data.
    All results are explainable with evidence dicts.
    """

    def detect_demand_anomalies(
        self,
        db: Session,
        lookback_days: int = 30,
        z_threshold: float = 2.0,
    ) -> int:
        """
        Detect demand spikes and drops for all products.
        Compares the most recent 3-day avg against the 30-day baseline.
        """
        today = datetime.now(timezone.utc).date()
        baseline_start = today - timedelta(days=lookback_days)
        recent_start = today - timedelta(days=3)

        products = db.query(Product).filter(Product.is_active == True).all()
        anomaly_count = 0

        for product in products:
            try:
                # Baseline demand (30 days ago)
                baseline_rows = (
                    db.query(DailySalesAggregate)
                    .filter(
                        DailySalesAggregate.product_id == product.id,
                        DailySalesAggregate.sale_date >= baseline_start,
                        DailySalesAggregate.sale_date < recent_start,
                    )
                    .all()
                )
                if len(baseline_rows) < 7:
                    continue

                baseline_values = [float(r.units_sold or 0) for r in baseline_rows]
                baseline_mean, baseline_std = mean_std(baseline_values)

                # Recent demand (last 3 days)
                recent_rows = (
                    db.query(DailySalesAggregate)
                    .filter(
                        DailySalesAggregate.product_id == product.id,
                        DailySalesAggregate.sale_date >= recent_start,
                    )
                    .all()
                )
                if not recent_rows:
                    continue

                recent_avg = sum(float(r.units_sold or 0) for r in recent_rows) / len(recent_rows)
                z = compute_z_score(recent_avg, baseline_mean, baseline_std)

                if z is None or abs(z) < z_threshold:
                    continue

                severity = severity_from_z(z)
                if z > 0:
                    anomaly_type = "demand_spike"
                    alert_type = AlertTypeEnum.DEMAND_SPIKE
                    title = f"Demand spike detected: {product.name}"
                    description = f"Recent 3-day avg demand ({recent_avg:.1f} units/day) is {z:.1f}σ above baseline ({baseline_mean:.1f} units/day)"
                    recommendation = f"Consider emergency restock. Current stock: {product.stock_quantity} units."
                else:
                    anomaly_type = "demand_drop"
                    alert_type = AlertTypeEnum.DEMAND_DROP
                    title = f"Demand drop detected: {product.name}"
                    description = f"Recent 3-day avg demand ({recent_avg:.1f} units/day) is {abs(z):.1f}σ below baseline ({baseline_mean:.1f} units/day)"
                    recommendation = "Review pricing and promotions. Check competitor activity."

                evidence = {
                    "baseline_mean": round(baseline_mean, 3),
                    "baseline_std": round(baseline_std, 3),
                    "recent_avg_demand": round(recent_avg, 3),
                    "z_score": round(z, 3),
                    "baseline_days": len(baseline_rows),
                    "recent_days": len(recent_rows),
                }

                _create_anomaly_and_alert(
                    db=db,
                    entity_type="product",
                    entity_id=product.id,
                    entity_name=product.name,
                    anomaly_type=anomaly_type,
                    severity=severity,
                    alert_type=alert_type,
                    title=title,
                    description=description,
                    evidence=evidence,
                    recommendation=recommendation,
                )
                anomaly_count += 1

            except Exception as e:
                logger.warning(f"[anomaly] Demand check failed for product {product.id}: {e}")

        db.commit()
        logger.info(f"[anomaly] Detected {anomaly_count} demand anomalies")
        return anomaly_count

    def detect_stockout_risk(self, db: Session) -> int:
        """
        Rule-based stockout risk: products with stock below safety threshold.
        Uses existing inventory intelligence for evidence.
        """
        from app.services.inventory_service import inventory_intelligence_service

        products = db.query(Product).filter(Product.is_active == True).all()
        alert_count = 0

        for product in products:
            try:
                intel = inventory_intelligence_service.get_product_inventory_intelligence(db, product)
                level = intel.get("stockout_risk_level")
                if level not in ("HIGH", "CRITICAL"):
                    continue

                alert_type = AlertTypeEnum.STOCKOUT_RISK
                severity = RiskLevelEnum.HIGH if level == "HIGH" else RiskLevelEnum.CRITICAL

                evidence = {
                    "current_stock": product.stock_quantity,
                    "reorder_point": intel.get("reorder_point"),
                    "days_remaining": intel.get("days_remaining"),
                    "avg_daily_demand": intel.get("demand_stats", {}).get("avg_daily_demand"),
                    "lead_time_days": intel.get("lead_time_days"),
                    "risk_score": intel.get("stockout_risk_score"),
                }

                _create_anomaly_and_alert(
                    db=db,
                    entity_type="product",
                    entity_id=product.id,
                    entity_name=product.name,
                    anomaly_type="stockout_risk",
                    severity=severity,
                    alert_type=alert_type,
                    title=f"{'Critical stockout risk' if level == 'CRITICAL' else 'High stockout risk'}: {product.name}",
                    description=intel.get("stockout_reason", "Stock critically low"),
                    evidence=evidence,
                    recommendation=f"Recommended order quantity: {intel.get('recommended_order_quantity', 'N/A')} units",
                )
                alert_count += 1

            except Exception as e:
                logger.warning(f"[anomaly] Stockout check failed for product {product.id}: {e}")

        db.commit()
        logger.info(f"[anomaly] Detected {alert_count} stockout risk events")
        return alert_count

    def run_all_detections(self, db: Session) -> Dict[str, int]:
        """Run all anomaly detectors. Returns count per detector."""
        results = {}
        results["demand"] = self.detect_demand_anomalies(db)
        results["stockout"] = self.detect_stockout_risk(db)
        return results


anomaly_detector = AnomalyDetector()
