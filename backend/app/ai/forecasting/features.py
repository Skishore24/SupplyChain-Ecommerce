"""
Demand Forecasting — Feature Engineering
==========================================
Builds the feature matrix for ML demand forecasting.
Features:
- Lag features: lag_1, lag_7, lag_14, lag_28
- Rolling statistics: rolling_mean/std at 7, 14, 30 days
- Calendar features: weekday, month, quarter, is_weekend
- Trend features: linear trend index

IMPORTANT: No data leakage. Features are computed using only past data.
"""
from datetime import date, timedelta
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)


def _check_pandas() -> bool:
    """Lazy check for pandas availability — avoids import warnings at module load."""
    try:
        import numpy  # noqa
        import pandas  # noqa
        return True
    except ImportError:
        return False


PANDAS_AVAILABLE = None  # Lazily evaluated


def build_feature_dataframe(daily_records: list) -> Optional[object]:
    """
    Build a feature DataFrame from a list of DailySalesAggregate ORM objects or dicts.

    Returns:
        pd.DataFrame with features and target (units_sold), or None if pandas unavailable.
        Index is sale_date.
    """
    if not _check_pandas():
        return None

    if not daily_records:
        return None

    rows = []
    for r in daily_records:
        if hasattr(r, "__dict__"):
            rows.append({
                "date": r.sale_date,
                "units_sold": int(r.units_sold or 0),
                "revenue": float(r.revenue or 0),
                "order_count": int(r.order_count or 0),
                "stock_at_eod": int(r.stock_at_eod or 0) if r.stock_at_eod is not None else None,
            })
        else:
            rows.append(r)

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # Fill date gaps with 0 demand
    if len(df) > 0:
        full_range = pd.date_range(df["date"].min(), df["date"].max(), freq="D")
        df = df.set_index("date").reindex(full_range, fill_value=0).reset_index()
        df.rename(columns={"index": "date"}, inplace=True)
        df["units_sold"] = df["units_sold"].fillna(0).astype(int)

    df = _add_lag_features(df)
    df = _add_rolling_features(df)
    df = _add_calendar_features(df)
    df = _add_trend_feature(df)

    return df


def _add_lag_features(df: "pd.DataFrame") -> "pd.DataFrame":
    """Add lag features: sales 1, 7, 14, 28 days ago."""
    for lag in [1, 7, 14, 28]:
        df[f"lag_{lag}"] = df["units_sold"].shift(lag)
    return df


def _add_rolling_features(df: "pd.DataFrame") -> "pd.DataFrame":
    """Add rolling window statistics."""
    for window in [7, 14, 30]:
        df[f"rolling_mean_{window}"] = df["units_sold"].shift(1).rolling(window=window, min_periods=1).mean()
        df[f"rolling_std_{window}"] = df["units_sold"].shift(1).rolling(window=window, min_periods=1).std().fillna(0)
        df[f"rolling_max_{window}"] = df["units_sold"].shift(1).rolling(window=window, min_periods=1).max()
        df[f"rolling_min_{window}"] = df["units_sold"].shift(1).rolling(window=window, min_periods=1).min()
    return df


def _add_calendar_features(df: "pd.DataFrame") -> "pd.DataFrame":
    """Add time-based calendar features."""
    df["weekday"] = df["date"].dt.dayofweek        # 0=Monday, 6=Sunday
    df["month"] = df["date"].dt.month
    df["quarter"] = df["date"].dt.quarter
    df["is_weekend"] = (df["weekday"] >= 5).astype(int)
    df["day_of_year"] = df["date"].dt.dayofyear
    df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
    return df


def _add_trend_feature(df: "pd.DataFrame") -> "pd.DataFrame":
    """Add a linear trend index (normalized 0-1)."""
    n = len(df)
    if n > 1:
        df["trend_index"] = [i / (n - 1) for i in range(n)]
    else:
        df["trend_index"] = 0.0
    return df


def get_feature_columns() -> List[str]:
    """
    Returns the ordered list of feature column names used for training/prediction.
    This must stay consistent between training and prediction.
    """
    lag_cols = [f"lag_{l}" for l in [1, 7, 14, 28]]
    rolling_cols = []
    for w in [7, 14, 30]:
        rolling_cols += [
            f"rolling_mean_{w}",
            f"rolling_std_{w}",
            f"rolling_max_{w}",
            f"rolling_min_{w}",
        ]
    calendar_cols = ["weekday", "month", "quarter", "is_weekend", "day_of_year", "week_of_year"]
    trend_cols = ["trend_index"]
    return lag_cols + rolling_cols + calendar_cols + trend_cols


def prepare_future_features(
    historical_df: "pd.DataFrame",
    horizon_days: int,
) -> Optional["pd.DataFrame"]:
    """
    Build a feature DataFrame for future dates (for prediction).
    Uses the rolling predictions approach: predicted values feed back as lags.

    Returns a DataFrame with feature_columns only (no target).
    """
    if not PANDAS_AVAILABLE or historical_df is None:
        return None

    import pandas as pd
    import numpy as np

    # We'll do recursive forecasting
    last_date = historical_df["date"].max()
    future_dates = [last_date + timedelta(days=i + 1) for i in range(horizon_days)]

    # Build extended series (history + placeholder future)
    extended = historical_df[["date", "units_sold"]].copy()

    for fd in future_dates:
        extended = pd.concat([
            extended,
            pd.DataFrame({"date": [pd.Timestamp(fd)], "units_sold": [np.nan]})
        ], ignore_index=True)

    extended = extended.sort_values("date").reset_index(drop=True)
    extended = _add_lag_features(extended)
    extended = _add_rolling_features(extended)
    extended = _add_calendar_features(extended)
    extended = _add_trend_feature(extended)

    # Return only future rows
    future_df = extended[extended["units_sold"].isna()].copy()
    return future_df
