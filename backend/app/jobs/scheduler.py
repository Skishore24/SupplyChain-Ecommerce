"""
Background Job Scheduler
=========================
APScheduler-based daily job runner.
All jobs are idempotent — safe to re-run.
Jobs run on UTC schedule, typically overnight.

Jobs:
1. 01:00 UTC — Aggregate yesterday's sales
2. 02:00 UTC — Run demand forecasts for all products
3. 03:00 UTC — Anomaly detection scan
4. 04:00 UTC — Customer intelligence update (features, segments, risk)
"""
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone="UTC")


def _get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def job_aggregate_sales():
    """Daily sales aggregation for yesterday."""
    logger.info("[job] Starting: aggregate_sales")
    db = SessionLocal()
    try:
        from app.services.aggregation_service import aggregation_service
        count = aggregation_service.aggregate_daily_sales(db)
        aggregation_service.create_inventory_snapshot(db)
        logger.info(f"[job] aggregate_sales complete: {count} records")
    except Exception as e:
        logger.error(f"[job] aggregate_sales failed: {e}", exc_info=True)
    finally:
        db.close()


def job_run_forecasts():
    """Demand forecasting for all active products."""
    logger.info("[job] Starting: run_forecasts")
    db = SessionLocal()
    try:
        from app.models.product import Product
        from app.ai.forecasting.predict import generate_product_forecast

        products = db.query(Product).filter(Product.is_active == True).all()
        success = 0
        for product in products:
            try:
                generate_product_forecast(db, product.id, horizon_days=30)
                success += 1
            except Exception as e:
                logger.warning(f"[job] Forecast failed for product {product.id}: {e}")
        logger.info(f"[job] run_forecasts complete: {success}/{len(products)} products")
    except Exception as e:
        logger.error(f"[job] run_forecasts failed: {e}", exc_info=True)
    finally:
        db.close()


def job_detect_anomalies():
    """Run anomaly detection on demand and inventory."""
    logger.info("[job] Starting: detect_anomalies")
    db = SessionLocal()
    try:
        from app.ai.anomaly.detector import anomaly_detector
        results = anomaly_detector.run_all_detections(db)
        logger.info(f"[job] detect_anomalies complete: {results}")
    except Exception as e:
        logger.error(f"[job] detect_anomalies failed: {e}", exc_info=True)
    finally:
        db.close()


def job_update_customer_intelligence():
    """Update customer features, segments, and churn risk."""
    logger.info("[job] Starting: customer_intelligence")
    db = SessionLocal()
    try:
        from app.ai.customer_intelligence.customer_features import compute_all_customer_features
        from app.ai.customer_intelligence.segmentation import compute_all_segments
        from app.ai.customer_intelligence.churn import compute_all_risks

        feat_count = compute_all_customer_features(db)
        seg_count = compute_all_segments(db)
        risk_count = compute_all_risks(db)
        logger.info(f"[job] customer_intelligence complete: {feat_count} features, {seg_count} segments, {risk_count} risk scores")
    except Exception as e:
        logger.error(f"[job] customer_intelligence failed: {e}", exc_info=True)
    finally:
        db.close()


def start_scheduler():
    """Initialize and start all background jobs."""
    if not settings.ENABLE_BACKGROUND_JOBS:
        logger.info("[scheduler] Background jobs disabled (ENABLE_BACKGROUND_JOBS=false)")
        return

    logger.info("[scheduler] Starting background scheduler")

    _scheduler.add_job(
        job_aggregate_sales,
        CronTrigger(hour=settings.JOB_AGGREGATION_HOUR, minute=0),
        id="aggregate_sales",
        name="Daily Sales Aggregation",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=3600,
    )

    _scheduler.add_job(
        job_run_forecasts,
        CronTrigger(hour=settings.JOB_FORECAST_HOUR, minute=0),
        id="run_forecasts",
        name="Demand Forecasting",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=3600,
    )

    _scheduler.add_job(
        job_detect_anomalies,
        CronTrigger(hour=settings.JOB_ANOMALY_HOUR, minute=0),
        id="detect_anomalies",
        name="Anomaly Detection",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=3600,
    )

    _scheduler.add_job(
        job_update_customer_intelligence,
        CronTrigger(hour=4, minute=0),
        id="customer_intelligence",
        name="Customer Intelligence Update",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=3600,
    )

    _scheduler.start()
    logger.info("[scheduler] All jobs scheduled")


def stop_scheduler():
    """Gracefully stop the scheduler."""
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[scheduler] Stopped")


def get_job_status() -> list:
    """Return current job status for the admin API."""
    if not _scheduler.running:
        return [{"status": "scheduler_not_running"}]

    jobs = []
    for job in _scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
        })
    return jobs
