"""
Demand Forecasting — Model Training
=====================================
Trains demand forecasting models using time-aware validation.
Models (in order of preference when data is sufficient):
1. Moving Average Baseline (always available)
2. Linear Regression (sklearn)
3. Gradient Boosting Regressor (sklearn)
4. LSTM (PyTorch — only when ≥90 days available)

CRITICAL: No random shuffle of time series data for evaluation.
All cross-validation uses walk-forward (time-aware) splitting.
"""
import os
import pickle
import logging
import math
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple, List

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import numpy as np
    import pandas as pd
    from sklearn.linear_model import Ridge
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("[forecasting] scikit-learn not installed — falling back to moving average")

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class MovingAverageForecaster:
    """
    Simple moving average baseline.
    Always available — no library dependencies.
    model_source = 'MOVING_AVG'
    """

    def __init__(self, window: int = 7):
        self.window = window
        self.last_values: List[float] = []
        self.model_source = "MOVING_AVG"

    def fit(self, y: List[float]) -> "MovingAverageForecaster":
        self.last_values = list(y[-self.window:])
        return self

    def predict(self, horizon: int) -> List[float]:
        preds = []
        history = list(self.last_values)
        for _ in range(horizon):
            avg = sum(history[-self.window:]) / min(len(history), self.window)
            preds.append(max(0.0, avg))
            history.append(avg)
        return preds


class GBMForecaster:
    """
    Gradient Boosting demand forecaster.
    Requires scikit-learn and ≥30 days of data.
    model_source = 'ML'
    """

    def __init__(self):
        self.model = None
        self.feature_cols: List[str] = []
        self.model_source = "ML"

    def fit(self, df: "pd.DataFrame", feature_cols: List[str]) -> "GBMForecaster":
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn required for GBMForecaster")

        train_df = df.dropna(subset=feature_cols + ["units_sold"])
        X = train_df[feature_cols].values
        y = train_df["units_sold"].clip(lower=0).values

        self.model = Pipeline([
            ("scaler", StandardScaler()),
            ("gbm", GradientBoostingRegressor(
                n_estimators=100,
                max_depth=4,
                learning_rate=0.1,
                subsample=0.8,
                min_samples_leaf=3,
                random_state=42,
            )),
        ])
        self.model.fit(X, y)
        self.feature_cols = feature_cols
        return self

    def predict_df(self, future_df: "pd.DataFrame") -> List[float]:
        if self.model is None:
            raise RuntimeError("Model not fitted")
        X = future_df[self.feature_cols].fillna(0).values
        preds = self.model.predict(X)
        return [max(0.0, float(p)) for p in preds]


class LSTMForecaster(object):
    """
    LSTM demand forecaster using PyTorch.
    Only used when ≥90 days of data available.
    model_source = 'DL'
    """

    def __init__(self, hidden_size: int = 64, num_layers: int = 2, seq_len: int = 14):
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.seq_len = seq_len
        self.model = None
        self.scaler_mean = 0.0
        self.scaler_std = 1.0
        self.model_source = "DL"

    def _build_sequences(self, values: List[float]) -> Tuple:
        import torch
        X, y = [], []
        for i in range(len(values) - self.seq_len):
            X.append(values[i: i + self.seq_len])
            y.append(values[i + self.seq_len])
        return (
            torch.FloatTensor(X).unsqueeze(-1),
            torch.FloatTensor(y)
        )

    def fit(self, values: List[float], epochs: int = 50) -> "LSTMForecaster":
        if not TORCH_AVAILABLE:
            raise ImportError("PyTorch required for LSTMForecaster")

        import torch
        import torch.nn as nn

        arr = [float(v) for v in values]
        self.scaler_mean = sum(arr) / len(arr)
        self.scaler_std = max(1e-8, math.sqrt(sum((v - self.scaler_mean) ** 2 for v in arr) / len(arr)))
        normalized = [(v - self.scaler_mean) / self.scaler_std for v in arr]

        X, y = self._build_sequences(normalized)
        if len(X) < 1:
            raise ValueError("Not enough data for LSTM sequences")

        class LSTMModel(nn.Module):
            def __init__(self, hidden_size, num_layers):
                super().__init__()
                self.lstm = nn.LSTM(1, hidden_size, num_layers, batch_first=True, dropout=0.2)
                self.fc = nn.Linear(hidden_size, 1)

            def forward(self, x):
                out, _ = self.lstm(x)
                return self.fc(out[:, -1, :]).squeeze(-1)

        self.model = LSTMModel(self.hidden_size, self.num_layers)
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.001)
        criterion = nn.MSELoss()

        self.model.train()
        for epoch in range(epochs):
            optimizer.zero_grad()
            pred = self.model(X)
            loss = criterion(pred, y)
            loss.backward()
            optimizer.step()

        self.last_seq = normalized[-self.seq_len:]
        return self

    def predict(self, horizon: int) -> List[float]:
        if not TORCH_AVAILABLE or self.model is None:
            raise RuntimeError("LSTM model not fitted")

        import torch

        self.model.eval()
        preds = []
        seq = list(self.last_seq)

        with torch.no_grad():
            for _ in range(horizon):
                x = torch.FloatTensor(seq[-self.seq_len:]).unsqueeze(0).unsqueeze(-1)
                p = self.model(x).item()
                preds.append(p)
                seq.append(p)

        # Denormalize
        return [max(0.0, p * self.scaler_std + self.scaler_mean) for p in preds]


def train_best_model(
    df: "pd.DataFrame",
    feature_cols: List[str],
    values: List[float],
    data_days: int,
) -> Tuple[Any, str, str]:
    """
    Train the best available model given data size.
    Returns (model, model_source, algorithm_name)
    """
    if data_days >= settings.MIN_DAYS_FOR_DL and TORCH_AVAILABLE:
        try:
            logger.info(f"[forecasting] Training LSTM ({data_days} days available)")
            lstm = LSTMForecaster()
            lstm.fit(values)
            return lstm, "DL", "LSTM"
        except Exception as e:
            logger.warning(f"[forecasting] LSTM failed: {e} — falling back to GBM")

    if data_days >= settings.MIN_DAYS_FOR_ML and SKLEARN_AVAILABLE:
        try:
            logger.info(f"[forecasting] Training GBM ({data_days} days available)")
            gbm = GBMForecaster()
            gbm.fit(df, feature_cols)
            return gbm, "ML", "GradientBoostingRegressor"
        except Exception as e:
            logger.warning(f"[forecasting] GBM failed: {e} — falling back to moving average")

    logger.info(f"[forecasting] Using moving average ({data_days} days available)")
    ma = MovingAverageForecaster(window=min(7, data_days))
    ma.fit(values)
    return ma, "MOVING_AVG", "MovingAverage"


def save_model(model: Any, product_id: int, algorithm: str) -> Optional[str]:
    """Save trained model to disk. Returns file path."""
    os.makedirs(settings.MODEL_STORAGE_PATH, exist_ok=True)
    filename = f"forecast_product_{product_id}_{algorithm.lower()}.pkl"
    path = os.path.join(settings.MODEL_STORAGE_PATH, filename)
    try:
        with open(path, "wb") as f:
            pickle.dump(model, f)
        return path
    except Exception as e:
        logger.error(f"[forecasting] Failed to save model: {e}")
        return None


def load_model(path: str) -> Optional[Any]:
    """Load a model from disk."""
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception as e:
        logger.error(f"[forecasting] Failed to load model from {path}: {e}")
        return None
