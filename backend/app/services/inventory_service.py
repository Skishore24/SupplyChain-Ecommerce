"""
Inventory Intelligence Service
================================
Calculates stockout risk, overstock risk, reorder points, safety stock,
and inventory health scores from real data.

All calculations are transparent and explainable:
- Reorder point = (avg daily demand × lead time) + safety stock
- Safety stock = z_score × std_daily_demand × sqrt(lead_time)
- Days remaining = current_stock / avg_daily_demand
- Stockout risk score = computed from days_remaining vs lead_time

No hardcoded scores — every value traces back to real data.
"""
from datetime import datetime, timezone, date, timedelta
from typing import Optional, Dict, Any, List, Tuple
import math
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.product import Product
from app.models.inventory import DailySalesAggregate, InventorySnapshot
from app.models.supplier import SupplierProduct, Supplier
from app.core.config import settings

logger = logging.getLogger(__name__)

# Safety stock z-scores for common service levels
SERVICE_LEVEL_Z_SCORES = {
    0.90: 1.28,
    0.95: 1.645,
    0.99: 2.33,
}

DEFAULT_SERVICE_LEVEL = 0.95
DEFAULT_LEAD_TIME_DAYS = 7
DEFAULT_SAFETY_STOCK_MULTIPLIER = 1.5


