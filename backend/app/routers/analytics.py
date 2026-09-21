from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User
from app.schemas.common import ApiResponse
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])

@router.get("/revenue", response_model=ApiResponse[dict])
def get_revenue_analytics(
    period: str = Query("30days"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    data = analytics_service.get_dashboard_analytics(db, period=period)
    return ApiResponse(
        success=True,
        message="Revenue analytics retrieved",
        data={"chart": data.revenue_chart, "metric": data.metrics["revenue"]}
    )

@router.get("/orders", response_model=ApiResponse[dict])
def get_orders_analytics(
    period: str = Query("30days"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    data = analytics_service.get_dashboard_analytics(db, period=period)
    return ApiResponse(
        success=True,
        message="Orders analytics retrieved",
        data={"chart": data.orders_chart, "metric": data.metrics["orders"]}
    )

@router.get("/customers", response_model=ApiResponse[dict])
def get_customers_analytics(
    period: str = Query("30days"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    data = analytics_service.get_dashboard_analytics(db, period=period)
    return ApiResponse(
        success=True,
        message="Customer growth analytics retrieved",
        data={
            "customer_growth": data.customer_growth,
            "repeat_rate": data.repeat_customer_rate,
            "metric": data.metrics["customers"]
        }
    )

@router.get("/categories", response_model=ApiResponse[dict])
def get_category_sales_analytics(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    data = analytics_service.get_dashboard_analytics(db)
    return ApiResponse(
        success=True,
        message="Category sales breakdown retrieved",
        data={"categories": data.category_sales}
    )
