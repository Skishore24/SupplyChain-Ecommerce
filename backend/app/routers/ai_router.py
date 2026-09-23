"""
AI Router — All /api/ai/* endpoints
=====================================
Exposes the full AI platform via REST:
- Forecasting: trigger, retrieve results
- Inventory intelligence: risk scores, health summary
- Customer intelligence: features, segments, risk
- Alerts: list, acknowledge, resolve
- Anomaly detection: trigger, list events
- Recommendations: list, approve/reject
- Agent chat: orchestrated AI Q&A
- Jobs: status, trigger manually
- Model registry: list versions, metrics
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.dependencies import get_current_admin as get_current_admin_user
from app.models.user import User
from app.models.product import Product
from app.models.ai_models import (
    SupplyChainAlert,
    AlertStatusEnum,
    AnomalyEvent,
    AIRecommendation,
    RecommendationStatusEnum,
    DemandForecast,
    CustomerFeature,
    CustomerSegment,
    CustomerRisk,
    AgentRun,
    AgentRunStatusEnum,
    ModelVersion,
    RiskLevelEnum,
)
from app.services.inventory_service import inventory_intelligence_service
from app.services.aggregation_service import aggregation_service
from app.ai.forecasting.predict import generate_product_forecast, get_stored_forecast
from app.ai.customer_intelligence.customer_features import compute_customer_features
from app.ai.customer_intelligence.segmentation import get_segment_summary, compute_all_segments
from app.ai.customer_intelligence.churn import compute_and_save_risk, compute_all_risks
from app.ai.anomaly.detector import anomaly_detector
from app.jobs.scheduler import get_job_status, job_aggregate_sales, job_run_forecasts, job_detect_anomalies, job_update_customer_intelligence

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Supply Chain Intelligence"])


# ─────────────────────────────────────────────────────────
# Health / Status
# ─────────────────────────────────────────────────────────

@router.get("/status")
def ai_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """AI platform health and feature availability."""
    from app.core.config import settings

    try:
        import sklearn
        sklearn_available = True
    except ImportError:
        sklearn_available = False

    try:
        import torch
        torch_available = True
    except ImportError:
        torch_available = False

    try:
        import chromadb
        chroma_available = True
    except ImportError:
        chroma_available = False

    try:
        import sentence_transformers
        embeddings_available = True
    except ImportError:
        embeddings_available = False

    alert_count = db.query(SupplyChainAlert).filter(SupplyChainAlert.status == AlertStatusEnum.OPEN).count()
    pending_rec_count = db.query(AIRecommendation).filter(AIRecommendation.status == RecommendationStatusEnum.PENDING).count()
    forecast_count = db.query(DemandForecast).count()

    return {
        "status": "operational",
        "features": {
            "forecasting": {"available": True, "engine": "GBM" if sklearn_available else "MovingAverage"},
            "deep_learning": {"available": torch_available, "note": "LSTM (PyTorch)"},
            "customer_intelligence": {"available": True},
            "anomaly_detection": {"available": True},
            "vector_rag": {"available": chroma_available and embeddings_available, "db": "ChromaDB"},
            "llm_chat": {"available": settings.LLM_PROVIDER != "none", "provider": settings.LLM_PROVIDER},
        },
        "data_summary": {
            "open_alerts": alert_count,
            "pending_recommendations": pending_rec_count,
            "stored_forecasts": forecast_count,
        },
        "jobs": get_job_status(),
    }


# ─────────────────────────────────────────────────────────
# Inventory Intelligence
# ─────────────────────────────────────────────────────────

@router.get("/inventory/health")
def inventory_health_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Aggregate inventory health metrics for the supply chain dashboard."""
    return inventory_intelligence_service.get_inventory_health_summary(db)


