from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.category import CategoryResponse, CategoryCreate, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=ApiResponse[List[CategoryResponse]])
def get_categories(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(Category)
    if active_only:
        query = query.filter(Category.is_active == True)
    categories = query.order_by(Category.display_order.asc(), Category.name.asc()).all()

    # Product counts per category
    counts_raw = db.query(Product.category_id, func.count(Product.id)).filter(Product.is_active == True).group_by(Product.category_id).all()
    counts_map = {c[0]: c[1] for c in counts_raw if c[0] is not None}

    result = []
    for cat in categories:
        resp = CategoryResponse.model_validate(cat)
        resp.product_count = counts_map.get(cat.id, 0)
        result.append(resp)

    return ApiResponse(
        success=True,
        message="Categories retrieved successfully",
        data=result
    )

@router.get("/{category_id}", response_model=ApiResponse[CategoryResponse])
def get_category_by_id(category_id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    count = db.query(func.count(Product.id)).filter(Product.category_id == cat.id, Product.is_active == True).scalar() or 0
    resp = CategoryResponse.model_validate(cat)
    resp.product_count = count
    return ApiResponse(success=True, message="Category retrieved", data=resp)

@router.get("/slug/{slug}", response_model=ApiResponse[CategoryResponse])
def get_category_by_slug(slug: str, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.slug == slug).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    count = db.query(func.count(Product.id)).filter(Product.category_id == cat.id, Product.is_active == True).scalar() or 0
    resp = CategoryResponse.model_validate(cat)
    resp.product_count = count
    return ApiResponse(success=True, message="Category retrieved", data=resp)

@router.post("", response_model=ApiResponse[CategoryResponse], status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if db.query(Category).filter(Category.slug == cat_in.slug).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Category with slug '{cat_in.slug}' already exists")

    cat = Category(
        name=cat_in.name,
        slug=cat_in.slug,
        description=cat_in.description,
        image_url=cat_in.image_url,
        display_order=cat_in.display_order,
        is_active=cat_in.is_active
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return ApiResponse(success=True, message="Category created successfully", data=CategoryResponse.model_validate(cat))

@router.put("/{category_id}", response_model=ApiResponse[CategoryResponse])
def update_category(
    category_id: int,
    cat_in: CategoryUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    update_data = cat_in.model_dump(exclude_unset=True)
    if "slug" in update_data and update_data["slug"] != cat.slug:
        if db.query(Category).filter(Category.slug == update_data["slug"], Category.id != cat.id).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Slug '{update_data['slug']}' is already in use")

    for field, val in update_data.items():
        setattr(cat, field, val)

    db.commit()
    db.refresh(cat)
    return ApiResponse(success=True, message="Category updated successfully", data=CategoryResponse.model_validate(cat))

@router.delete("/{category_id}", response_model=ApiResponse[dict])
def delete_category(
    category_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    db.delete(cat)
    db.commit()
    return ApiResponse(success=True, message="Category deleted successfully", data={"category_id": category_id})
