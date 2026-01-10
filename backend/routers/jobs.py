from fastapi import APIRouter, HTTPException, status, BackgroundTasks, Depends
from typing import List, Optional
from datetime import datetime
from pydantic import ConfigDict, model_validator
from beanie import PydanticObjectId
from beanie.operators import In

from ..models import Job, User
from ..schemas import JobCreate, JobBase, JobUpdate
from .auth import get_current_user, get_current_user_optional

router = APIRouter(
    prefix="/api/jobs",
    tags=["jobs"]
)


# -------------------- Response Model --------------------
class JobResponse(JobBase):
    id: PydanticObjectId
    postedDate: datetime
    status: str
    salaryRange: dict = {}

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def set_salary_range(self):
        self.salaryRange = {"min": self.salaryMin, "max": self.salaryMax}
        return self


# -------------------- GET JOBS --------------------
@router.get("/", response_model=List[JobResponse])
async def get_jobs(
    current_user: User = Depends(get_current_user_optional),
    company: Optional[str] = None
):
    # Authenticated users
    if current_user:
        # Super Admin
        if current_user.email == "administrator":
            query = {}
            if company:
                query["company"] = company
            return await Job.find(query).sort("-postedDate").to_list()

        # HR (company restricted)
        if current_user.company:
            return await Job.find(
                Job.company == current_user.company
            ).sort("-postedDate").to_list()

    # Public job board
    return await Job.find(
        In(Job.status, ["Active", "Open"])
    ).sort("-postedDate").to_list()


# -------------------- GET SINGLE JOB --------------------
@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    if not PydanticObjectId.is_valid(job_id):
        raise HTTPException(status_code=404, detail="Job not found")

    job = await Job.get(PydanticObjectId(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


# -------------------- CREATE JOB --------------------
@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_create: JobCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    job_data = job_create.model_dump()
    job_data["postedDate"] = datetime.utcnow()
    job_data["status"] = "Active"

    # Enforce company from authenticated user
    if current_user.company:
        job_data["company"] = current_user.company

    job = Job(**job_data)
    await job.insert()

    # Background ERP sync (non-blocking)
    from ..services.erp_service import ERPService
    background_tasks.add_task(
        ERPService.create_job_opening,
        job.model_dump()
    )

    return job


# -------------------- UPDATE JOB --------------------
@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    job_update: JobUpdate,
    current_user: User = Depends(get_current_user)
):
    if not PydanticObjectId.is_valid(job_id):
        raise HTTPException(status_code=404, detail="Job not found")

    job = await Job.get(PydanticObjectId(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 🔐 Authorization: Admin OR same company HR
    if current_user.email != "administrator":
        if not current_user.company or job.company != current_user.company:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to update this job"
            )

    update_data = job_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(job, key, value)

    await job.save()
    return job


# -------------------- DELETE JOB --------------------
@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    if not PydanticObjectId.is_valid(job_id):
        raise HTTPException(status_code=404, detail="Job not found")

    job = await Job.get(PydanticObjectId(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 🔐 Authorization: Admin OR same company HR
    if current_user.email != "administrator":
        if not current_user.company or job.company != current_user.company:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to delete this job"
            )

    # Cascade delete applications
    from ..models import Application
    apps = await Application.find(Application.jobId == job_id).to_list()
    for app in apps:
        await app.delete()

    await job.delete()
    return