@router.get("/inventory/risk")
def inventory_risk_list(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List all products sorted by stockout risk (highest first)."""
    items = inventory_intelligence_service.get_all_products_risk(db, limit=limit)
    return {"total": len(items), "items": items}


@router.get("/inventory/{product_id}/intelligence")
def product_inventory_intelligence(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Full inventory intelligence report for a single product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return inventory_intelligence_service.get_product_inventory_intelligence(db, product)


# ─────────────────────────────────────────────────────────
# Demand Forecasting
# ─────────────────────────────────────────────────────────

@router.get("/forecasting/{product_id}")
def get_product_forecast(
    product_id: int,
    horizon_days: int = Query(30, ge=7, le=90),
    force_retrain: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get demand forecast for a product.
    Returns cached forecast if available, otherwise trains a new model.
    """
    if not force_retrain:
        cached = get_stored_forecast(db, product_id, horizon_days)
        if cached:
            return cached

    return generate_product_forecast(db, product_id, horizon_days, force_retrain)


@router.post("/forecasting/run-all")
def run_all_forecasts(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Trigger demand forecasting for all products (runs in background)."""
    background_tasks.add_task(job_run_forecasts)
    return {"message": "Forecasting job started in background", "started_at": datetime.now(timezone.utc).isoformat()}


# ─────────────────────────────────────────────────────────
# Supply Chain Alerts
# ─────────────────────────────────────────────────────────

@router.get("/alerts")
def list_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List supply chain alerts with filtering."""
    query = db.query(SupplyChainAlert)
    if status:
        query = query.filter(SupplyChainAlert.status == status)
    if severity:
        query = query.filter(SupplyChainAlert.severity == severity)
    if entity_type:
        query = query.filter(SupplyChainAlert.entity_type == entity_type)

    total = query.count()
    alerts = query.order_by(SupplyChainAlert.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "alerts": [
            {
                "id": a.id,
                "alert_type": a.alert_type.value,
                "severity": a.severity.value,
                "title": a.title,
                "description": a.description,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "entity_name": a.entity_name,
                "status": a.status.value,
                "evidence": a.evidence,
                "created_at": a.created_at.isoformat(),
                "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            }
            for a in alerts
        ],
    }


class AlertActionRequest(BaseModel):
    action: str = Field(..., pattern="^(acknowledge|resolve|dismiss)$")


@router.patch("/alerts/{alert_id}")
def update_alert(
    alert_id: int,
    body: AlertActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Acknowledge, resolve, or dismiss an alert."""
    alert = db.query(SupplyChainAlert).filter(SupplyChainAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    now = datetime.now(timezone.utc)
    if body.action == "acknowledge":
        alert.status = AlertStatusEnum.ACKNOWLEDGED
        alert.acknowledged_by_id = current_user.id
        alert.acknowledged_at = now
    elif body.action == "resolve":
        alert.status = AlertStatusEnum.RESOLVED
        alert.resolved_at = now
    elif body.action == "dismiss":
        alert.status = AlertStatusEnum.DISMISSED

    db.commit()
    return {"message": f"Alert {body.action}d", "alert_id": alert_id}


# ─────────────────────────────────────────────────────────
# Anomaly Events
# ─────────────────────────────────────────────────────────

@router.get("/anomalies")
def list_anomalies(
    entity_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List detected anomaly events."""
    query = db.query(AnomalyEvent)
    if entity_type:
        query = query.filter(AnomalyEvent.entity_type == entity_type)
    anomalies = query.order_by(AnomalyEvent.detected_at.desc()).limit(limit).all()
    return [
        {
            "id": a.id,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "entity_name": a.entity_name,
            "anomaly_type": a.anomaly_type,
            "severity": a.severity.value,
            "detected_at": a.detected_at.isoformat(),
            "evidence": a.evidence,
            "recommendation": a.recommendation,
        }
        for a in anomalies
    ]


@router.post("/anomalies/detect")
def run_anomaly_detection(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Trigger anomaly detection scan (runs in background)."""
    background_tasks.add_task(job_detect_anomalies)
    return {"message": "Anomaly detection started", "started_at": datetime.now(timezone.utc).isoformat()}


# ─────────────────────────────────────────────────────────
# Customer Intelligence
# ─────────────────────────────────────────────────────────

@router.get("/customers/segments/summary")
def customer_segment_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Summary of customer segments for the dashboard."""
    return get_segment_summary(db)


@router.get("/customers/{user_id}/intelligence")
def customer_intelligence(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Full customer intelligence profile."""
    features = db.query(CustomerFeature).filter(CustomerFeature.user_id == user_id).first()
    segment = db.query(CustomerSegment).filter(CustomerSegment.user_id == user_id).first()
    risk = db.query(CustomerRisk).filter(CustomerRisk.user_id == user_id).first()

    if not features and not segment:
        raise HTTPException(status_code=404, detail="No intelligence data for this customer")

    return {
        "user_id": user_id,
        "features": {
            "recency_days": features.recency_days,
            "frequency": features.frequency,
            "monetary_value": float(features.monetary_value or 0),
            "avg_order_value": float(features.avg_order_value or 0),
            "return_rate": features.return_rate,
            "discount_usage_rate": features.discount_usage_rate,
            "avg_days_between_orders": features.avg_days_between_orders,
        } if features else None,
        "segment": {
            "segment": segment.segment.value,
            "rfm_scores": {
                "recency": segment.rfm_recency_score,
                "frequency": segment.rfm_frequency_score,
                "monetary": segment.rfm_monetary_score,
                "total": segment.rfm_total_score,
            },
            "computed_at": segment.computed_at.isoformat(),
        } if segment else None,
        "risk": {
            "risk_score": risk.risk_score,
            "risk_level": risk.risk_level.value,
            "reason_codes": risk.reason_codes,
            "model_source": risk.model_source,
            "computed_at": risk.computed_at.isoformat(),
        } if risk else None,
    }


@router.get("/customers/at-risk")
def customers_at_risk(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List customers with HIGH or CRITICAL churn risk."""
    risks = (
        db.query(CustomerRisk)
        .filter(CustomerRisk.risk_level.in_([RiskLevelEnum.HIGH, RiskLevelEnum.CRITICAL]))
        .order_by(CustomerRisk.risk_score.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "user_id": r.user_id,
            "risk_score": r.risk_score,
            "risk_level": r.risk_level.value,
            "reason_codes": r.reason_codes,
            "computed_at": r.computed_at.isoformat(),
        }
        for r in risks
    ]


@router.post("/customers/update-intelligence")
def update_customer_intelligence(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin_user),
):
    """Trigger customer intelligence update (features, segments, risk)."""
    background_tasks.add_task(job_update_customer_intelligence)
    return {"message": "Customer intelligence update started", "started_at": datetime.now(timezone.utc).isoformat()}


# ─────────────────────────────────────────────────────────
# AI Recommendations
# ─────────────────────────────────────────────────────────

@router.get("/recommendations")
def list_recommendations(
    status: Optional[str] = Query("PENDING"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List AI recommendations with optional status filter."""
    query = db.query(AIRecommendation)
    if status:
        query = query.filter(AIRecommendation.status == status)
    recs = query.order_by(AIRecommendation.created_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "rec_type": r.rec_type,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "entity_name": r.entity_name,
            "title": r.title,
            "reason": r.reason,
            "evidence": r.evidence,
            "calculations": r.calculations,
            "recommended_action": r.recommended_action,
            "confidence": r.confidence,
            "urgency": r.urgency.value,
            "status": r.status.value,
            "created_at": r.created_at.isoformat(),
        }
        for r in recs
    ]


class RecommendationReviewRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    rejection_reason: Optional[str] = None


@router.patch("/recommendations/{rec_id}/review")
def review_recommendation(
    rec_id: int,
    body: RecommendationReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Approve or reject an AI recommendation.
    CRITICAL: No financial action is taken without explicit approval here.
    """
    rec = db.query(AIRecommendation).filter(AIRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    if rec.status != RecommendationStatusEnum.PENDING:
        raise HTTPException(status_code=400, detail=f"Recommendation is already {rec.status.value}")

    now = datetime.now(timezone.utc)
    if body.action == "approve":
        rec.status = RecommendationStatusEnum.APPROVED
    else:
        rec.status = RecommendationStatusEnum.REJECTED
        rec.rejection_reason = body.rejection_reason

    rec.reviewed_by_id = current_user.id
    rec.reviewed_at = now

    db.commit()
    return {
        "message": f"Recommendation {body.action}d",
        "rec_id": rec_id,
        "reviewed_at": now.isoformat(),
    }


# ─────────────────────────────────────────────────────────
# Background Jobs
# ─────────────────────────────────────────────────────────

@router.get("/jobs/status")
def jobs_status(current_user: User = Depends(get_current_admin_user)):
    """Get background job schedule and next run times."""
    return {"jobs": get_job_status()}


@router.post("/jobs/trigger/{job_name}")
def trigger_job(
    job_name: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin_user),
):
    """Manually trigger a background job."""
    job_map = {
        "aggregate_sales": job_aggregate_sales,
        "run_forecasts": job_run_forecasts,
        "detect_anomalies": job_detect_anomalies,
        "customer_intelligence": job_update_customer_intelligence,
    }
    if job_name not in job_map:
        raise HTTPException(status_code=404, detail=f"Unknown job: {job_name}. Valid: {list(job_map.keys())}")

    background_tasks.add_task(job_map[job_name])
    return {"message": f"Job '{job_name}' triggered", "started_at": datetime.now(timezone.utc).isoformat()}


# ─────────────────────────────────────────────────────────
# Model Registry
# ─────────────────────────────────────────────────────────

@router.get("/models")
def list_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List all model versions in the registry."""
    models = db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).all()
    return [
        {
            "id": m.id,
            "model_name": m.model_name,
            "model_type": m.model_type.value,
            "version": m.version,
            "algorithm": m.algorithm,
            "is_active": m.is_active,
            "metrics": m.metrics,
            "trained_at": m.trained_at.isoformat() if m.trained_at else None,
        }
        for m in models
    ]


# ─────────────────────────────────────────────────────────
# Conversational AI Agent Chat & Autonomous Procurement
# ─────────────────────────────────────────────────────────

class AIChatRequest(BaseModel):
    query: str


@router.post("/chat")
def ai_agent_chat(
    payload: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Direct interactive Q&A with the autonomous Supply Chain Intelligence agent.
    Executes live analytical tools and answers with real platform data.
    """
    from app.ai.agents.supply_chain_agent import supply_chain_agent
    return supply_chain_agent.answer_query(db, payload.query)


@router.post("/procurement/reorder/generate")
def trigger_reorder_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Scan inventory and generate procurement reorder recommendations for approval."""
    from app.ai.procurement.reorder import generate_reorder_recommendations
    created = generate_reorder_recommendations(db)
    return {"created_count": len(created), "recommendations": created}
