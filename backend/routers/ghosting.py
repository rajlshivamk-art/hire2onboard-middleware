from fastapi import APIRouter, HTTPException, Query, Security, Depends
from typing import List
from fastapi.security import APIKeyHeader
from datetime import datetime, timedelta
from backend.models import EmailTracking, Application, Job, User
from bson import ObjectId
import os

from backend.routers.auth import get_current_user  # ✅ NEW

router = APIRouter(
    prefix="/ghosting",
    tags=["Ghosting Prevention"]
)

API_KEY = os.getenv("GHOSTING_API_KEY")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    if not api_key or api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return api_key


# --------------------------------------
# Helper
# --------------------------------------
def serialize_previous_employments(app):
    previous_employments = []

    for pe in getattr(app, "previousEmployments", []):
        previous_employments.append({
            "companyName": pe.companyName,
            "hrName": pe.hrName,
            "hrEmail": pe.hrEmail,
            "employmentStartDate": pe.employmentStartDate.isoformat() if pe.employmentStartDate else None,
            "employmentEndDate": pe.employmentEndDate.isoformat() if pe.employmentEndDate else None,
            "consentToContact": pe.consentToContact,
        })

    return previous_employments


# --------------------------------------
# INTERACTION (SaaS SAFE)
# --------------------------------------
@router.get(
    "/interaction/{application_id}",
    dependencies=[Depends(verify_api_key)]
)
async def get_interaction(
    application_id: str,
    current_user: User = Depends(get_current_user)   # ✅ NEW
):
    tracking = await EmailTracking.find_one(
        EmailTracking.applicationId == application_id
    )

    if not tracking:
        raise HTTPException(status_code=404, detail="Tracking data not found")

    try:
        app = await Application.find_one({"_id": ObjectId(tracking.applicationId)})
    except Exception:
        app = None

    # ✅ SaaS FIX
    if app and app.companyId != current_user.companyId:
        raise HTTPException(status_code=403, detail="Cross-company access denied")

    candidate_info = None

    if app:
        job_title = None
        department = None
        location = None

        if app.jobId:
            try:
                job = await Job.find_one({"_id": ObjectId(app.jobId)})
                if job:
                    job_title = job.title
                    department = job.department
                    location = job.location
            except Exception:
                pass

        candidate_info = {
            "name": app.name,
            "email": app.email,
            "companyName": getattr(app, "company", None),
            "jobTitle": job_title,
            "department": department,
            "location": location,
            "stage": app.stage,
            "yearsOfExperience": getattr(app, "yearsOfExperience", None),
            "previousEmployments": serialize_previous_employments(app),
        }

    return {
        "applicationId": tracking.applicationId,
        "candidate": candidate_info,
        "openCount": tracking.openCount,
        "clickCount": tracking.clickCount,
        "lastOpenedAt": tracking.lastOpenedAt,
        "lastClickAt": tracking.clickedAt,
        "sentAt": tracking.sentAt,
        "events": tracking.events
    }


# --------------------------------------
# GHOSTED LIST (SaaS SAFE)
# --------------------------------------
@router.get(
    "/ghosted",
    response_model=List[dict],
    dependencies=[Depends(verify_api_key)]
)
async def get_ghosted_candidates(
    hours: int = Query(48),
    current_user: User = Depends(get_current_user)   # ✅ NEW
):
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)

    ghosted_trackings = await EmailTracking.find(
        {
            "$or": [
                {"openCount": 0},
                {"lastOpenedAt": {"$lte": cutoff_time}}
            ]
        }
    ).to_list()

    ghosted_list = []

    for t in ghosted_trackings:
        try:
            app = await Application.find_one({"_id": ObjectId(t.applicationId)})
        except Exception:
            app = None

        if not app:
            continue

        # ✅ SaaS FIX
        if app.companyId != current_user.companyId:
            continue

        ghosted_list.append({
            "applicationId": str(t.applicationId),
            "companyName": getattr(app, "company", None),
            "name": app.name,
            "email": app.email,
            "jobId": str(app.jobId),
            "stage": app.stage,
            "yearsOfExperience": getattr(app, "yearsOfExperience", None),
            "previousEmployments": serialize_previous_employments(app),
            "lastOpenedAt": t.lastOpenedAt,
            "openCount": t.openCount,
            "clickCount": t.clickCount
        })

    return ghosted_list


# --------------------------------------
# ALL TRACKED (SaaS SAFE)
# --------------------------------------
@router.get(
    "/all-tracked",
    response_model=List[dict],
    dependencies=[Depends(verify_api_key)]
)
async def get_all_tracked(
    current_user: User = Depends(get_current_user)   # ✅ NEW
):
    tracked_docs = await EmailTracking.find().to_list(None)

    result = []

    for t in tracked_docs:
        try:
            app = await Application.find_one({"_id": ObjectId(t.applicationId)})
        except Exception:
            app = None

        # ✅ SaaS FIX
        if app and app.companyId != current_user.companyId:
            continue

        candidate_info = None

        if app:
            job_title = None
            department = None
            location = None

            if app.jobId:
                try:
                    job = await Job.find_one({"_id": ObjectId(app.jobId)})
                    if job:
                        job_title = job.title
                        department = job.department
                        location = job.location
                except Exception:
                    pass

            candidate_info = {
                "name": getattr(app, "name", "Unknown"),
                "email": getattr(app, "email", "N/A"),
                "companyName": getattr(app, "company", None),
                "jobTitle": job_title or "N/A",
                "department": department,
                "location": location,
                "stage": getattr(app, "stage", "N/A"),
                "yearsOfExperience": getattr(app, "yearsOfExperience", None),
                "previousEmployments": serialize_previous_employments(app),
            }

        result.append({
            "applicationId": str(t.applicationId),
            "candidate": candidate_info,
            "openCount": getattr(t, "openCount", 0),
            "clickCount": getattr(t, "clickCount", 0),
            "lastOpenedAt": getattr(t, "lastOpenedAt", None),
            "lastClickAt": getattr(t, "clickedAt", None),
            "sentAt": getattr(t, "sentAt", None),
            "events": getattr(t, "events", []),
        })

    return result


# --------------------------------------
# RESET TRACKING (SaaS SAFE)
# --------------------------------------
@router.post("/reset/{application_id}")
async def reset_tracking(
    application_id: str,
    current_user: User = Depends(get_current_user)   # ✅ NEW
):
    tracking = await EmailTracking.find_one(
        EmailTracking.applicationId == application_id
    )

    if not tracking:
        raise HTTPException(status_code=404, detail="Tracking data not found")

    app = await Application.find_one({"_id": ObjectId(application_id)})

    # ✅ SaaS FIX
    if app and app.companyId != current_user.companyId:
        raise HTTPException(status_code=403, detail="Cross-company access denied")

    tracking.openCount = 0
    tracking.clickCount = 0
    tracking.lastOpenedAt = None
    tracking.clickedAt = None
    tracking.events = []

    await tracking.save()

    return {
        "message": f"Tracking for application {application_id} has been reset."
    }