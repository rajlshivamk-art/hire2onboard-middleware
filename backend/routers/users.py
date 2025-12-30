from fastapi import APIRouter, HTTPException, status, Depends # Added Depends
from typing import List
from ..models import User
from ..schemas import UserCreate, UserBase, UserResponse
from beanie import PydanticObjectId
from .auth import get_current_user # Imported auth dependency

router = APIRouter(
    prefix="/api/users",
    tags=["users"]
)

@router.get("/", response_model=List[UserResponse])
async def get_users(current_user: User = Depends(get_current_user)):
    # Filter users: only show users from the same company
    # Filter users: only show users from the same company
    if current_user.company:
        return await User.find(User.company == current_user.company).to_list()
    
    # Super Admin (no company or "Default"?): Show ALL users
    if current_user.email == "administrator":
        return await User.find_all().to_list()  
    # If no company (Super Admin? or Dev), show all? 
    # Better to default to empty or just self for safety if company is missing in prod context.
    # For now, if no company, returning all might leak data if not careful.
    # Let's assume strict isolation:
    return []

from ..services.erp_service import ERPService

@router.get("/companies", response_model=List[str])
async def get_companies(current_user: User = Depends(get_current_user)):
    # Only Super Users can fetch all companies (Multi-tenant Admin)
    # Fallback to hardcoded admin check if needed
    if current_user.isSuperUser or current_user.email == "administrator":
        return await ERPService.get_all_companies()
    return [current_user.company] if current_user.company else []

@router.get("/erp-employees", response_model=List[dict])
async def get_erp_employees(company: str, current_user: User = Depends(get_current_user)):
    # Only Super Users can fetch raw ERP employees to import
    if not (current_user.isSuperUser or current_user.email == "administrator"):
         raise HTTPException(status_code=403, detail="Only Super Admin can import employees")
    
    return await ERPService.get_employees_by_company(company)

@router.post("/refresh-erp")
async def refresh_erp_cache(current_user: User = Depends(get_current_user)):
    """Forces a clear of the ERP cache"""
    if not (current_user.isSuperUser or current_user.email == "administrator" or current_user.role == "HR"):
         raise HTTPException(status_code=403, detail="Not authorized")
    
    ERPService.get_all_companies.cache_clear()
    ERPService.get_employees_by_company.cache_clear()
    return {"message": "ERP Cache Cleared"}
