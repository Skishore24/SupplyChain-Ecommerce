from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedApiResponse, PaginatedData
from app.schemas.product import (
    ProductResponse,
    ProductDetailResponse,
    ProductCreate,
    ProductUpdate
)
from app.services.product_service import product_service

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=PaginatedApiResponse[ProductResponse])
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    category_id: Optional[int] = None,
    brand: Optional[str] = None,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    rating: Optional[float] = None,
    in_stock: Optional[bool] = None,
    sort: str = Query("featured", description="featured, newest, price_asc, price_desc, rating, popular"),
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    items, total = product_service.get_products(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        category_slug=category,
        category_id=category_id,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        min_rating=rating,
        in_stock=in_stock,
        sort=sort,
        active_only=active_only
    )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    data = PaginatedData(
        items=[ProductResponse.model_validate(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
    return PaginatedApiResponse(
        success=True,
        message="Products retrieved successfully",
        data=data
    )

@router.get("/featured", response_model=ApiResponse[List[ProductResponse]])
def get_featured_products(limit: int = 8, db: Session = Depends(get_db)):
    items, _ = product_service.get_products(db=db, page=1, page_size=limit, sort="popular", active_only=True)
    return ApiResponse(
        success=True,
        message="Featured products retrieved",
        data=[ProductResponse.model_validate(p) for p in items]
    )

@router.get("/new-arrivals", response_model=ApiResponse[List[ProductResponse]])
def get_new_arrivals(limit: int = 8, db: Session = Depends(get_db)):
    items, _ = product_service.get_products(db=db, page=1, page_size=limit, sort="newest", active_only=True)
    return ApiResponse(
        success=True,
        message="New arrivals retrieved",
        data=[ProductResponse.model_validate(p) for p in items]
    )

@router.get("/slug/{slug}", response_model=ApiResponse[ProductDetailResponse])
def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    product = product_service.get_by_slug(db, slug)
    return ApiResponse(
        success=True,
        message="Product detail retrieved",
        data=ProductDetailResponse.model_validate(product)
    )

@router.get("/{product_id}", response_model=ApiResponse[ProductDetailResponse])
def get_product_by_id(product_id: int, db: Session = Depends(get_db)):
    product = product_service.get_by_id(db, product_id)
    return ApiResponse(
        success=True,
        message="Product retrieved",
        data=ProductDetailResponse.model_validate(product)
    )

@router.post("", response_model=ApiResponse[ProductDetailResponse], status_code=status.HTTP_201_CREATED)
def create_product(
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

@router.put("/{product_id}", response_model=ApiResponse[ProductDetailResponse])
def update_product(
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

@router.delete("/{product_id}", response_model=ApiResponse[dict])
def delete_product(
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