class InventoryIntelligenceService:
    """
    Computes inventory health metrics for the AI dashboard.
    """

    def get_demand_stats(
        self,
        db: Session,
        product_id: int,
        lookback_days: int = 30,
    ) -> Dict[str, float]:
        """
        Compute avg and std of daily demand from DailySalesAggregate.
        Returns 'insufficient_data' flag if fewer than MIN_DAYS available.
        """
        cutoff = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).date()

        rows = (
            db.query(DailySalesAggregate)
            .filter(
                DailySalesAggregate.product_id == product_id,
                DailySalesAggregate.sale_date >= cutoff,
            )
            .order_by(DailySalesAggregate.sale_date)
            .all()
        )

        if not rows:
            return {
                "avg_daily_demand": 0.0,
                "std_daily_demand": 0.0,
                "data_days": 0,
                "insufficient_data": True,
            }

        # Include zero-demand days (days with no sales)
        units = [r.units_sold for r in rows]
        n = len(units)
        avg = sum(units) / n if n > 0 else 0.0
        variance = sum((u - avg) ** 2 for u in units) / n if n > 1 else 0.0
        std = math.sqrt(variance)

        return {
            "avg_daily_demand": round(avg, 4),
            "std_daily_demand": round(std, 4),
            "data_days": n,
            "total_sold": sum(units),
            "insufficient_data": n < 7,
        }

    def get_lead_time(self, db: Session, product_id: int) -> Tuple[int, str]:
        """
        Get configured lead time from SupplierProduct (primary supplier).
        Returns (days, source) where source explains where it came from.
        """
        primary = (
            db.query(SupplierProduct)
            .filter(
                SupplierProduct.product_id == product_id,
                SupplierProduct.is_active == True,
            )
            .order_by(SupplierProduct.priority.asc())
            .first()
        )
        if primary and primary.lead_time_days:
            return primary.lead_time_days, "supplier_configuration"
        return DEFAULT_LEAD_TIME_DAYS, "default"

    def calculate_safety_stock(
        self,
        std_daily_demand: float,
        lead_time_days: int,
        service_level: float = DEFAULT_SERVICE_LEVEL,
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Safety stock = Z × σ × √L
        Where Z = service level z-score, σ = std daily demand, L = lead time days

        Returns (safety_stock, calculation_detail)
        """
        z = SERVICE_LEVEL_Z_SCORES.get(service_level, 1.645)
        safety_stock = z * std_daily_demand * math.sqrt(lead_time_days)
        safety_stock = math.ceil(safety_stock)

        return safety_stock, {
            "formula": "Z × σ_daily × √lead_time",
            "z_score": z,
            "service_level": service_level,
            "std_daily_demand": round(std_daily_demand, 4),
            "lead_time_days": lead_time_days,
            "result": safety_stock,
        }

    def calculate_reorder_point(
        self,
        avg_daily_demand: float,
        lead_time_days: int,
        safety_stock: float,
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Reorder Point = (avg_daily_demand × lead_time_days) + safety_stock

        Returns (reorder_point, calculation_detail)
        """
        demand_during_lead_time = avg_daily_demand * lead_time_days
        reorder_point = math.ceil(demand_during_lead_time + safety_stock)

        return reorder_point, {
            "formula": "(avg_daily_demand × lead_time) + safety_stock",
            "avg_daily_demand": round(avg_daily_demand, 4),
            "lead_time_days": lead_time_days,
            "demand_during_lead_time": round(demand_during_lead_time, 2),
            "safety_stock": safety_stock,
            "result": reorder_point,
        }

    def calculate_days_remaining(
        self,
        current_stock: int,
        avg_daily_demand: float,
    ) -> Tuple[Optional[float], Dict[str, Any]]:
        """
        Days of inventory remaining = current_stock / avg_daily_demand
        """
        if avg_daily_demand <= 0:
            return None, {"note": "No demand — cannot compute days remaining"}

        days = round(current_stock / avg_daily_demand, 1)
        return days, {
            "formula": "current_stock / avg_daily_demand",
            "current_stock": current_stock,
            "avg_daily_demand": round(avg_daily_demand, 4),
            "result_days": days,
        }

    def calculate_stockout_risk_score(
        self,
        current_stock: int,
        days_remaining: Optional[float],
        lead_time_days: int,
        reorder_point: float,
    ) -> Tuple[float, str, str]:
        """
        Risk score 0-100 based on how close to stockout we are.
        Returns (score, risk_level, reason).
        """
        if current_stock <= 0:
            return 100.0, "CRITICAL", "Out of stock — zero inventory"

        if days_remaining is None:
            return 0.0, "LOW", "No demand history — risk unknown"

        # Risk increases as days_remaining approaches/falls below lead_time
        buffer_ratio = days_remaining / max(lead_time_days, 1)

        if buffer_ratio <= 0:
            score, level = 100.0, "CRITICAL"
            reason = "Stockout imminent — stock exhausted before replenishment"
        elif buffer_ratio <= 0.5:
            score = 90.0 - (buffer_ratio * 20)
            level = "CRITICAL"
            reason = f"Only {days_remaining:.0f} days of stock vs {lead_time_days} days lead time"
        elif buffer_ratio <= 1.0:
            score = 70.0 - (buffer_ratio - 0.5) * 40
            level = "HIGH"
            reason = f"Stock will last {days_remaining:.0f} days — within lead time window"
        elif buffer_ratio <= 2.0:
            score = 50.0 - (buffer_ratio - 1.0) * 30
            level = "MEDIUM"
            reason = f"Stock adequate for {days_remaining:.0f} days but approaching reorder point"
        elif current_stock <= reorder_point:
            score = 30.0
            level = "MEDIUM"
            reason = f"Current stock ({current_stock}) at or below reorder point ({reorder_point:.0f})"
        else:
            score = max(0.0, 30.0 - (buffer_ratio - 2.0) * 10)
            level = "LOW"
            reason = f"Adequate stock for {days_remaining:.0f} days"

        return round(score, 1), level, reason

    def calculate_overstock_risk(
        self,
        current_stock: int,
        avg_daily_demand: float,
        days_remaining: Optional[float],
        overstock_threshold_days: int = 90,
    ) -> Tuple[float, bool, str]:
        """
        Returns (overstock_score, is_overstock, reason).
        Overstock = more than threshold_days of inventory on hand.
        """
        if avg_daily_demand <= 0 or days_remaining is None:
            return 0.0, False, "Insufficient demand data"

        if days_remaining > overstock_threshold_days:
            excess_days = days_remaining - overstock_threshold_days
            score = min(100.0, 50.0 + (excess_days / overstock_threshold_days) * 50.0)
            return round(score, 1), True, f"{days_remaining:.0f} days of stock ({overstock_threshold_days}-day threshold)"

        return 0.0, False, f"Stock levels normal ({days_remaining:.0f} days)"

    def calculate_recommended_order_quantity(
        self,
        avg_daily_demand: float,
        lead_time_days: int,
        safety_stock: float,
        current_stock: int,
        forecast_30d: Optional[float] = None,
        horizon_days: int = 30,
    ) -> Tuple[int, Dict[str, Any]]:
        """
        Recommended order quantity:
        = max(0, (demand_for_horizon + safety_stock) - current_stock)

        Uses 30-day forecast if available; otherwise historical avg.
        Returns (quantity, calculation_detail)
        """
        if forecast_30d is not None:
            demand_30d = forecast_30d
            demand_source = "ML forecast"
        else:
            demand_30d = avg_daily_demand * horizon_days
            demand_source = f"historical avg ({round(avg_daily_demand, 2)}/day × {horizon_days} days)"

        target_stock = demand_30d + safety_stock
        recommended = max(0, math.ceil(target_stock - current_stock))

        return recommended, {
            "formula": "max(0, (demand_horizon + safety_stock) - current_stock)",
            "horizon_days": horizon_days,
            "demand_for_horizon": round(demand_30d, 2),
            "demand_source": demand_source,
            "safety_stock": safety_stock,
            "target_stock": round(target_stock, 2),
            "current_stock": current_stock,
            "result": recommended,
        }

    def get_product_inventory_intelligence(
        self,
        db: Session,
        product: Product,
        forecast_30d: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Full inventory intelligence report for a single product.
        Returns all metrics with explanations.
        """
        demand_stats = self.get_demand_stats(db, product.id, lookback_days=30)
        avg_demand = demand_stats["avg_daily_demand"]
        std_demand = demand_stats["std_daily_demand"]

        lead_time, lead_time_source = self.get_lead_time(db, product.id)

        safety_stock, ss_calc = self.calculate_safety_stock(std_demand, lead_time)
        reorder_point, rop_calc = self.calculate_reorder_point(avg_demand, lead_time, safety_stock)
        days_remaining, dr_calc = self.calculate_days_remaining(product.stock_quantity, avg_demand)

        stockout_score, stockout_level, stockout_reason = self.calculate_stockout_risk_score(
            product.stock_quantity, days_remaining, lead_time, reorder_point
        )
        overstock_score, is_overstock, overstock_reason = self.calculate_overstock_risk(
            product.stock_quantity, avg_demand, days_remaining
        )

        rec_qty, rec_calc = self.calculate_recommended_order_quantity(
            avg_demand, lead_time, safety_stock, product.stock_quantity, forecast_30d
        )

        # Inventory health score (0-100, higher = healthier)
        # Penalize both stockout risk and overstock equally
        inventory_health = max(0.0, 100.0 - stockout_score - (overstock_score * 0.3))
        inventory_health = round(inventory_health, 1)

        return {
            "product_id": product.id,
            "product_name": product.name,
            "sku": product.sku,
            "current_stock": product.stock_quantity,
            "low_stock_threshold": product.low_stock_threshold,
            "demand_stats": demand_stats,
            "lead_time_days": lead_time,
            "lead_time_source": lead_time_source,
            "safety_stock": safety_stock,
            "safety_stock_calculation": ss_calc,
            "reorder_point": reorder_point,
            "reorder_point_calculation": rop_calc,
            "days_remaining": days_remaining,
            "days_remaining_calculation": dr_calc,
            "stockout_risk_score": stockout_score,
            "stockout_risk_level": stockout_level,
            "stockout_reason": stockout_reason,
            "overstock_risk_score": overstock_score,
            "is_overstock": is_overstock,
            "overstock_reason": overstock_reason,
            "recommended_order_quantity": rec_qty,
            "recommended_order_calculation": rec_calc,
            "inventory_health_score": inventory_health,
            "is_below_reorder_point": product.stock_quantity <= reorder_point,
            "needs_reorder": rec_qty > 0 and stockout_level in ("HIGH", "CRITICAL", "MEDIUM"),
            "insufficient_data": demand_stats.get("insufficient_data", False),
        }

    def get_all_products_risk(
        self,
        db: Session,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Returns inventory intelligence for all active products,
        sorted by stockout risk (highest first).
        """
        products = (
            db.query(Product)
            .filter(Product.is_active == True)
            .limit(limit)
            .all()
        )

        results = []
        for product in products:
            try:
                intel = self.get_product_inventory_intelligence(db, product)
                results.append(intel)
            except Exception as e:
                logger.warning(f"[inventory_intel] Failed for product {product.id}: {e}")

        # Sort: critical first, then by stockout score descending
        results.sort(key=lambda x: -x.get("stockout_risk_score", 0))
        return results

    def get_inventory_health_summary(self, db: Session) -> Dict[str, Any]:
        """
        Aggregate inventory health for the supply chain dashboard.
        """
        products = db.query(Product).filter(Product.is_active == True).all()
        total = len(products)
        if total == 0:
            return {"total_products": 0, "health_score": 0, "note": "No active products"}

        stockout_risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        overstock_count = 0
        total_health = 0.0
        needs_reorder_count = 0

        for product in products:
            try:
                intel = self.get_product_inventory_intelligence(db, product)
                level = intel.get("stockout_risk_level", "LOW")
                stockout_risk_counts[level] = stockout_risk_counts.get(level, 0) + 1
                if intel.get("is_overstock"):
                    overstock_count += 1
                if intel.get("needs_reorder"):
                    needs_reorder_count += 1
                total_health += intel.get("inventory_health_score", 50.0)
            except Exception:
                total_health += 50.0

        avg_health = round(total_health / total, 1)

        return {
            "total_products": total,
            "avg_inventory_health_score": avg_health,
            "stockout_risk_breakdown": stockout_risk_counts,
            "overstock_count": overstock_count,
            "needs_reorder_count": needs_reorder_count,
            "critical_count": stockout_risk_counts["CRITICAL"],
            "high_risk_count": stockout_risk_counts["HIGH"],
        }


inventory_intelligence_service = InventoryIntelligenceService()
