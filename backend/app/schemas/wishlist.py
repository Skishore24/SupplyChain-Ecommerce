from datetime import datetime
from typing import List
from pydantic import BaseModel, ConfigDict
from app.schemas.product import ProductResponse

class WishlistItemResponse(BaseModel):
    id: int
    wishlist_id: int
    product_id: int
    product: ProductResponse
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WishlistResponse(BaseModel):
    id: int
    user_id: int
    items: List[WishlistItemResponse] = []
    item_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

