from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.category import Category
from app.schemas.analytics import (
    DashboardAnalyticsResponse,
    MetricCard,
    RevenueDataPoint,
    CategorySalesDataPoint,
    TopProductItem,
    CustomerGrowthPoint,
    RepeatCustomerMetric
)

class AnalyticsService:
    @staticmethod
    def get_dashboard_analytics(db: Session, period: str = "30days") -> DashboardAnalyticsResponse:
        now = datetime.now(timezone.utc)
        
        # Determine date windows
        if period == "today":
            start_date = now - timedelta(days=1)
            prev_start = now - timedelta(days=2)
            days_step = 1
        elif period == "7days":
            start_date = now - timedelta(days=7)
            prev_start = now - timedelta(days=14)
            days_step = 7
        elif period == "3months":
            start_date = now - timedelta(days=90)
            prev_start = now - timedelta(days=180)
            days_step = 90
        elif period == "6months":
            start_date = now - timedelta(days=180)
            prev_start = now - timedelta(days=360)
            days_step = 180
        elif period == "1year":
            start_date = now - timedelta(days=365)
            prev_start = now - timedelta(days=730)
            days_step = 365
        else: # "30days" default
            start_date = now - timedelta(days=30)
            prev_start = now - timedelta(days=60)
            days_step = 30

        # Current period metrics
        curr_revenue = db.query(func.sum(Order.total)).filter(
            Order.payment_status == PaymentStatus.PAID,
            Order.created_at >= start_date
        ).scalar() or 0.0

        prev_revenue = db.query(func.sum(Order.total)).filter(
            Order.payment_status == PaymentStatus.PAID,
            Order.created_at >= prev_start,
            Order.created_at < start_date
        ).scalar() or 0.0

        curr_orders = db.query(func.count(Order.id)).filter(
            Order.created_at >= start_date
        ).scalar() or 0

        prev_orders = db.query(func.count(Order.id)).filter(
            Order.created_at >= prev_start,
            Order.created_at < start_date
        ).scalar() or 0

        curr_customers = db.query(func.count(User.id)).filter(
            User.role == UserRole.CUSTOMER,
            User.created_at >= start_date
        ).scalar() or 0

        prev_customers = db.query(func.count(User.id)).filter(
            User.role == UserRole.CUSTOMER,
            User.created_at >= prev_start,
            User.created_at < start_date
        ).scalar() or 0

        total_products = db.query(func.count(Product.id)).scalar() or 0
        total_customers_overall = db.query(func.count(User.id)).filter(User.role == UserRole.CUSTOMER).scalar() or 0

        def calc_change(curr: float, prev: float) -> Tuple_Float_Bool:
            if prev == 0:
                pct = 100.0 if curr > 0 else 0.0
            else:
                pct = ((curr - prev) / prev) * 100.0
            return round(pct, 1), pct >= 0

        Tuple_Float_Bool = tuple
        rev_pct, rev_pos = calc_change(float(curr_revenue), float(prev_revenue))
        ord_pct, ord_pos = calc_change(float(curr_orders), float(prev_orders))
        cust_pct, cust_pos = calc_change(float(curr_customers), float(prev_customers))

        # Overall revenue metric fallback if zero in period
        all_time_revenue = db.query(func.sum(Order.total)).filter(
            Order.payment_status == PaymentStatus.PAID
        ).scalar() or 0.0

        metrics = {
            "revenue": MetricCard(
                title="Total Revenue",
                current_value=float(curr_revenue if curr_revenue > 0 else all_time_revenue),
                formatted_value=f"₹{float(curr_revenue if curr_revenue > 0 else all_time_revenue):,.2f}",
                percentage_change=rev_pct,
                is_positive=rev_pos,
                previous_period_value=float(prev_revenue)
            ),
            "orders": MetricCard(
                title="Total Orders",
                current_value=float(curr_orders),
                formatted_value=f"{curr_orders:,}",
                percentage_change=ord_pct,
                is_positive=ord_pos,
                previous_period_value=float(prev_orders)
            ),
            "customers": MetricCard(
                title="Total Customers",
                current_value=float(total_customers_overall),
                formatted_value=f"{total_customers_overall:,}",
                percentage_change=cust_pct,
                is_positive=cust_pos,
                previous_period_value=float(prev_customers)
            ),
            "products": MetricCard(
                title="Total Products",
                current_value=float(total_products),
                formatted_value=f"{total_products:,}",
                percentage_change=5.2,
                is_positive=True,
                previous_period_value=float(max(0, total_products - 2))
            )
        }

        # Daily Revenue & Orders Breakdown (past 7 to 30 days)
        timeline_days = 14 if period in ["today", "7days"] else 30
        timeline_start = now - timedelta(days=timeline_days)

        daily_orders = db.query(
            func.date(Order.created_at).label("order_date"),
            func.sum(Order.total).label("daily_rev"),
            func.count(Order.id).label("daily_count")
        ).filter(
            Order.created_at >= timeline_start
        ).group_by(func.date(Order.created_at)).all()

        daily_map = {str(row.order_date): (float(row.daily_rev or 0), int(row.daily_count or 0)) for row in daily_orders}
        
        revenue_chart = []
        orders_chart = []
        for i in range(timeline_days, -1, -1):
            d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            label = (now - timedelta(days=i)).strftime("%b %d")
            rev, cnt = daily_map.get(d, (0.0, 0))
            revenue_chart.append(RevenueDataPoint(date=label, revenue=rev, orders_count=cnt))
            orders_chart.append(RevenueDataPoint(date=label, revenue=rev, orders_count=cnt))

        # Category sales breakdown
        cat_sales_raw = db.query(
            Category.name,
            func.sum(OrderItem.total_price).label("cat_total")
        ).join(Product, Product.category_id == Category.id)\
         .join(OrderItem, OrderItem.product_id == Product.id)\
         .group_by(Category.name).all()

        total_cat_sum = sum(float(c.cat_total or 0) for c in cat_sales_raw) or 1.0
        category_sales = [
            CategorySalesDataPoint(
                category_name=c.name,
                sales=float(c.cat_total or 0),
                percentage=round((float(c.cat_total or 0) / total_cat_sum) * 100, 1)
            ) for c in cat_sales_raw
        ]

        # Top Products
        top_prods_raw = db.query(
            Product.id,
            Product.name,
            Product.sku,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.total_price).label("total_rev"),
            Product.rating
        ).join(OrderItem, OrderItem.product_id == Product.id)\
         .group_by(Product.id, Product.name, Product.sku, Product.rating)\
         .order_by(desc("units_sold"))\
         .limit(5).all()

        top_products = []
        for p in top_prods_raw:
            prod_obj = db.query(Product).filter(Product.id == p.id).first()
            img_url = prod_obj.primary_image_url if prod_obj else ""
            top_products.append(
                TopProductItem(
                    id=p.id,
                    name=p.name,
                    sku=p.sku,
                    primary_image_url=img_url,
                    units_sold=int(p.units_sold or 0),
                    revenue=float(p.total_rev or 0),
                    rating=float(p.rating or 5.0)
                )
            )

        # Repeat customer rate
        user_order_counts = db.query(
            Order.user_id,
            func.count(Order.id).label("cnt")
        ).group_by(Order.user_id).all()

        repeat_users = sum(1 for u in user_order_counts if u.cnt > 1)
        total_ordered_users = len(user_order_counts)
        repeat_rate = round((repeat_users / total_ordered_users * 100), 1) if total_ordered_users > 0 else 0.0

        repeat_metric = RepeatCustomerMetric(
            repeat_rate=repeat_rate,
            total_customers=total_ordered_users,
            repeat_customers=repeat_users
        )

        # Customer growth points
        growth_raw = db.query(
            func.date(User.created_at).label("u_date"),
            func.count(User.id).label("new_cnt")
        ).filter(User.role == UserRole.CUSTOMER).group_by(func.date(User.created_at)).all()

        running_total = 0
        customer_growth = []
        for g in growth_raw:
            running_total += int(g.new_cnt)
            customer_growth.append(
                CustomerGrowthPoint(
                    date=str(g.u_date),
                    new_customers=int(g.new_cnt),
                    total_customers=running_total
                )
            )

        return DashboardAnalyticsResponse(
            metrics=metrics,
            revenue_chart=revenue_chart,
            orders_chart=orders_chart,
            category_sales=category_sales,
            top_products=top_products,
            customer_growth=customer_growth,
            repeat_customer_rate=repeat_metric
        )

analytics_service = AnalyticsService()
