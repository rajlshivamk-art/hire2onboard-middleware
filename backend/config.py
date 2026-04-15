import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    SECRET_KEY: str = "your-secret-key-for-jwt"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 10080
    MONGODB_URL: str = "mongodb://127.0.0.1:27017/recruitment_db"
    TEMPLATE_FOLDER: str | None = None
    
    FRONTEND_URL: str = "http://localhost:3000"
    BASE_URL: str = "http://127.0.0.1:8000"
    # ERP Settings
    ERP_USER: str = "administrator"
    ERP_PASSWORD: str = "admin@1231"
    ERP_BASE_URL: str = "https://hrdemo.rajlaxmiworld.in"
    
    # Cors - Explicitly list origins because allow_credentials=True doesn't work with "*"
    CORS_ORIGINS: str = "http://localhost:5173,https://hrms-3nbj.onrender.com,https://hrms-recruitment-portal.onrender.com"

    

    # Email Settings
    MAIL_USERNAME: str = "kunal.s@indianwellness.org"
    MAIL_PASSWORD: str = "Kunal@s1234"
    MAIL_FROM: str = "kunal.s@indianwellness.org"
    MAIL_SERVER: str = "smtp.hostinger.com"
    MAIL_FROM_NAME: str = "Indian Wellness"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    MAIL_PORT: int = 587
    USE_CREDENTIALS: bool = True
    VALIDATE_CERTS: bool = True
    
    EMAIL_SERVICE_URL: str = "https://email-middleware-qyrt.onrender.com"
    EMAIL_API_KEY: str = "averlon-mail-2026!"

    # Auto-detect Render environment
    ENVIRONMENT: str = "production" if os.environ.get("RENDER") else "development"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
