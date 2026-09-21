from datetime import datetime
from typing import Optional
from pydantic import BaseModel, HttpUrl, field_validator, ConfigDict

class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, v: Optional[str]) -> Optional[str]:
        if v and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Image URL must start with http:// or https://")
        return v

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    product_count: int = 0

    model_config = ConfigDict(from_attributes=True)

