from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from backend.config import settings
from backend.models import User
from backend.schemas import UserLogin, UserResponse
from backend.services.erp_service import ERPService # New Import
import bcrypt
# Passlib/Bcrypt compatibility fix
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("About", (object,), {"__version__": bcrypt.__version__})


router = APIRouter(
    prefix="/api/auth",
    tags=["auth"]
)

# We use this just to satisfy Depends structure, but we also check cookies
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# Password Context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    # 1. Fast path: Direct equality check (for legacy/dev plain-text passwords)
    if plain_password == hashed_password:
        return True
    
    # 2. Check if it looks like a bcrypt hash (starts with $2b$ or $2a$ or $2y$)
    # If it's a plain string like "hello" but not equal to the input, calling verify() 
    # will throw an "UnknownHashError" or similar from passlib, which is slow.
    if not (hashed_password.startswith("$2b$") or 
            hashed_password.startswith("$2a$") or 
            hashed_password.startswith("$2y$")):
        return False

    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False



def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request, token: Optional[str] = Depends(oauth2_scheme)):
    # 1. Try Authorization header (handled by oauth2_scheme but we check manully if needed or if auto_error=False)
    if not token:
        # 2. Try Cookie
        cookie_token = request.cookies.get("access_token")
        if cookie_token:
            if cookie_token.startswith("Bearer "):
                token = cookie_token[7:]
            else:
                token = cookie_token
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await User.find_one(User.email == email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_user_optional(request: Request) -> Optional[User]:
    """
    Similar to get_current_user but returns None instead of raising 401 if not authenticated.
    """
    try:
        # Re-use logic or call get_current_user? 
        # Calling get_current_user directly would raise 401. 
        # So we duplicate the extraction logic or refactor.
        # For simplicity/safety, let's just try-except the dependency call if we could, 
        # but dependencies don't work that way easily inside function body.
        # So we copy-paste the extraction logic essentially.
        
        token = None
        # 1. Header
        auth_header = request.headers.get("Authorization")
        if auth_header:
            if auth_header.startswith("Bearer "):
                 token = auth_header[7:]
                 
        if not token:
             # 2. Cookie
             cookie_token = request.cookies.get("access_token")
             if cookie_token:
                if cookie_token.startswith("Bearer "):
                    token = cookie_token[7:]
                else:
                    token = cookie_token
        
        if not token:
            return None
            
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                return None
        except JWTError:
            return None
            
        user = await User.find_one(User.email == email)
        return user
    except Exception:
        return None

@router.post("/login", response_model=UserResponse)
async def login(response: Response, user_credentials: UserLogin):
    # 1. Try ERP Login
    erp_cookies = ERPService.login(user_credentials.email, user_credentials.password)
    
    user = None
    
    if erp_cookies:
        # ERP Login Success
        user_info = ERPService.get_user_info(erp_cookies)
        if user_info:
            # Upsert User in Local DB
            user = await User.find_one(User.email == user_credentials.email)
            if not user:
                # Create new user
                user = User(
                    name=user_info.get("full_name", "Unknown"),
                    email=user_credentials.email,
                    role="HR", # Default role for new ERP users (Administrator)
                    password=pwd_context.hash(user_credentials.password), # Store hashed password
                    company=user_info.get("company")
                )
                await user.insert()
            else:
                # Update existing user details (sync)
                user.name = user_info.get("full_name", user.name)
                user.company = user_info.get("company", user.company)
                user.password = pwd_context.hash(user_credentials.password) # Update password
                
                # Sync ERP Roles
                erp_roles = user_info.get("roles", [])
                if "System Manager" in erp_roles or "Administrator" in erp_roles or user_credentials.email == "administrator":
                     user.role = "HR" # Ensure they have base HR access
                     user.isSuperUser = True
                
                # Sync permissions based on Role
                if user.role == "HR":
                     user.canEditJob = True
                     user.canManageUsers = True
                     user.canViewSalary = True
                     user.canMoveCandidate = True
                
                await user.save()
    
    # 2. If ERP failed, optional fallback to local DB (Legacy/Dev)
    # But usually, we want strict ERP auth if active.
    # For now, if ERP failed, we check local DB password (if they exist)
    if not user:
        user = await User.find_one(User.email == user_credentials.email)
        if not user or not verify_password(user_credentials.password, user.password):
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

    # Generate Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Include company in token claims
    token_claims = {"sub": user.email}
    if user.company:
        token_claims["company"] = user.company
        
    access_token = create_access_token(
        data=token_claims, expires_delta=access_token_expires
    )
    
    # Set cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="none" if settings.ENVIRONMENT == "production" else "lax",
        secure=True if settings.ENVIRONMENT == "production" else False 
    )
    
    return user

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
