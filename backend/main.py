from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from backend.models import Company  


from backend.config import settings

# ✅ MODELS
from backend.models import (
    User,
    Job,
    Application,
    OnboardingTask,
    RefreshToken,
    EmailTracking,
    Portal,
    Integration,
    Company
)

# ✅ ROUTERS (FIXED IMPORT STYLE)
from backend.routers import (
    auth,
    jobs,
    applications,
    users,
    interviews,
    ghosting,
    applications_bulk
)

# ✅ IMPORTANT: DIRECT IMPORT (FIXES YOUR ERROR)
from backend.routers.bitrix import router as bitrix_router

from backend.db_initializer import initialize_db
from backend.utils.files import init_gridfs


# ===========================================================
# LIFESPAN (DB INIT)
# ===========================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.get_default_database()

    await init_beanie(
        database=db,
        document_models=[
            User,
            Job,
            Application,
            OnboardingTask,
            RefreshToken,
            EmailTracking,
            Portal,
            Integration,
            Company
        ]
        
    )

    # GridFS init
    init_gridfs(db)

    # Seed DB
    await initialize_db(db)

    yield


# ===========================================================
# APP INIT
# ===========================================================
app = FastAPI(
    title="Recruitment Software API",
    version="1.0.0",
    lifespan=lifespan
)


# ===========================================================
# CORS CONFIG
# ===========================================================
origins_list = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===========================================================
# PERFORMANCE
# ===========================================================
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ===========================================================
# ROUTERS
# ===========================================================
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(users.router)
app.include_router(interviews.router)
app.include_router(ghosting.router)
app.include_router(applications_bulk.router)

# ✅ FIXED BITRIX ROUTE
app.include_router(bitrix_router)


# ===========================================================
# HEALTH
# ===========================================================
@app.get("/")
async def root():
    return {"message": "Welcome to the Recruitment Software API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ===========================================================
# LOCAL RUN
# ===========================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=5000, reload=True)