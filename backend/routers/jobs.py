
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from typing import List
from datetime import datetime
from typing import Optional
from pydantic import ConfigDict, model_validator
from beanie import PydanticObjectId, SortDirection
from fastapi import Depends # Added Depends
from ..models import Job, User # Imported User
from ..schemas import JobCreate, JobBase, JobUpdate
from .auth import get_current_user, get_current_user_optional # Imported get_current_user

router = APIRouter(
    prefix="/api/jobs",
    tags=["jobs"]
)

class JobResponse(JobBase):
    id: PydanticObjectId
    postedDate: datetime
    status: str
    salaryRange: dict = {}

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='after')
    def set_salary_range(self):
        self.salaryRange = {"min": self.salaryMin, "max": self.salaryMax}
        return self

@router.get("/", response_model=List[JobResponse])
async def get_jobs(current_user: User = Depends(get_current_user_optional), company: Optional[str] = None):
    # If authenticated
    if current_user:
        # Super Admin: Can see ALL jobs, or filter by specific company
        if current_user.email == "administrator":
            query = {}
            if company:
                query["company"] = company
            return await Job.find(query).sort("-postedDate").to_list()
            
        # Standard HR: Only see their own company's jobs
        if current_user.company:
            return await Job.find(Job.company == current_user.company).sort("-postedDate").to_list()
    
    # If unauthenticated (Public Job Board) or User has no company
    from beanie.operators import In
    return await Job.find(In(Job.status, ["Active", "Open", "Closed"])).sort("-postedDate").to_list()

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    if PydanticObjectId.is_valid(job_id):
        job = await Job.get(PydanticObjectId(job_id))
    else:
        job = None
        
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(job_create: JobCreate, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    job_data = job_create.model_dump()
    job_data["postedDate"] = datetime.now()
    job_data["status"] = "Active"
    # Prioritize current_user.company if set (Security), otherwise allow fallback if Admin/System passed it
    if current_user.company:
        job_data["company"] = current_user.company 
    elif not job_data.get("company"):
        # If both are missing, we might default or leave None.
        # Leaving None causes frontend to show "Recruitment HRMS".
        # We could try to set a sane default?
        pass
    
    job = Job(**job_data)
    # Insert into MongoDB
    await job.insert()
    
    # Sync to ERP (Background)
    from ..services.erp_service import ERPService
    background_tasks.add_task(ERPService.create_job_opening, job.model_dump())
    
    return job

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(job_id: str, job_update: JobUpdate):
    if not PydanticObjectId.is_valid(job_id):
        raise HTTPException(status_code=404, detail="Job not found")

    job = await Job.get(PydanticObjectId(job_id))
    if not job:
         raise HTTPException(status_code=404, detail="Job not found")
         
    update_data = job_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(job, key, value)
    
    await job.save()
    return job

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: str):
    if not PydanticObjectId.is_valid(job_id):
        raise HTTPException(status_code=404, detail="Job not found")

    job = await Job.get(PydanticObjectId(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Cascade: Delete all applications for this job
    from ..models import Application
    apps = await Application.find(Application.jobId == job_id).to_list()
    if apps:
        print(f"Deleting {len(apps)} applications linked to job {job.title}")
        for app in apps:
            await app.delete()

    await job.delete()
    return
