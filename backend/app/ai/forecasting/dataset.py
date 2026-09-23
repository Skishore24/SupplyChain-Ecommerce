"""
Demand Forecasting — Dataset Builder
======================================
Loads daily sales data from the database for a product.
"""
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List
import logging

from sqlalchemy.orm import Session
from sqlalchemy import asc

from app.models.inventory import DailySalesAggregate
from app.models.product import Product

logger = logging.getLogger(__name__)

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False


def load_product_sales_data(
    db: Session,
    product_id: int,
    lookback_days: int = 365,
) -> Optional[List[dict]]:
    """
    Load daily sales records for a product from DailySalesAggregate.
    Returns list of dicts with: date, units_sold, revenue, order_count, stock_at_eod
    Returns None if no data available.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).date()

    rows = (
        db.query(DailySalesAggregate)
        .filter(
            DailySalesAggregate.product_id == product_id,
            DailySalesAggregate.sale_date >= cutoff,
        )
        .order_by(asc(DailySalesAggregate.sale_date))
        .all()
    )

    if not rows:
        return None

    return rows


def check_data_sufficiency(records: List, min_days_ml: int = 30, min_days_dl: int = 90) -> dict:
    """
    Check if there is enough data for ML or DL training.
    Returns dict with flags and available days count.
    """
    n = len(records) if records else 0
    return {
        "available_days": n,
        "sufficient_for_ml": n >= min_days_ml,
        "sufficient_for_dl": n >= min_days_dl,
        "status_message": (
            f"Insufficient historical data for reliable prediction (have {n} days, need {min_days_ml})"
            if n < min_days_ml
            else f"{n} days of historical data available"
        ),
    }
