from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.coupon import Coupon, DiscountType
from app.schemas.cart import CartResponse, CartItemResponse

class CartService:
    @staticmethod
    def get_or_create_cart(db: Session, user_id: int) -> Cart:
        cart = db.query(Cart).filter(Cart.user_id == user_id).first()
        if not cart:
            cart = Cart(user_id=user_id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        return cart

    @staticmethod
    def add_to_cart(db: Session, user_id: int, product_id: int, quantity: int = 1) -> Cart:
        if quantity <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be at least 1")

        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        if not product.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This product is currently unavailable")
        if product.stock_quantity < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {product.stock_quantity} units available in stock"
            )

        cart = CartService.get_or_create_cart(db, user_id)
        existing_item = db.query(CartItem).filter(
            CartItem.cart_id == cart.id,
            CartItem.product_id == product_id
        ).first()

        if existing_item:
            new_qty = existing_item.quantity + quantity
            if new_qty > product.stock_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot add {quantity} more. Stock limit of {product.stock_quantity} reached."
                )
            existing_item.quantity = new_qty
            existing_item.price_at_time = product.price
        else:
            cart_item = CartItem(
                cart_id=cart.id,
                product_id=product.id,
                quantity=quantity,
                price_at_time=product.price
            )
            db.add(cart_item)

        db.commit()
        db.refresh(cart)
        return cart

    @staticmethod
    def update_cart_item(db: Session, user_id: int, item_id: int, quantity: int) -> Cart:
        cart = CartService.get_or_create_cart(db, user_id)
        item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

        if quantity <= 0:
            db.delete(item)
            db.commit()
            return cart

        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product or not product.is_active:
            db.delete(item)
            db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product is no longer available")

        if quantity > product.stock_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requested quantity exceeds stock limit of {product.stock_quantity}"
            )

        item.quantity = quantity
        item.price_at_time = product.price
        db.commit()
        return cart

    @staticmethod
    def remove_cart_item(db: Session, user_id: int, item_id: int) -> Cart:
        cart = CartService.get_or_create_cart(db, user_id)
        item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
        if item:
            db.delete(item)
            db.commit()
        return cart

    @staticmethod
    def clear_cart(db: Session, user_id: int) -> None:
        cart = CartService.get_or_create_cart(db, user_id)
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()

    @staticmethod
    def calculate_cart_totals(db: Session, user_id: int, coupon_code: Optional[str] = None) -> CartResponse:
        cart = db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.images),
            joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.category)
        ).filter(Cart.user_id == user_id).first()

        if not cart:
            cart = CartService.get_or_create_cart(db, user_id)

        subtotal = Decimal("0.00")
        item_responses = []
        total_items = 0

        for item in cart.items:
            # Revalidate active and price
            if item.product and item.product.is_active:
                line_subtotal = item.product.price * item.quantity
                subtotal += line_subtotal
                total_items += item.quantity
                item_responses.append(
                    CartItemResponse(
                        id=item.id,
                        cart_id=item.cart_id,
                        product_id=item.product_id,
                        quantity=item.quantity,
                        price_at_time=item.product.price,
                        product=item.product,
                        subtotal=line_subtotal,
                        created_at=item.created_at,
                        updated_at=item.updated_at
                    )
                )

        # Shipping: free if subtotal >= 100, else $15 (or 0 if cart is empty)
        shipping = Decimal("0.00") if (subtotal >= 100 or subtotal == 0) else Decimal("15.00")

        # Discount calculation
        discount = Decimal("0.00")
        valid_coupon = None
        if coupon_code and subtotal > 0:
            coupon = db.query(Coupon).filter(
                Coupon.code == coupon_code.strip().upper(),
                Coupon.is_active == True
            ).first()
            if coupon and subtotal >= coupon.minimum_order and coupon.used_count < coupon.usage_limit:
                valid_coupon = coupon.code
                if coupon.discount_type == DiscountType.PERCENTAGE:
                    discount = (subtotal * coupon.discount_value) / Decimal("100.00")
                else:
                    discount = coupon.discount_value
                if coupon.maximum_discount and discount > coupon.maximum_discount:
                    discount = coupon.maximum_discount
                if discount > subtotal:
                    discount = subtotal

        # Tax: 8% on discounted subtotal
        taxable_amount = max(Decimal("0.00"), subtotal - discount)
        tax = (taxable_amount * Decimal("0.08")).quantize(Decimal("0.01"))
        total = (taxable_amount + shipping + tax).quantize(Decimal("0.01"))

        return CartResponse(
            id=cart.id,
            user_id=cart.user_id,
            items=item_responses,
            item_count=total_items,
            subtotal=subtotal.quantize(Decimal("0.01")),
            discount=discount.quantize(Decimal("0.01")),
            shipping=shipping.quantize(Decimal("0.01")),
            tax=tax,
            total=total,
            coupon_code=valid_coupon
        )

cart_service = CartService()
