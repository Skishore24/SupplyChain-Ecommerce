from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.address import Address
from app.schemas.common import ApiResponse
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.address import AddressResponse, AddressCreate, AddressUpdate

router = APIRouter(prefix="/users", tags=["Users & Addresses"])

@router.get("/profile", response_model=ApiResponse[UserResponse])
def get_profile(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        message="User profile retrieved",
        data=UserResponse.model_validate(current_user)
    )

@router.put("/profile", response_model=ApiResponse[UserResponse])
def update_profile(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = user_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(current_user, field, val)
    db.commit()
    db.refresh(current_user)
    return ApiResponse(
        success=True,
        message="Profile updated successfully",
        data=UserResponse.model_validate(current_user)
    )

@router.get("/addresses", response_model=ApiResponse[List[AddressResponse]])
def get_addresses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    addresses = db.query(Address).filter(Address.user_id == current_user.id).order_by(Address.is_default.desc(), Address.id.desc()).all()
    return ApiResponse(
        success=True,
        message="Addresses retrieved successfully",
        data=[AddressResponse.model_validate(a) for a in addresses]
    )

@router.post("/addresses", response_model=ApiResponse[AddressResponse], status_code=status.HTTP_201_CREATED)
def create_address(
    addr_in: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # If set default, unset other defaults
    if addr_in.is_default:
        db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": False})

    # If first address, make default automatically
    existing_count = db.query(Address).filter(Address.user_id == current_user.id).count()
    is_default = addr_in.is_default or (existing_count == 0)

    address = Address(
        user_id=current_user.id,
        full_name=addr_in.full_name,
        phone=addr_in.phone,
        address_line_1=addr_in.address_line_1,
        address_line_2=addr_in.address_line_2,
        city=addr_in.city,
        state=addr_in.state,
        postal_code=addr_in.postal_code,
        country=addr_in.country,
        is_default=is_default
    )
    db.add(address)
    db.commit()
    db.refresh(address)
    return ApiResponse(
        success=True,
        message="Address created successfully",
        data=AddressResponse.model_validate(address)
    )

@router.put("/addresses/{address_id}", response_model=ApiResponse[AddressResponse])
def update_address(
    address_id: int,
    addr_in: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == current_user.id).first()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

    update_data = addr_in.model_dump(exclude_unset=True)
    if update_data.get("is_default"):
        db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": False})

    for field, val in update_data.items():
        setattr(address, field, val)

    db.commit()
    db.refresh(address)
    return ApiResponse(
        success=True,
        message="Address updated successfully",
        data=AddressResponse.model_validate(address)
    )

@router.delete("/addresses/{address_id}", response_model=ApiResponse[dict])
def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == current_user.id).first()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    db.delete(address)
    db.commit()
    return ApiResponse(
        success=True,
        message="Address deleted successfully",
        data={"address_id": address_id}
    )

@router.put("/addresses/{address_id}/default", response_model=ApiResponse[AddressResponse])
def set_default_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == current_user.id).first()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

    db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": False})
    address.is_default = True
    db.commit()
    db.refresh(address)
    return ApiResponse(
        success=True,
        message="Default address updated",
        data=AddressResponse.model_validate(address)
    )
