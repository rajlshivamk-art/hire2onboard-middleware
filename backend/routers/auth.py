from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from backend.config import settings
from backend.models import User, RefreshToken
from backend.schemas import UserLogin, UserResponse, ForgotPasswordRequest, ResetPasswordRequest, LoginResponse
from backend.services.erp_service import ERPService
import uuid
from fastapi_mail import FastMail, ConnectionConfig, MessageSchema, MessageType
import bcrypt

# Fix for Passlib/Bcrypt compatibility
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("About", (object,), {"__version__": bcrypt.__version__})

router = APIRouter(prefix="/api/auth", tags=["auth"])

# OAuth2 scheme for header access token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    if plain_password == hashed_password:
        return True
    if not (hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$") or hashed_password.startswith("$2y$")):
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token():
    return str(uuid.uuid4())

# -----------------------
# Current user helpers
# -----------------------

async def get_current_user(request: Request, token: Optional[str] = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await User.find_one(User.email == email)
    if not user:
        raise credentials_exception
    return user

async def get_current_user_optional(request: Request) -> Optional[User]:
    """Returns current user or None if not authenticated (other routers depend on this)."""
    try:
        token = request.headers.get("Authorization")
        if token and token.startswith("Bearer "):
            token = token[7:]
        if not token:
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

# -----------------------
# REGISTER
# -----------------------

from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


@router.post("/register")
async def register(user_data: UserRegister):
    # Check if user already exists
    existing_user = await User.find_one(User.email == user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )

    # Hash password
    hashed_password = pwd_context.hash(user_data.password)

    # Create user (Admin by default)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password,
        role="Admin",
        company="My Company"  # or dynamic later
    )

    await new_user.insert()

    return {
        "success": True,
        "message": "User registered successfully"
    }

# -----------------------
# LOGIN / REFRESH / LOGOUT
# -----------------------

@router.post("/login", response_model=LoginResponse)
async def login(response: Response, user_credentials: UserLogin):
    # --- ERP login & local DB logic untouched ---
    erp_cookies = await ERPService.login(user_credentials.email, user_credentials.password)
    user = None
    if erp_cookies:
        user_info = await ERPService.get_user_info(erp_cookies)
        if user_info:
            user = await User.find_one(User.email == user_credentials.email)
            if not user:
                user = User(
                    name=user_info.get("full_name", "Unknown"),
                    email=user_credentials.email,
                    role="HR",
                    password=pwd_context.hash(user_credentials.password),
                    company=user_info.get("company")
                )
                await user.insert()
            else:
                user.name = user_info.get("full_name", user.name)
                user.company = user_info.get("company", user.company)
                user.password = pwd_context.hash(user_credentials.password)
                await user.save()
    if not user:
        user = await User.find_one(User.email == user_credentials.email)
        if not user or not verify_password(user_credentials.password, user.password):
            raise HTTPException(status_code=401, detail="Incorrect email or password")

    # --- Generate tokens ---
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_claims = {"sub": user.email}
    if user.company:
        token_claims["company"] = user.company
    access_token = create_access_token(data=token_claims, expires_delta=access_token_expires)

    refresh_token_str = create_refresh_token()
    refresh_token_obj = RefreshToken(
        user_id=str(user.id),
        token=refresh_token_str,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    await refresh_token_obj.insert()

    # Set refresh token cookie
    is_production = settings.ENVIRONMENT == "production"
    
    response.set_cookie(
    key="refresh_token",
    value=refresh_token_str,
    httponly=True,
    max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    samesite="none" if is_production else "lax",
    secure=True if is_production else False
)


    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.model_validate(user)}

@router.post("/refresh")
async def refresh_token(request: Request):
    refresh_token_cookie = request.cookies.get("refresh_token")
    if not refresh_token_cookie:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    token_obj = await RefreshToken.find_one(RefreshToken.token == refresh_token_cookie)
    if not token_obj or token_obj.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh token expired")
    user = await User.find_one(User.id == token_obj.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_claims = {"sub": user.email}
    if user.company:
        token_claims["company"] = user.company
    access_token = create_access_token(data=token_claims, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout(response: Response, request: Request):
    refresh_token_cookie = request.cookies.get("refresh_token")
    if refresh_token_cookie:
        token_obj = await RefreshToken.find_one(RefreshToken.token == refresh_token_cookie)
        if token_obj:
            await token_obj.delete()
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

# -----------------------
# EXISTING ENDPOINTS (UNCHANGED)
# -----------------------

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    email = payload.email
    user = await User.find_one(User.email == email)
    if user:
        reset_token = str(uuid.uuid4())
        expiry = datetime.utcnow() + timedelta(minutes=30)
        user.reset_token = reset_token
        user.reset_token_expiry = expiry
        await user.save()
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        background_tasks.add_task(send_reset_email, email, reset_link)
    return {"message": "If the email exists, a reset link has been sent"}

async def send_reset_email(email: str, reset_link: str):
    conf = ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_STARTTLS=settings.MAIL_STARTTLS,
        MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
        USE_CREDENTIALS=settings.USE_CREDENTIALS,
        VALIDATE_CERTS=settings.VALIDATE_CERTS,
        TEMPLATE_FOLDER=None
    )
    message = MessageSchema(
        subject="Password Reset Request",
        recipients=[email],
        body=f"Click the link to reset your password: {reset_link}",
        subtype=MessageType.html,
    )
    fm = FastMail(conf)
    try:
        await fm.send_message(message)
    except Exception as e:
        print(f"Failed to send reset email to {email}: {e}")

@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    user = await User.find_one(User.reset_token == payload.token)
    if not user or not user.reset_token_expiry or user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user.password = pwd_context.hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    await user.save()
    return {"message": "Password reset successful"}
