from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation successful"
    data: Optional[T] = None
    errors: Optional[List[Any]] = None

class PaginatedData(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

class PaginatedApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Data retrieved successfully"
    data: PaginatedData[T]
    errors: Optional[List[Any]] = None
