from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.order import Order, OrderStatus
from app.models.category import Category
from app.schemas.common import ApiResponse, PaginatedApiResponse, PaginatedData
from app.schemas.user import CustomerAdminView, UserStatusUpdate
from app.schemas.product import ProductResponse, ProductDetailResponse, ProductCreate, ProductUpdate
from app.schemas.order import OrderResponse
from app.schemas.analytics import DashboardAnalyticsResponse
from app.services.analytics_service import analytics_service
from app.services.product_service import product_service
from app.services.order_service import order_service
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

class InventoryUpdateRequest(BaseModel):
    stock_quantity: int
    low_stock_threshold: Optional[int] = None

class InventoryItemResponse(BaseModel):
    id: int
    name: str
    sku: str
    primary_image_url: str
    category_name: Optional[str] = None
    current_stock: int
    low_stock_threshold: int
    is_low_stock: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


@router.get("/dashboard", response_model=ApiResponse[DashboardAnalyticsResponse])
def get_admin_dashboard(
    period: str = Query("30days", description="today, 7days, 30days, 3months, 6months, 1year"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    data = analytics_service.get_dashboard_analytics(db, period=period)
    return ApiResponse(
        success=True,
        message="Admin analytics retrieved",
        data=data
    )

@router.get("/products", response_model=PaginatedApiResponse[ProductResponse])
def get_admin_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    sort: str = "newest",
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    items, total = product_service.get_products(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        category_id=category_id,
        sort=sort,
        active_only=False
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedApiResponse(
        success=True,
        message="Admin products retrieved",
        data=PaginatedData(
            items=[ProductResponse.model_validate(p) for p in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    )

@router.get("/products/{product_id}", response_model=ApiResponse[ProductDetailResponse])
def get_admin_product(
    product_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    product = product_service.get_by_id(db, product_id)
    return ApiResponse(
        success=True,
        message="Admin product retrieved",
        data=ProductDetailResponse.model_validate(product)
    )

@router.post("/products", response_model=ApiResponse[ProductDetailResponse], status_code=status.HTTP_201_CREATED)
def create_admin_product(
    prod_in: ProductCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    product = product_service.create_product(db, prod_in)
    return ApiResponse(
        success=True,
        message="Product created successfully",
        data=ProductDetailResponse.model_validate(product)
    )

@router.put("/products/{product_id}", response_model=ApiResponse[ProductDetailResponse])
def update_admin_product(
    product_id: int,
    prod_in: ProductUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    product = product_service.update_product(db, product_id, prod_in)
    return ApiResponse(
        success=True,
        message="Product updated successfully",
        data=ProductDetailResponse.model_validate(product)
    )

@router.delete("/products/{product_id}", response_model=ApiResponse[dict])
def delete_admin_product(
    product_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    product_service.delete_product(db, product_id)
    return ApiResponse(
        success=True,
        message="Product deleted successfully",
        data={"product_id": product_id}
    )

@router.get("/orders", response_model=PaginatedApiResponse[OrderResponse])
def get_admin_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    status_filter: Optional[OrderStatus] = None,
    search: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    items, total = order_service.get_admin_orders(
        db=db,
        page=page,
        page_size=page_size,
        status_filter=status_filter,
        search=search
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedApiResponse(
        success=True,
        message="Admin orders retrieved",
        data=PaginatedData(
            items=[OrderResponse.model_validate(o) for o in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    )

@router.get("/customers", response_model=PaginatedApiResponse[CustomerAdminView])
def get_admin_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    search: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.role == UserRole.CUSTOMER)
    if search:
        query = query.filter(
            or_(
                User.first_name.ilike(f"%{search.strip()}%"),
                User.last_name.ilike(f"%{search.strip()}%"),
                User.email.ilike(f"%{search.strip()}%"),
                User.phone.ilike(f"%{search.strip()}%")
            )
        )

    query = query.order_by(User.created_at.desc())
    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()

    # Pre-fetch order counts and spent
    user_ids = [u.id for u in users]
    orders_data = db.query(
        Order.user_id,
        func.count(Order.id).label("cnt"),
        func.sum(Order.total).label("sum_total")
    ).filter(Order.user_id.in_(user_ids)).group_by(Order.user_id).all()

    stats_map = {row.user_id: (int(row.cnt), float(row.sum_total or 0.0)) for row in orders_data}

    customer_items = []
    for u in users:
        cnt, spent = stats_map.get(u.id, (0, 0.0))
        customer_items.append(
            CustomerAdminView(
                id=u.id,
                first_name=u.first_name,
                last_name=u.last_name,
                email=u.email,
                phone=u.phone,
                role=u.role,
                is_active=u.is_active,
                is_verified=u.is_verified,
                created_at=u.created_at,
                orders_count=cnt,
                total_spent=spent
            )
        )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedApiResponse(
        success=True,
        message="Customers retrieved successfully",
        data=PaginatedData(
            items=customer_items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    )

@router.put("/customers/{customer_id}/status", response_model=ApiResponse[dict])
def update_customer_status(
    customer_id: int,
    status_in: UserStatusUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    customer = db.query(User).filter(User.id == customer_id, User.role == UserRole.CUSTOMER).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    customer.is_active = status_in.is_active
    db.commit()
    return ApiResponse(
        success=True,
        message=f"Customer status updated to {'Active' if customer.is_active else 'Disabled'}",
        data={"customer_id": customer.id, "is_active": customer.is_active}
    )

@router.get("/inventory", response_model=PaginatedApiResponse[InventoryItemResponse])
def get_inventory(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    low_stock_only: bool = False,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Product).options(joinedload(Product.category), joinedload(Product.images))
    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search.strip()}%"),
                Product.sku.ilike(f"%{search.strip()}%")
            )
        )

    if low_stock_only:
        query = query.filter(Product.stock_quantity <= Product.low_stock_threshold)

    query = query.order_by(Product.stock_quantity.asc())
    total = query.count()
    products = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for p in products:
        items.append(
            InventoryItemResponse(
                id=p.id,
                name=p.name,
                sku=p.sku,
                primary_image_url=p.primary_image_url,
                category_name=p.category.name if p.category else None,
                current_stock=p.stock_quantity,
                low_stock_threshold=p.low_stock_threshold,
                is_low_stock=p.stock_quantity <= p.low_stock_threshold,
                is_active=p.is_active
            )
        )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedApiResponse(
        success=True,
        message="Inventory retrieved",
        data=PaginatedData(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    )

@router.put("/inventory/{product_id}", response_model=ApiResponse[InventoryItemResponse])
def update_product_inventory(
    product_id: int,
    inv_in: InventoryUpdateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    product = db.query(Product).options(joinedload(Product.category), joinedload(Product.images)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if inv_in.stock_quantity < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stock quantity cannot be negative")

    product.stock_quantity = inv_in.stock_quantity
    if inv_in.low_stock_threshold is not None:
        product.low_stock_threshold = inv_in.low_stock_threshold

    db.commit()
    db.refresh(product)

    return ApiResponse(
        success=True,
        message="Product inventory successfully updated",
        data=InventoryItemResponse(
            id=product.id,
            name=product.name,
            sku=product.sku,
            primary_image_url=product.primary_image_url,
            category_name=product.category.name if product.category else None,
            current_stock=product.stock_quantity,
            low_stock_threshold=product.low_stock_threshold,
            is_low_stock=product.stock_quantity <= product.low_stock_threshold,
            is_active=product.is_active
        )
    )
