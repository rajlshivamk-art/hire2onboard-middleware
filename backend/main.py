from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from backend.config import settings
from backend.models import User, Job, Application, Feedback, OnboardingTask, RefreshToken
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
        document_models=[User, Job, Application, OnboardingTask, RefreshToken]
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
