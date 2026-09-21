from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, field_validator, ConfigDict

class ProductImageBase(BaseModel):
    image_url: str
    alt_text: Optional[str] = None
    sort_order: int = 0
    is_primary: bool = False

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, v: str) -> str:
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Image URL must start with http:// or https://")
        return v

class ProductImageCreate(ProductImageBase):
    pass

class ProductImageResponse(ProductImageBase):
    id: int
    product_id: int

    model_config = ConfigDict(from_attributes=True)

class ProductVariantBase(BaseModel):
    variant_type: str
    variant_name: str
    price_modifier: Decimal = Decimal("0.00")
    stock_quantity: int = 0
    sku: Optional[str] = None

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantResponse(ProductVariantBase):
    id: int
    product_id: int

    model_config = ConfigDict(from_attributes=True)

class ProductBase(BaseModel):
    name: str
    slug: str
    sku: str
    category_id: Optional[int] = None
    brand: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    price: Decimal
    original_price: Optional[Decimal] = None
    discount_percentage: int = 0
    stock_quantity: int = 0
    low_stock_threshold: int = 5
    is_active: bool = True

class ProductCreate(ProductBase):
    images: Optional[List[ProductImageCreate]] = []
    variants: Optional[List[ProductVariantCreate]] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[int] = None
    brand: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    original_price: Optional[Decimal] = None
    discount_percentage: Optional[int] = None
    stock_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    is_active: Optional[bool] = None
    images: Optional[List[ProductImageCreate]] = None
    variants: Optional[List[ProductVariantCreate]] = None

class CategorySummary(BaseModel):
    id: int
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)

class ProductResponse(ProductBase):
    id: int
    rating: float
    review_count: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategorySummary] = None
    images: List[ProductImageResponse] = []
    primary_image_url: str

    model_config = ConfigDict(from_attributes=True)

class ProductDetailResponse(ProductResponse):
    variants: List[ProductVariantResponse] = []

    model_config = ConfigDict(from_attributes=True)

