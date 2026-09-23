"""
Demand Forecasting — Evaluation Metrics
=========================================
Time-aware evaluation of forecasting models.
Uses walk-forward cross-validation (no data leakage).

Metrics:
- MAE: Mean Absolute Error
- RMSE: Root Mean Squared Error
- MAPE: Mean Absolute Percentage Error (only when actuals > 0)
- WAPE: Weighted Absolute Percentage Error (robust to zeros)
- Bias: systematic over/under prediction
"""
import math
from typing import List, Dict, Optional, Tuple, Any
import logging

logger = logging.getLogger(__name__)


def compute_mae(actuals: List[float], predictions: List[float]) -> float:
    """Mean Absolute Error."""
    if not actuals:
        return 0.0
    return sum(abs(a - p) for a, p in zip(actuals, predictions)) / len(actuals)


def compute_rmse(actuals: List[float], predictions: List[float]) -> float:
    """Root Mean Squared Error."""
    if not actuals:
        return 0.0
    mse = sum((a - p) ** 2 for a, p in zip(actuals, predictions)) / len(actuals)
    return math.sqrt(mse)


def compute_mape(actuals: List[float], predictions: List[float]) -> Optional[float]:
    """
    Mean Absolute Percentage Error.
    Returns None when all actuals are zero (undefined).
    Only computed over non-zero actual values.
    """
    pairs = [(a, p) for a, p in zip(actuals, predictions) if a > 0]
    if not pairs:
        return None
    return sum(abs(a - p) / a for a, p in pairs) / len(pairs) * 100


def compute_wape(actuals: List[float], predictions: List[float]) -> float:
    """
    Weighted Absolute Percentage Error = sum|a-p| / sum(a)
    Robust to zero actuals (unlike MAPE).
    """
    sum_abs_error = sum(abs(a - p) for a, p in zip(actuals, predictions))
    sum_actuals = sum(actuals)
    if sum_actuals <= 0:
        return 0.0
    return (sum_abs_error / sum_actuals) * 100


def compute_bias(actuals: List[float], predictions: List[float]) -> float:
    """
    Forecast bias = mean(prediction - actual)
    Positive = systematic overforecast
    Negative = systematic underforecast
    """
    if not actuals:
        return 0.0
    return sum(p - a for a, p in zip(actuals, predictions)) / len(actuals)


def evaluate_all(
    actuals: List[float],
    predictions: List[float],
) -> Dict[str, Optional[float]]:
    """Compute all metrics at once."""
    if len(actuals) != len(predictions) or not actuals:
        return {"mae": None, "rmse": None, "mape": None, "wape": None, "bias": None}

    return {
        "mae": round(compute_mae(actuals, predictions), 4),
        "rmse": round(compute_rmse(actuals, predictions), 4),
        "mape": round(compute_mape(actuals, predictions), 4) if compute_mape(actuals, predictions) is not None else None,
        "wape": round(compute_wape(actuals, predictions), 4),
        "bias": round(compute_bias(actuals, predictions), 4),
        "n_samples": len(actuals),
    }


def walk_forward_evaluate(
    model_factory,
    values: List[float],
    feature_df: Optional[Any],
    feature_cols: Optional[List[str]],
    horizon: int = 7,
    n_splits: int = 3,
    min_train_size: int = 14,
) -> Dict[str, Any]:
    """
    Time-aware walk-forward cross-validation.
    
    Each split:
    - Train on [0:i]
    - Predict horizon days
    - Evaluate against actuals [i:i+horizon]

    No shuffling. No future data in training set.
    """
    n = len(values)
    if n < min_train_size + horizon:
        return {
            "status": "insufficient_data",
            "message": f"Need at least {min_train_size + horizon} days for walk-forward evaluation",
            "metrics": {"mae": None, "rmse": None, "wape": None, "bias": None},
        }

    all_actuals = []
    all_preds = []
    split_size = (n - min_train_size - horizon) // max(n_splits, 1)

    for i in range(n_splits):
        train_end = min_train_size + i * max(split_size, 1)
        test_start = train_end
        test_end = min(test_start + horizon, n)

        if test_end > n or train_end >= n:
            break

        train_values = values[:train_end]
        test_values = values[test_start:test_end]

        try:
            model = model_factory(train_values)
            if hasattr(model, "predict"):
                preds = model.predict(len(test_values))
            else:
                preds = [sum(train_values[-7:]) / 7] * len(test_values)  # fallback MA

            all_actuals.extend(test_values)
            all_preds.extend(preds[:len(test_values)])
        except Exception as e:
            logger.warning(f"[eval] Walk-forward split {i} failed: {e}")

    if not all_actuals:
        return {
            "status": "evaluation_failed",
            "message": "Walk-forward evaluation produced no results",
            "metrics": {"mae": None, "rmse": None, "wape": None, "bias": None},
        }

    metrics = evaluate_all(all_actuals, all_preds)
    return {
        "status": "success",
        "n_splits": n_splits,
        "horizon_days": horizon,
        "total_eval_samples": len(all_actuals),
        "metrics": metrics,
    }
