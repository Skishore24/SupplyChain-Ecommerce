from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.wishlist import Wishlist, WishlistItem
from app.models.product import Product
from app.schemas.common import ApiResponse
from app.schemas.wishlist import WishlistResponse, WishlistItemResponse
from app.services.cart_service import cart_service

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])

def get_or_create_wishlist(db: Session, user_id: int) -> Wishlist:
    wishlist = db.query(Wishlist).filter(Wishlist.user_id == user_id).first()
    if not wishlist:
        wishlist = Wishlist(user_id=user_id)
        db.add(wishlist)
        db.commit()
        db.refresh(wishlist)
    return wishlist

def serialize_wishlist(db: Session, wishlist: Wishlist) -> WishlistResponse:
    items = db.query(WishlistItem).options(
        joinedload(WishlistItem.product).joinedload(Product.images),
        joinedload(WishlistItem.product).joinedload(Product.category)
    ).filter(WishlistItem.wishlist_id == wishlist.id).all()

    item_responses = [WishlistItemResponse.model_validate(i) for i in items if i.product and i.product.is_active]
    return WishlistResponse(
        id=wishlist.id,
        user_id=wishlist.user_id,
        items=item_responses,
        item_count=len(item_responses),
        created_at=wishlist.created_at
    )

@router.get("", response_model=ApiResponse[WishlistResponse])
def get_wishlist(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wishlist = get_or_create_wishlist(db, current_user.id)
    return ApiResponse(
        success=True,
        message="Wishlist retrieved",
        data=serialize_wishlist(db, wishlist)
    )

@router.post("/{product_id}", response_model=ApiResponse[WishlistResponse])
def add_to_wishlist(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    wishlist = get_or_create_wishlist(db, current_user.id)
    existing = db.query(WishlistItem).filter(
        WishlistItem.wishlist_id == wishlist.id,
        WishlistItem.product_id == product_id
    ).first()

    if not existing:
        item = WishlistItem(wishlist_id=wishlist.id, product_id=product_id)
        db.add(item)
        db.commit()

    return ApiResponse(
        success=True,
        message="Product added to wishlist",
        data=serialize_wishlist(db, wishlist)
    )

@router.delete("/{product_id}", response_model=ApiResponse[WishlistResponse])
def remove_from_wishlist(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    wishlist = get_or_create_wishlist(db, current_user.id)
    db.query(WishlistItem).filter(
        WishlistItem.wishlist_id == wishlist.id,
        WishlistItem.product_id == product_id
    ).delete()
    db.commit()

    return ApiResponse(
        success=True,
        message="Product removed from wishlist",
        data=serialize_wishlist(db, wishlist)
    )

@router.post("/{product_id}/move-to-cart", response_model=ApiResponse[dict])
def move_wishlist_item_to_cart(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Add to cart
    cart_service.add_to_cart(db, current_user.id, product_id, quantity=1)
    # Remove from wishlist
    wishlist = get_or_create_wishlist(db, current_user.id)
    db.query(WishlistItem).filter(
        WishlistItem.wishlist_id == wishlist.id,
        WishlistItem.product_id == product_id
    ).delete()
    db.commit()

    return ApiResponse(
        success=True,
        message="Product moved to cart",
        data={"product_id": product_id}
    )
