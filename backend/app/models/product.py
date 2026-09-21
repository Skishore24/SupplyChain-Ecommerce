from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    brand = Column(String(100), nullable=True)
    short_description = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    original_price = Column(Numeric(10, 2), nullable=True)
    discount_percentage = Column(Integer, default=0, nullable=False)
    stock_quantity = Column(Integer, default=0, nullable=False)
    low_stock_threshold = Column(Integer, default=5, nullable=False)
    rating = Column(Float, default=0.0, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    cart_items = relationship("CartItem", back_populates="product", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")

    @property
    def primary_image_url(self) -> str:
        for img in self.images:
            if img.is_primary:
                return img.image_url
        if self.images:
            return self.images[0].image_url
        return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"

class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(1000), nullable=False)
    alt_text = Column(String(255), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)

    product = relationship("Product", back_populates="images")

class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_type = Column(String(50), nullable=False)  # Color, Size, Storage, etc.
    variant_name = Column(String(100), nullable=False) # e.g. "Matte Black", "XL", "256GB"
    price_modifier = Column(Numeric(10, 2), default=0.0, nullable=False)
    stock_quantity = Column(Integer, default=0, nullable=False)
    sku = Column(String(100), nullable=True)

    product = relationship("Product", back_populates="variants")
