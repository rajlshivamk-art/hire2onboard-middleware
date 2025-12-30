from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from backend.config import settings
from backend.models import User, Job, Application, Feedback, OnboardingTask
from backend.routers import auth, jobs, applications, users
from backend.db_initializer import initialize_db
from backend.utils.files import init_gridfs

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.get_default_database()
    
    await init_beanie(
        database=db,
        document_models=[User, Job, Application, OnboardingTask]
    )
    
    # Initialize GridFS
    init_gridfs(db)
    
    # Seed Data
    await initialize_db(db)
    
    yield
    # Shutdown
    # client.close() # Motor client handles this

app = FastAPI(title="Recruitment Software API", version="1.0.0", lifespan=lifespan)

# Configure CORS
origins_list = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(users.router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Recruitment Software API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/test-email")
async def test_email_endpoint():
    """Temporary endpoint to debug email issues on Live Server"""
    from fastapi_mail import FastMail, MessageSchema, MessageType
    from backend.utils.email import conf
    from backend.config import settings
    
    try:
        message = MessageSchema(
            subject="Test Email from Live Server Debugger",
            recipients=[settings.MAIL_USERNAME],
            body=f"<h1>Live Server Email Test</h1><p>Sent from: {settings.ENVIRONMENT}</p><p>Server: {settings.MAIL_SERVER}</p>",
            subtype=MessageType.html
        )
        fm = FastMail(conf)
        await fm.send_message(message)
        return {"status": "success", "message": f"Email sent to {settings.MAIL_USERNAME}"}
    except Exception as e:
        return {"status": "error", "detail": str(e), "config": {
            "server": settings.MAIL_SERVER,
            "port": settings.MAIL_PORT,
            "user": settings.MAIL_USERNAME,
            "has_password": bool(settings.MAIL_PASSWORD)
        }}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
