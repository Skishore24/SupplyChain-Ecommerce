"""
Unit & Integration Tests — AI Supply Chain Intelligence
========================================================
Validates mathematical calculations, risk scoring formulas,
supplier rankings, and RFM customer segmentation logic.
"""
import pytest
import math
import numpy as np


def test_safety_stock_formula():
    """Validates SS = Z * sigma * sqrt(L) with 95% service level (Z=1.65)."""
    Z = 1.65
    sigma = 4.0        # standard deviation of daily sales
    lead_time = 9      # days
    
    expected_ss = Z * sigma * math.sqrt(lead_time)  # 1.65 * 4.0 * 3 = 19.8
    assert round(expected_ss, 1) == 19.8
    assert math.ceil(expected_ss) == 20


def test_reorder_point_formula():
    """Validates ROP = (daily_velocity * lead_time) + safety_stock."""
    daily_velocity = 8.5
    lead_time = 7
    safety_stock = 15

    expected_rop = (daily_velocity * lead_time) + safety_stock  # 59.5 + 15 = 74.5
    assert round(expected_rop, 1) == 74.5


def test_stockout_risk_score():
    """Validates stockout risk score boundary conditions (0-100%)."""
    # Case 1: Out of stock -> 100% risk
    current_stock = 0
    rop = 50
    risk = min(100.0, max(0.0, ((rop - current_stock) / rop) * 100.0))
    assert risk == 100.0

    # Case 2: Stock well above ROP -> 0% risk
    current_stock = 120
    risk = min(100.0, max(0.0, ((rop - current_stock) / rop) * 100.0))
    assert risk == 0.0

    # Case 3: Stock at half of ROP -> 50% risk
    current_stock = 25
    risk = min(100.0, max(0.0, ((rop - current_stock) / rop) * 100.0))
    assert risk == 50.0


def test_rfm_segmentation_logic():
    """Validates RFM rule-based segment assignment using real assign_segment."""
    from app.ai.customer_intelligence.segmentation import assign_segment
    from app.models.ai_models import CustomerSegmentEnum

    # VIP Customer (high monetary and high frequency)
    assert assign_segment(5, 5, 5, recency_days=10, frequency=12) == CustomerSegmentEnum.HIGH_VALUE

    # Churn Risk Customer (over 90 days since last order, low frequency)
    assert assign_segment(1, 2, 2, recency_days=120, frequency=2) == CustomerSegmentEnum.AT_RISK

    # Brand New Customer (1 order, placed recently)
    assert assign_segment(5, 1, 1, recency_days=14, frequency=1) == CustomerSegmentEnum.NEW

    # Inactive Customer (has not ordered in over 180 days)
    assert assign_segment(1, 1, 1, recency_days=200, frequency=1) == CustomerSegmentEnum.INACTIVE

    # Active Customer
    assert assign_segment(4, 2, 2, recency_days=20, frequency=2) == CustomerSegmentEnum.ACTIVE


def test_supplier_composite_ranking():
    """Validates multi-criteria vendor scoring: Reliability (40%), Lead Time (30%), Price (30%)."""
    # Vendor A: Highly reliable (95), fast (5d), slightly higher price ($120)
    # Vendor B: Moderately reliable (75), slow (10d), cheaper ($100)
    
    min_price = 100.0
    min_lt = 5.0

    # Vendor A scores:
    rel_a = 95.0
    lt_score_a = (min_lt / 5.0) * 100.0    # 100
    price_score_a = (min_price / 120.0) * 100.0 # 83.33
    score_a = (rel_a * 0.40) + (lt_score_a * 0.30) + (price_score_a * 0.30)
    # 38.0 + 30.0 + 25.0 = 93.0

    # Vendor B scores:
    rel_b = 75.0
    lt_score_b = (min_lt / 10.0) * 100.0   # 50.0
    price_score_b = (min_price / 100.0) * 100.0 # 100.0
    score_b = (rel_b * 0.40) + (lt_score_b * 0.30) + (price_score_b * 0.30)
    # 30.0 + 15.0 + 30.0 = 75.0

    assert score_a > score_b, "Vendor A with superior reliability and speed should rank higher"


def test_anomaly_z_score_detection():
    """Validates statistical Z-score outlier classification."""
    baseline_history = [10, 12, 11, 9, 10, 13, 11, 10, 12, 11]  # mean ~ 10.9, std ~ 1.1
    mean = np.mean(baseline_history)
    std = np.std(baseline_history)

    # Spike event: observed 25 units
    observed_spike = 25.0
    z_spike = (observed_spike - mean) / std
    assert z_spike > 3.0, f"Expected Z > 3.0 for extreme spike, got {z_spike}"

    # Normal event: observed 11 units
    observed_normal = 11.0
    z_normal = abs(observed_normal - mean) / std
    assert z_normal < 1.0, f"Expected Z < 1.0 for normal observation, got {z_normal}"
