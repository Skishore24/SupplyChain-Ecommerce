from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.models.user import User
from app.models.review import Review, ReviewStatus
from app.models.product import Product
from app.schemas.common import ApiResponse, PaginatedApiResponse, PaginatedData
from app.schemas.review import ReviewResponse, ReviewCreate, ReviewStatusUpdate

router = APIRouter(tags=["Reviews"])

@router.get("/products/{product_id}/reviews", response_model=PaginatedApiResponse[ReviewResponse])
def get_product_reviews(
    product_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    query = db.query(Review).options(
        joinedload(Review.user)
    ).filter(
        Review.product_id == product_id,
        Review.status == ReviewStatus.APPROVED
    ).order_by(Review.created_at.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedApiResponse(
        success=True,
        message="Reviews retrieved successfully",
        data=PaginatedData(
            items=[ReviewResponse.model_validate(r) for r in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    )

@router.post("/products/{product_id}/reviews", response_model=ApiResponse[ReviewResponse], status_code=status.HTTP_201_CREATED)
def create_product_review(
    product_id: int,
    review_in: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    review = Review(
        user_id=current_user.id,
        product_id=product_id,
        order_id=review_in.order_id,
        rating=review_in.rating,
        comment=review_in.comment,
        status=ReviewStatus.APPROVED
    )
    db.add(review)
    db.flush()

    # Recalculate product rating and review count
    stats = db.query(
        func.avg(Review.rating).label("avg_rating"),
        func.count(Review.id).label("count")
    ).filter(
        Review.product_id == product_id,
        Review.status == ReviewStatus.APPROVED
    ).first()

    if stats and stats.count:
        product.rating = round(float(stats.avg_rating), 1)
        product.review_count = int(stats.count)

    db.commit()
    db.refresh(review)

    return ApiResponse(
        success=True,
        message="Thank you! Your review has been submitted.",
        data=ReviewResponse.model_validate(review)
    )

@router.get("/reviews", response_model=PaginatedApiResponse[ReviewResponse])
def get_admin_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=50),
    status_filter: Optional[ReviewStatus] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Review).options(
        joinedload(Review.user),
        joinedload(Review.product).joinedload(Product.images)
    )
    if status_filter:
        query = query.filter(Review.status == status_filter)

    query = query.order_by(Review.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedApiResponse(
        success=True,
        message="Admin reviews retrieved",
        data=PaginatedData(
            items=[ReviewResponse.model_validate(r) for r in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    )

@router.put("/reviews/{review_id}/status", response_model=ApiResponse[ReviewResponse])
def update_review_status(
    review_id: int,
    status_in: ReviewStatusUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    review.status = status_in.status
    db.commit()
    db.refresh(review)

    # Recalculate product rating
    stats = db.query(
        func.avg(Review.rating).label("avg_rating"),
        func.count(Review.id).label("count")
    ).filter(
        Review.product_id == review.product_id,
        Review.status == ReviewStatus.APPROVED
    ).first()

    prod = db.query(Product).filter(Product.id == review.product_id).first()
    if prod:
        prod.rating = round(float(stats.avg_rating or 0.0), 1)
        prod.review_count = int(stats.count or 0)
        db.commit()

    return ApiResponse(
        success=True,
        message="Review status updated successfully",
        data=ReviewResponse.model_validate(review)
    )

@router.delete("/reviews/{review_id}", response_model=ApiResponse[dict])
def delete_review(
    review_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    prod_id = review.product_id
    db.delete(review)
    db.commit()

    # Recalculate
    stats = db.query(
        func.avg(Review.rating).label("avg_rating"),
        func.count(Review.id).label("count")
    ).filter(
        Review.product_id == prod_id,
        Review.status == ReviewStatus.APPROVED
    ).first()
    prod = db.query(Product).filter(Product.id == prod_id).first()
    if prod:
        prod.rating = round(float(stats.avg_rating or 0.0), 1)
        prod.review_count = int(stats.count or 0)
        db.commit()

    return ApiResponse(success=True, message="Review deleted successfully", data={"review_id": review_id})
