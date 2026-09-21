from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.review import ReviewStatus

class ReviewBase(BaseModel):
    rating: float = Field(..., ge=1.0, le=5.0)
    comment: str

class ReviewCreate(ReviewBase):
    order_id: Optional[int] = None

class ReviewStatusUpdate(BaseModel):
    status: ReviewStatus

class ReviewUserSummary(BaseModel):
    id: int
    first_name: str
    last_name: str

    model_config = ConfigDict(from_attributes=True)

class ReviewProductSummary(BaseModel):
    id: int
    name: str
    slug: str
    primary_image_url: str

    model_config = ConfigDict(from_attributes=True)

class ReviewResponse(ReviewBase):
    id: int
    user_id: int
    product_id: int
    order_id: Optional[int] = None
    status: ReviewStatus
    created_at: datetime
    user: Optional[ReviewUserSummary] = None
    product: Optional[ReviewProductSummary] = None

    model_config = ConfigDict(from_attributes=True)

