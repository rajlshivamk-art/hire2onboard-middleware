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

# --- DEBUG: Test Email Endpoint (Temporary) ---
from backend.utils.email import send_email
from backend.config import settings

@app.get("/api/test-email")
async def test_email_endpoint():
    results = {}
    
    # 1. Connectivity Check
    import socket
    def check_port(host, port):
        try:
            sock = socket.create_connection((host, port), timeout=5)
            sock.close()
            return "Open"
        except Exception as e:
            return f"Closed/Blocked ({str(e)})"

    results["connectivity"] = {
        "google_80": check_port("google.com", 80),
        "hostinger_465": check_port("smtp.hostinger.com", 465),
        "hostinger_587": check_port("smtp.hostinger.com", 587)
    }

    # 2. Try Sending Email (if connectivity works)
    try:
        await send_email(
            recipients=["kunal.s@indianwellness.org"], 
            subject="Test Email from Render",
            template_name="recruiter_new_application_alert",
            context={
                "name": "Test User",
                "email": "test@example.com",
                "job_title": "Test Debugging"
            }
        )
        results["email_status"] = "Email sent successfully!"
    except Exception as e:
         results["email_status"] = f"Failed: {str(e)}"
    
    return results
# ----------------------------------------------

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
