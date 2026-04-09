from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from ..models import User
from ..schemas import UserCreate, UserResponse, UserUpdate
from beanie import PydanticObjectId
from .auth import get_current_user
from ..services.erp_service import ERPService

router = APIRouter(
    prefix="/api/users",
    tags=["users"]
)

# ==========================================================
# GET USERS (SaaS FIXED)
# ==========================================================
@router.get("/", response_model=List[UserResponse])
async def get_users(current_user: User = Depends(get_current_user)):

    # Super Admin → all users
    if current_user.email == "administrator":
        return await User.find_all().to_list()

    # ✅ SaaS: strict tenant isolation
    if current_user.companyId:
        return await User.find(
            User.companyId == current_user.companyId
        ).to_list()

    return []


# ==========================================================
# GET COMPANIES
# ==========================================================
@router.get("/companies/", response_model=List[str])
async def get_companies(current_user: User = Depends(get_current_user)):
    if current_user.isSuperUser or current_user.email == "administrator":
        return await ERPService.get_all_companies()

    return [current_user.company] if current_user.company else []


# ==========================================================
# ERP EMPLOYEES
# ==========================================================
@router.get("/erp-employees", response_model=List[dict])
async def get_erp_employees(company: str, current_user: User = Depends(get_current_user)):
    if not (current_user.isSuperUser or current_user.email == "administrator"):
        raise HTTPException(status_code=403, detail="Only Super Admin can import employees")

    return await ERPService.get_employees_by_company(company)


# ==========================================================
# IMPORT USER (FIXED)
# ==========================================================
@router.post("/import", response_model=UserResponse)
async def import_user(employee_data: dict, current_user: User = Depends(get_current_user)):

    if not (current_user.isSuperUser or current_user.email == "administrator"):
        raise HTTPException(status_code=403, detail="Only Super Admin can import employees")

    email = employee_data.get("company_email") or employee_data.get("user_id")
    if not email:
        raise HTTPException(status_code=400, detail="Employee has no email/user_id")

    existing = await User.find_one(User.email == email)
    if existing:
        return existing

    from .auth import pwd_context

    new_user = User(
        name=employee_data.get("employee_name"),
        email=email,
        role="HR",
        company=employee_data.get("company"),
        companyId=current_user.companyId,   # ✅ SaaS FIX
        password=pwd_context.hash("password123"),
        canViewSalary=True,
        canMoveCandidate=True,
        canEditJob=True,
        canManageUsers=True
    )

    await new_user.insert()
    return new_user


# ==========================================================
# CREATE USER (CRITICAL FIX)
# ==========================================================
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, current_user: User = Depends(get_current_user)):

    existing = await User.find_one(User.email == user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_data = user.model_dump()

    from .auth import pwd_context
    user_data["password"] = pwd_context.hash(user_data["password"])

    # ✅ SaaS FIX: force tenant binding
    user_data["companyId"] = current_user.companyId

    if current_user.email == "administrator":
        if not user_data.get("company"):
            user_data["company"] = "Default Company"
    else:
        user_data["company"] = current_user.company

    new_user = User(**user_data)
    await new_user.insert()
    return new_user


# ==========================================================
# GET USER (SECURE)
# ==========================================================
@router.get("/{userId}", response_model=UserResponse)
async def get_user(userId: str, current_user: User = Depends(get_current_user)):

    if not PydanticObjectId.is_valid(userId):
        raise HTTPException(status_code=404, detail="User not found")

    user = await User.get(PydanticObjectId(userId))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ✅ SaaS isolation
    if current_user.email != "administrator":
        if user.companyId != current_user.companyId:
            raise HTTPException(status_code=403, detail="Not authorized")

    return user


# ==========================================================
# UPDATE USER (SECURE)
# ==========================================================
@router.put("/{userId}", response_model=UserResponse)
async def update_user(userId: str, user_update: UserUpdate, current_user: User = Depends(get_current_user)):

    if not PydanticObjectId.is_valid(userId):
        raise HTTPException(status_code=404, detail="User not found")

    user = await User.get(PydanticObjectId(userId))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ✅ SaaS isolation
    if current_user.email != "administrator":
        if user.companyId != current_user.companyId:
            raise HTTPException(status_code=403, detail="Not authorized")

    update_data = user_update.model_dump(exclude_unset=True)

    if update_data.get("email") and update_data["email"] != user.email:
        existing_user = await User.find_one(User.email == update_data["email"])
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

    if update_data.get("password"):
        from .auth import pwd_context
        user.password = pwd_context.hash(update_data["password"])

    for key, value in update_data.items():
        if key != "password":
            setattr(user, key, value)

    await user.save()
    return user


# ==========================================================
# DELETE USER (SECURE)
# ==========================================================
@router.delete("/{userId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(userId: str, current_user: User = Depends(get_current_user)):

    if not PydanticObjectId.is_valid(userId):
        raise HTTPException(status_code=404, detail="User not found")

    user = await User.get(PydanticObjectId(userId))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ✅ SaaS isolation
    if current_user.email != "administrator":
        if user.companyId != current_user.companyId:
            raise HTTPException(status_code=403, detail="Not authorized")

    from ..models import Application
    apps = await Application.find(
        Application.assignedRecruiterId == userId,
        Application.companyId == current_user.companyId   # ✅ FIX
    ).to_list()

    for app in apps:
        app.assignedRecruiterId = None
        await app.save()

    await user.delete()
    return


# ==========================================================
# REFRESH ERP CACHE
# ==========================================================
@router.post("/refresh-erp")
async def refresh_erp_cache(current_user: User = Depends(get_current_user)):

    if not (current_user.isSuperUser or current_user.email == "administrator" or current_user.role == "HR"):
        raise HTTPException(status_code=403, detail="Not authorized")

    ERPService.get_all_companies.cache_clear()
    ERPService.get_employees_by_company.cache_clear()

    return {"message": "ERP Cache Cleared"}