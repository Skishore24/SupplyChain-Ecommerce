from typing import List, Dict, Any, Optional
from decimal import Decimal
from pydantic import BaseModel

class MetricCard(BaseModel):
    title: str
    current_value: float
    formatted_value: str
    percentage_change: float
    is_positive: bool
    previous_period_value: float

class RevenueDataPoint(BaseModel):
    date: str
    revenue: float
    orders_count: int

class CategorySalesDataPoint(BaseModel):
    category_name: str
    sales: float
    percentage: float

class TopProductItem(BaseModel):
    id: int
    name: str
    sku: str
    primary_image_url: str
    units_sold: int
    revenue: float
    rating: float

class CustomerGrowthPoint(BaseModel):
    date: str
    new_customers: int
    total_customers: int

class RepeatCustomerMetric(BaseModel):
    repeat_rate: float
    total_customers: int
    repeat_customers: int

class DashboardAnalyticsResponse(BaseModel):
    metrics: Dict[str, MetricCard]
    revenue_chart: List[RevenueDataPoint]
    orders_chart: List[RevenueDataPoint]
    category_sales: List[CategorySalesDataPoint]
    top_products: List[TopProductItem]
    customer_growth: List[CustomerGrowthPoint]
    repeat_customer_rate: RepeatCustomerMetric
