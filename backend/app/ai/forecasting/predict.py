"""
Demand Forecasting — Prediction Engine
========================================
Orchestrates the full forecast pipeline for a product:
1. Load historical data
2. Check data sufficiency
3. Build features
4. Train/load best model
5. Generate forecasts
6. Store to demand_forecasts table
7. Return structured prediction result

All results clearly indicate: model_source, data_days, and any limitations.
"""
from datetime import datetime, timezone, timedelta, date
from typing import Optional, Dict, Any, List
import logging

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.inventory import DailySalesAggregate
from app.models.ai_models import DemandForecast, ModelVersion
from app.ai.forecasting.dataset import load_product_sales_data, check_data_sufficiency
from app.ai.forecasting.features import build_feature_dataframe, get_feature_columns, prepare_future_features
from app.ai.forecasting.train import train_best_model, save_model, MovingAverageForecaster
from app.ai.forecasting.evaluate import evaluate_all
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False


def generate_product_forecast(
    db: Session,
    product_id: int,
    horizon_days: int = 30,
    force_retrain: bool = False,
) -> Dict[str, Any]:
    """
    Main entry point: generate demand forecast for a product.

    Returns structured result:
    {
        "product_id": ...,
        "status": "success" | "insufficient_data" | "error",
        "model_source": "ML" | "DL" | "MOVING_AVG",
        "data_days": ...,
        "forecasts": [{"date": ..., "predicted": ..., ...}, ...],
        "metrics": {...},
        "message": ...,
    }
    """
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return {"status": "error", "message": f"Product {product_id} not found"}

        # Load historical data
        records = load_product_sales_data(db, product_id, lookback_days=400)
        sufficiency = check_data_sufficiency(
            records,
            min_days_ml=settings.MIN_DAYS_FOR_ML,
            min_days_dl=settings.MIN_DAYS_FOR_DL,
        )
        data_days = sufficiency["available_days"]

        if data_days == 0:
            return {
                "product_id": product_id,
                "product_name": product.name,
                "status": "insufficient_data",
                "message": "Insufficient historical data for reliable prediction.",
                "data_days": 0,
                "model_source": None,
                "forecasts": [],
                "metrics": {},
            }

        # Build features
        feature_cols = get_feature_columns()
        df = build_feature_dataframe(records)

        if df is None:
            # Fall back to moving average (no pandas needed)
            values = [r.units_sold for r in records]
            ma = MovingAverageForecaster(window=min(7, data_days))
            ma.fit(values)
            preds = ma.predict(horizon_days)
            model_source = "MOVING_AVG"
            algorithm = "MovingAverage"
            metrics = {}
        else:
            values = df["units_sold"].clip(lower=0).tolist()
            model, model_source, algorithm = train_best_model(df, feature_cols, values, data_days)

            # Generate predictions
            if model_source == "MOVING_AVG":
                preds = model.predict(horizon_days)
            elif model_source in ("ML",):
                future_df = prepare_future_features(df, horizon_days)
                if future_df is not None:
                    preds = model.predict_df(future_df)
                else:
                    preds = [values[-1]] * horizon_days
            elif model_source == "DL":
                preds = model.predict(horizon_days)
            else:
                preds = [sum(values[-7:]) / 7] * horizon_days

            # Quick evaluation on last 20% of data
            eval_size = max(7, int(len(values) * 0.2))
            if len(values) > eval_size + 7:
                eval_actuals = values[-eval_size:]
                train_vals = values[:-eval_size]
                ma_eval = MovingAverageForecaster(window=min(7, len(train_vals)))
                ma_eval.fit(train_vals)
                eval_preds = ma_eval.predict(eval_size)
                metrics = evaluate_all(eval_actuals, eval_preds)
            else:
                metrics = {}

        # Build forecast list
        today = datetime.now(timezone.utc).date()
        forecasts = []
        for i, pred_qty in enumerate(preds):
            fd = today + timedelta(days=i + 1)
            forecasts.append({
                "date": fd.isoformat(),
                "predicted_quantity": round(max(0.0, pred_qty), 2),
                "lower_bound": round(max(0.0, pred_qty * 0.8), 2),
                "upper_bound": round(pred_qty * 1.2, 2),
            })

        # Store forecasts to DB (upsert)
        _store_forecasts(db, product_id, forecasts, horizon_days, model_source, "1.0")

        return {
            "product_id": product_id,
            "product_name": product.name,
            "sku": product.sku,
            "status": "success",
            "message": sufficiency["status_message"],
            "data_days": data_days,
            "model_source": model_source,
            "algorithm": algorithm,
            "horizon_days": horizon_days,
            "forecasts": forecasts,
            "metrics": metrics,
            "total_forecast_demand": round(sum(f["predicted_quantity"] for f in forecasts), 2),
        }

    except Exception as e:
        logger.error(f"[forecast] Failed for product {product_id}: {e}", exc_info=True)
        return {
            "product_id": product_id,
            "status": "error",
            "message": f"Forecasting failed: {str(e)}",
            "data_days": 0,
            "forecasts": [],
        }


def _store_forecasts(
    db: Session,
    product_id: int,
    forecasts: List[Dict],
    horizon_days: int,
    model_source: str,
    model_version: str,
) -> None:
    """Upsert forecast records to demand_forecasts table."""
    try:
        for fc in forecasts:
            fc_date = date.fromisoformat(fc["date"])
            existing = (
                db.query(DemandForecast)
                .filter(
                    DemandForecast.product_id == product_id,
                    DemandForecast.forecast_date == fc_date,
                    DemandForecast.horizon_days == horizon_days,
                )
                .first()
            )
            if existing:
                existing.predicted_quantity = fc["predicted_quantity"]
                existing.lower_bound = fc.get("lower_bound")
                existing.upper_bound = fc.get("upper_bound")
                existing.model_source = model_source
                existing.model_version = model_version
                existing.created_at = datetime.now(timezone.utc)
            else:
                record = DemandForecast(
                    product_id=product_id,
                    forecast_date=fc_date,
                    horizon_days=horizon_days,
                    predicted_quantity=fc["predicted_quantity"],
                    lower_bound=fc.get("lower_bound"),
                    upper_bound=fc.get("upper_bound"),
                    model_source=model_source,
                    model_version=model_version,
                )
                db.add(record)
        db.commit()
    except Exception as e:
        logger.error(f"[forecast] Failed to store forecasts: {e}")
        db.rollback()


def get_stored_forecast(
    db: Session,
    product_id: int,
    horizon_days: int = 30,
) -> Optional[Dict[str, Any]]:
    """
    Retrieve the most recent stored forecast for a product.
    Returns None if no forecast exists.
    """
    today = datetime.now(timezone.utc).date()
    records = (
        db.query(DemandForecast)
        .filter(
            DemandForecast.product_id == product_id,
            DemandForecast.forecast_date >= today,
            DemandForecast.horizon_days == horizon_days,
        )
        .order_by(DemandForecast.forecast_date.asc())
        .limit(horizon_days)
        .all()
    )

    if not records:
        return None

    return {
        "product_id": product_id,
        "horizon_days": horizon_days,
        "model_source": records[0].model_source if records else None,
        "model_version": records[0].model_version if records else None,
        "forecasts": [
            {
                "date": r.forecast_date.isoformat(),
                "predicted_quantity": float(r.predicted_quantity),
                "lower_bound": float(r.lower_bound) if r.lower_bound else None,
                "upper_bound": float(r.upper_bound) if r.upper_bound else None,
            }
            for r in records
        ],
        "total_forecast_demand": sum(float(r.predicted_quantity) for r in records),
        "retrieved_from": "cache",
    }
