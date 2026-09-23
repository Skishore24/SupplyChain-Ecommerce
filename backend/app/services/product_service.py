from decimal import Decimal
from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc
from fastapi import HTTPException, status
import re

from app.models.product import Product, ProductImage, ProductVariant
from app.models.category import Category
from app.schemas.product import ProductCreate, ProductUpdate

class ProductService:
    @staticmethod
    def get_products(
        db: Session,
        page: int = 1,
        page_size: int = 12,
        search: Optional[str] = None,
        category_slug: Optional[str] = None,
        category_id: Optional[int] = None,
        brand: Optional[str] = None,
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None,
        min_rating: Optional[float] = None,
        in_stock: Optional[bool] = None,
        sort: str = "newest",
        active_only: bool = True
    ) -> Tuple[List[Product], int]:
        query = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.images),
            joinedload(Product.variants)
        )

        if active_only:
            query = query.filter(Product.is_active == True)

        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Product.name.ilike(pattern),
                    Product.short_description.ilike(pattern),
                    Product.description.ilike(pattern),
                    Product.brand.ilike(pattern),
                    Product.sku.ilike(pattern)
                )
            )

        if category_slug:
            query = query.join(Product.category).filter(Category.slug == category_slug)
        elif category_id:
            query = query.filter(Product.category_id == category_id)

        if brand:
            query = query.filter(Product.brand == brand)

        if min_price is not None:
            query = query.filter(Product.price >= min_price)
        if max_price is not None:
            query = query.filter(Product.price <= max_price)

        if min_rating is not None:
            query = query.filter(Product.rating >= min_rating)

        if in_stock is True:
            query = query.filter(Product.stock_quantity > 0)
        elif in_stock is False:
            query = query.filter(Product.stock_quantity == 0)

        # Sorting
        if sort == "price_asc":
            query = query.order_by(asc(Product.price))
        elif sort == "price_desc":
            query = query.order_by(desc(Product.price))
        elif sort == "rating":
            query = query.order_by(desc(Product.rating), desc(Product.review_count))
        elif sort == "popular":
            query = query.order_by(desc(Product.review_count), desc(Product.rating))
        elif sort == "newest":
            query = query.order_by(desc(Product.created_at))
        else:
            # featured / default
            query = query.order_by(desc(Product.rating), desc(Product.id))

        total = query.count()
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()

        return items, total

    @staticmethod
    def get_by_id(db: Session, product_id: int) -> Product:
        product = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.images),
            joinedload(Product.variants)
        ).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return product

    @staticmethod
    def get_by_slug(db: Session, slug: str) -> Product:
        product = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.images),
            joinedload(Product.variants)
        ).filter(Product.slug == slug).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return product

    @staticmethod
    def create_product(db: Session, data: ProductCreate) -> Product:
        # Check SKU uniqueness
        if db.query(Product).filter(Product.sku == data.sku).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"SKU '{data.sku}' already exists.")
        # Check slug uniqueness
        if db.query(Product).filter(Product.slug == data.slug).first():
            data.slug = f"{data.slug}-{int(datetime.now().timestamp())}"

        product = Product(
            category_id=data.category_id,
            name=data.name,
            slug=data.slug,
            sku=data.sku,
            brand=data.brand,
            short_description=data.short_description,
            description=data.description,
            price=data.price,
            original_price=data.original_price,
            discount_percentage=data.discount_percentage,
            stock_quantity=data.stock_quantity,
            low_stock_threshold=data.low_stock_threshold,
            is_active=data.is_active
        )
        db.add(product)
        db.flush()

        # Add image URLs
        if data.images:
            has_primary = any(img.is_primary for img in data.images)
            for idx, img_data in enumerate(data.images):
                img = ProductImage(
                    product_id=product.id,
                    image_url=img_data.image_url,
                    alt_text=img_data.alt_text or product.name,
                    sort_order=img_data.sort_order if img_data.sort_order != 0 else idx,
                    is_primary=img_data.is_primary or (not has_primary and idx == 0)
                )
                db.add(img)

        # Add variants
        if data.variants:
            for v_data in data.variants:
                var = ProductVariant(
                    product_id=product.id,
                    variant_type=v_data.variant_type,
                    variant_name=v_data.variant_name,
                    price_modifier=v_data.price_modifier,
                    stock_quantity=v_data.stock_quantity,
                    sku=v_data.sku or f"{product.sku}-{v_data.variant_name.replace(' ', '_')}"
                )
                db.add(var)

        db.commit()
        db.refresh(product)
        return ProductService.get_by_id(db, product.id)

    @staticmethod
    def update_product(db: Session, product_id: int, data: ProductUpdate) -> Product:
        product = ProductService.get_by_id(db, product_id)
        update_data = data.model_dump(exclude_unset=True)

        # Check SKU uniqueness if changed
        if "sku" in update_data and update_data["sku"] and update_data["sku"] != product.sku:
            existing_sku = db.query(Product).filter(Product.sku == update_data["sku"], Product.id != product_id).first()
            if existing_sku:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"SKU '{update_data['sku']}' is already used by another product.")

        # Check slug uniqueness if changed
        if "slug" in update_data and update_data["slug"] and update_data["slug"] != product.slug:
            existing_slug = db.query(Product).filter(Product.slug == update_data["slug"], Product.id != product_id).first()
            if existing_slug:
                update_data["slug"] = f"{update_data['slug']}-{int(datetime.now().timestamp())}"

        # Handle images if provided
        if "images" in update_data and update_data["images"] is not None:
            product.images.clear()
            db.flush()
            has_primary = any(img.is_primary for img in data.images)
            for idx, img_data in enumerate(data.images):
                img = ProductImage(
                    product_id=product.id,
                    image_url=img_data.image_url,
                    alt_text=img_data.alt_text or product.name,
                    sort_order=img_data.sort_order if img_data.sort_order != 0 else idx,
                    is_primary=img_data.is_primary or (not has_primary and idx == 0)
                )
                db.add(img)
            del update_data["images"]

        # Handle variants if provided
        if "variants" in update_data and update_data["variants"] is not None:
            product.variants.clear()
            db.flush()
            for v_data in data.variants:
                var = ProductVariant(
                    product_id=product.id,
                    variant_type=v_data.variant_type,
                    variant_name=v_data.variant_name,
                    price_modifier=v_data.price_modifier,
                    stock_quantity=v_data.stock_quantity,
                    sku=v_data.sku or f"{product.sku}-{v_data.variant_name.replace(' ', '_')}"
                )
                db.add(var)
            del update_data["variants"]

        for field, value in update_data.items():
            setattr(product, field, value)

        db.commit()
        db.refresh(product)
        return ProductService.get_by_id(db, product.id)

    @staticmethod
    def delete_product(db: Session, product_id: int) -> None:
        product = ProductService.get_by_id(db, product_id)
        db.delete(product)
        db.commit()

product_service = ProductService()
