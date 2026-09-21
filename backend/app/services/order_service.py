import secrets
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.order import Order, OrderItem, Payment, Shipment, OrderStatus, PaymentStatus
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.address import Address
from app.models.coupon import Coupon, CouponUsage, DiscountType
from app.schemas.order import OrderCreate, OrderStatusUpdate
from app.services.payment_service import payment_service

class OrderService:
    @staticmethod
    def create_order(db: Session, user_id: int, order_in: OrderCreate) -> Order:
        # Verify shipping address exists and belongs to user
        shipping_addr = db.query(Address).filter(
            Address.id == order_in.shipping_address_id,
            Address.user_id == user_id
        ).first()
        if not shipping_addr:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid shipping address selected")

        billing_addr_id = order_in.billing_address_id or order_in.shipping_address_id
        billing_addr = db.query(Address).filter(
            Address.id == billing_addr_id,
            Address.user_id == user_id
        ).first()
        if not billing_addr:
            billing_addr_id = order_in.shipping_address_id

        # Fetch cart
        cart = db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.product)
        ).filter(Cart.user_id == user_id).first()

        if not cart or not cart.items:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your cart is empty")

        # Database Transaction: revalidate each item, check stock, calculate totals
        subtotal = Decimal("0.00")
        order_items_to_create = []
        products_to_update = []

        for item in cart.items:
            product = db.query(Product).with_for_update().filter(Product.id == item.product_id).first()
            if not product or not product.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product '{item.product.name if item.product else 'Item'}' is no longer available"
                )
            if product.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{product.name}'. Available: {product.stock_quantity}"
                )

            line_price = product.price * item.quantity
            subtotal += line_price

            order_items_to_create.append({
                "product_id": product.id,
                "product_name": product.name,
                "sku": product.sku,
                "quantity": item.quantity,
                "unit_price": product.price,
                "total_price": line_price
            })

            # Prepare inventory reduction
            product.stock_quantity -= item.quantity
            products_to_update.append(product)

        # Shipping fee
        shipping = Decimal("0.00") if subtotal >= 100 else Decimal("15.00")

        # Coupon calculation
        discount = Decimal("0.00")
        applied_coupon = None
        if order_in.coupon_code:
            applied_coupon = db.query(Coupon).filter(
                Coupon.code == order_in.coupon_code.strip().upper(),
                Coupon.is_active == True
            ).first()
            if applied_coupon and subtotal >= applied_coupon.minimum_order and applied_coupon.used_count < applied_coupon.usage_limit:
                if applied_coupon.discount_type == DiscountType.PERCENTAGE:
                    discount = (subtotal * applied_coupon.discount_value) / Decimal("100.00")
                else:
                    discount = applied_coupon.discount_value
                if applied_coupon.maximum_discount and discount > applied_coupon.maximum_discount:
                    discount = applied_coupon.maximum_discount
                if discount > subtotal:
                    discount = subtotal
                applied_coupon.used_count += 1
            else:
                applied_coupon = None

        taxable = max(Decimal("0.00"), subtotal - discount)
        tax = (taxable * Decimal("0.08")).quantize(Decimal("0.01"))
        total = (taxable + shipping + tax).quantize(Decimal("0.01"))

        # Generate unique order number: SHP-YYYYMMDD-XXXX
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        order_number = f"SHP-{date_str}-{secrets.token_hex(3).upper()}"

        order = Order(
            user_id=user_id,
            order_number=order_number,
            subtotal=subtotal.quantize(Decimal("0.01")),
            discount=discount.quantize(Decimal("0.01")),
            shipping=shipping.quantize(Decimal("0.01")),
            tax=tax,
            total=total,
            status=OrderStatus.CONFIRMED,
            payment_status=PaymentStatus.PAID,
            shipping_address_id=shipping_addr.id,
            billing_address_id=billing_addr_id,
            notes=order_in.notes
        )
        db.add(order)
        db.flush()

        # Add order items
        for item_data in order_items_to_create:
            oi = OrderItem(
                order_id=order.id,
                product_id=item_data["product_id"],
                product_name=item_data["product_name"],
                sku=item_data["sku"],
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                total_price=item_data["total_price"]
            )
            db.add(oi)

        # Process payment via mock payment service
        pay_result = payment_service.process_payment(total, payment_method=order_in.payment_method)
        payment = Payment(
            order_id=order.id,
            payment_reference=pay_result["payment_reference"],
            payment_method=order_in.payment_method,
            amount=total,
            status=PaymentStatus.PAID
        )
        db.add(payment)

        # Create shipment record
        tracking_code = f"TRK-{secrets.token_hex(5).upper()}"
        shipment = Shipment(
            order_id=order.id,
            tracking_number=tracking_code,
            carrier="FedEx Express",
            status="Processing"
        )
        db.add(shipment)

        # Record coupon usage if applied
        if applied_coupon:
            usage = CouponUsage(
                coupon_id=applied_coupon.id,
                user_id=user_id,
                order_id=order.id
            )
            db.add(usage)

        # Clear cart
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()

        db.commit()
        db.refresh(order)
        return OrderService.get_order_by_id(db, order.id, user_id=None)

    @staticmethod
    def get_order_by_id(db: Session, order_id: int, user_id: Optional[int] = None) -> Order:
        query = db.query(Order).options(
            joinedload(Order.items),
            joinedload(Order.payment),
            joinedload(Order.shipment),
            joinedload(Order.shipping_address),
            joinedload(Order.billing_address),
            joinedload(Order.user)
        ).filter(Order.id == order_id)

        if user_id is not None:
            # Customer ownership enforcement
            query = query.filter(Order.user_id == user_id)

        order = query.first()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        return order

    @staticmethod
    def get_customer_orders(db: Session, user_id: int, page: int = 1, page_size: int = 10) -> Tuple[List[Order], int]:
        query = db.query(Order).options(
            joinedload(Order.items),
            joinedload(Order.payment),
            joinedload(Order.shipment)
        ).filter(Order.user_id == user_id).order_by(Order.created_at.desc())

        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    @staticmethod
    def get_admin_orders(
        db: Session,
        page: int = 1,
        page_size: int = 15,
        status_filter: Optional[OrderStatus] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Order], int]:
        query = db.query(Order).options(
            joinedload(Order.items),
            joinedload(Order.payment),
            joinedload(Order.shipment),
            joinedload(Order.user)
        )

        if status_filter:
            query = query.filter(Order.status == status_filter)

        if search:
            query = query.filter(Order.order_number.ilike(f"%{search.strip()}%"))

        query = query.order_by(Order.created_at.desc())
        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    @staticmethod
    def update_order_status(db: Session, order_id: int, status_in: OrderStatusUpdate) -> Order:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        order.status = status_in.status

        # If cancelled, restock products
        if status_in.status == OrderStatus.CANCELLED and order.status != OrderStatus.CANCELLED:
            order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
            for item in order_items:
                if item.product_id:
                    prod = db.query(Product).filter(Product.id == item.product_id).first()
                    if prod:
                        prod.stock_quantity += item.quantity

        # Update shipment info if provided
        if order.shipment:
            if status_in.carrier:
                order.shipment.carrier = status_in.carrier
            if status_in.tracking_number:
                order.shipment.tracking_number = status_in.tracking_number
            if status_in.status == OrderStatus.SHIPPED:
                order.shipment.status = "Shipped"
                order.shipment.shipped_at = datetime.now(timezone.utc)
            elif status_in.status == OrderStatus.DELIVERED:
                order.shipment.status = "Delivered"
                order.shipment.delivered_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(order)
        return OrderService.get_order_by_id(db, order.id)

order_service = OrderService()
