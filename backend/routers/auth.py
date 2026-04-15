from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from backend.config import settings
from backend.models import User, RefreshToken, Company
from backend.schemas import UserLogin, UserResponse, ForgotPasswordRequest, ResetPasswordRequest, LoginResponse
from backend.services.erp_service import ERPService
import uuid
from fastapi_mail import FastMail, ConnectionConfig, MessageSchema, MessageType
from pydantic import BaseModel, EmailStr



router = APIRouter(prefix="/api/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ===========================================================
# SET PASSWORD (NEW API)
# ===========================================================
@router.post("/set-password")
async def set_password(payload: ResetPasswordRequest):

    user = await User.find_one(User.reset_token == payload.token)

    if not user or not user.reset_token_expiry or user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(400, "Invalid or expired token")

    user.password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expiry = None

    await user.save()

    return {"message": "Password set successfully"}


# ===========================================================
# FIXED PASSWORD VERIFY (REMOVED INSECURE LOGIC)
# ===========================================================
def verify_password(plain_password, hashed_password):
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token():
    return str(uuid.uuid4())


# ===========================================================
# SCHEMA (FIX)
# ===========================================================
class CompanyRegister(BaseModel):
    admin_name: str
    email: EmailStr
    password: str
    company_name: str


# ===========================================================
# CURRENT USER
# ===========================================================
async def get_current_user(request: Request, token: Optional[str] = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401)
    except JWTError:
        raise HTTPException(status_code=401)

    user = await User.find_one(User.email == email)
    if not user:
        raise HTTPException(status_code=401)

    return user


async def get_current_user_optional(request: Request) -> Optional[User]:
    """
    Optional auth (used for public routes).
    Returns user if token exists, else None.
    """

    try:
        token = request.headers.get("Authorization")

        if token and token.startswith("Bearer "):
            token = token[7:]
        else:
            token = request.cookies.get("access_token")

        if not token:
            return None

        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

        email = payload.get("sub")
        if not email:
            return None

        return await User.find_one(User.email == email)

    except Exception:
        return None


# ===========================================================
# REGISTER COMPANY (FIXED)
# ===========================================================
@router.post("/register-company")
async def register_company(data: CompanyRegister):

    existing = await User.find_one(User.email == data.email)
    if existing:
        raise HTTPException(400, "User already exists")

    company = Company(name=data.company_name)
    await company.insert()

    user = User(
        name=data.admin_name,
        email=data.email,
        password=pwd_context.hash(data.password),  # ✅ FIXED
        role="Admin",
        company=data.company_name,
        companyId=company.id,
        canManageUsers=True,
        canEditJob=True,
        canMoveCandidate=True,
        canViewSalary=True
    )

    await user.insert()

    return {"message": "Company created successfully"}


# ===========================================================
# LOGIN (FIXED PASSWORD + SAAS)
# ===========================================================
@router.post("/login", response_model=LoginResponse)
async def login(response: Response, user_credentials: UserLogin):

    user = await User.find_one(User.email == user_credentials.email)

    # 🔥 NEW CHECK: user must have password set
    if not user or not user.password:
        raise HTTPException(
            status_code=401,
            detail="Account not activated. Please set your password."
        )

    if not verify_password(user_credentials.password, user.password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not user.companyId:
        raise HTTPException(400, "User not linked to any company")

    token_claims = {
        "sub": user.email,
        "companyId": str(user.companyId)
    }

    access_token = create_access_token(
        data=token_claims,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    refresh_token_str = create_refresh_token()

    await RefreshToken(
        user_id=str(user.id),
        token=refresh_token_str,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    ).insert()

    response.set_cookie(
        key="refresh_token",
        value=refresh_token_str,
        httponly=True
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user)
    }


# ===========================================================
# REFRESH TOKEN (FIXED COMPANY CLAIM)
# ===========================================================
@router.post("/refresh")
async def refresh_token(request: Request):

    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401)

    token_obj = await RefreshToken.find_one(RefreshToken.token == token)
    if not token_obj or token_obj.expires_at < datetime.utcnow():
        raise HTTPException(401)

    user = await User.get(token_obj.user_id)

    access_token = create_access_token({
        "sub": user.email,
        "companyId": str(user.companyId)  # ✅ FIXED
    })

    return {"access_token": access_token}


# ===========================================================
# LOGOUT
# ===========================================================
@router.post("/logout")
async def logout(response: Response, request: Request):

    token = request.cookies.get("refresh_token")

    if token:
        obj = await RefreshToken.find_one(RefreshToken.token == token)
        if obj:
            await obj.delete()

    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


# ===========================================================
# RESET PASSWORD (UNCHANGED BUT SAFE)
# ===========================================================
@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):

    user = await User.find_one(User.reset_token == payload.token)

    if not user or user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(400, "Invalid token")

    user.password = pwd_context.hash(payload.new_password)  # ✅ FIXED
    user.reset_token = None
    user.reset_token_expiry = None

    await user.save()

    return {"message": "Password reset successful"}