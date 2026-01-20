from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime
from beanie import PydanticObjectId

from backend.models import Application, User
from backend.schemas import InterviewSchedule
from .auth import get_current_user

router = APIRouter(
    prefix="/api/interviews",
    tags=["interviews"]
)


@router.post("/", response_model=InterviewSchedule)
async def schedule_interview(
    interview: InterviewSchedule,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["HR", "Recruiter", "Manager", "Admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    app = await Application.get(PydanticObjectId(interview.applicationId))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Company isolation (strict multi-tenancy)
    if app.company != current_user.company:
        raise HTTPException(status_code=403, detail="Cross-company access denied")
    
    app.interviewSchedules.append(interview.model_dump())

    try:
        await app.save()
    except Exception as e:
        raise HTTPException(status_code=500, detail="DB save failed")

    return app.interviewSchedules[-1]

@router.get("/", response_model=List[InterviewSchedule])
async def get_interviews(
    applicationId: Optional[str] = None,
    recruiterId: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = Application.find(Application.company == current_user.company)

    if applicationId:
        query = query.find(Application.id == PydanticObjectId(applicationId))

    if recruiterId:
        query = query.find(Application.assignedRecruiterId == recruiterId)

    apps = await query.to_list()

    interviews: List[InterviewSchedule] = []
    for app in apps:
        interviews.extend(app.interviewSchedules)

    return interviews


@router.patch("/{applicationId}/{interviewId}", response_model=InterviewSchedule)
async def update_interview_status(
    applicationId: str,
    interviewId: str,
    status: str,
    current_user: User = Depends(get_current_user)
):
    if status not in ["Scheduled", "Completed", "Cancelled", "Rescheduled", "No-Show"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    app = await Application.get(PydanticObjectId(applicationId))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.company != current_user.company:
        raise HTTPException(status_code=403, detail="Cross-company access denied")

    for interview in app.interviewSchedules:
        if str(interview.id) == interviewId:
            interview.status = status
            await app.save()
            return interview

    raise HTTPException(status_code=404, detail="Interview not found")
