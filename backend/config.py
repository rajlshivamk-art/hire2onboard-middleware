import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    SECRET_KEY: str = "your-secret-key-for-jwt"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    MONGODB_URL: str = "mongodb://127.0.0.1:27017/recruitment_db"
    
    # ERP Settings
    ERP_USER: str = "administrator"
    ERP_PASSWORD: str = "admin@1231"
    ERP_BASE_URL: str = "https://hrdemo.rajlaxmiworld.in"
    
    # Cors
    CORS_ORIGINS: str = "*"

    # Email Settings
    MAIL_USERNAME: str = "kunal.s@indianwellness.org"
    MAIL_PASSWORD: str = "Kunal@s1234"
    MAIL_FROM: str = "kunal.s@indianwellness.org"
    MAIL_SERVER: str = "smtp.hostinger.com"
    MAIL_FROM_NAME: str = "Indian Wellness"
    MAIL_STARTTLS: bool = False
    MAIL_SSL_TLS: bool = True
    MAIL_PORT: int = 465
    USE_CREDENTIALS: bool = True
    VALIDATE_CERTS: bool = True
    
    # Auto-detect Render environment
    ENVIRONMENT: str = "production" if os.environ.get("RENDER") else "development"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
