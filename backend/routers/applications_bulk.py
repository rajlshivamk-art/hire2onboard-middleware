from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from typing import Dict, Any
from datetime import datetime
from io import BytesIO
import pandas as pd
from beanie import PydanticObjectId

from backend.models import Application, User, Job
from .auth import get_current_user


router = APIRouter(
    prefix="/api/applications",
    tags=["applications"]
)


@router.post("/bulk-upload")
async def bulk_upload_applications(
    jobId: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:

    # 🔐 ROLE-BASED ACCESS CONTROL
    if current_user.role not in ["HR", "Recruiter", "Manager", "Admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    # ✅ Validate jobId format
    try:
        job_object_id = PydanticObjectId(jobId)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid jobId"
        )

    # ✅ Verify job exists
    job = await Job.get(job_object_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    # 🏢 STRICT MULTI-TENANCY CHECK
    if job.company != current_user.company:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-company access denied"
        )

    # ✅ Validate file type
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx, .xls) are allowed"
        )

    contents = await file.read()

    try:
        df = pd.read_excel(BytesIO(contents))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Excel file"
        )

    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Excel file is empty"
        )

    applications = []
    skipped_rows = []
    inserted_count = 0

    for index, row in df.iterrows():
        try:
            name = str(row.get("Name", "")).strip()
            email = str(row.get("Email", "")).strip()
            phone = str(row.get("Phone", "")).strip()

            if not name or not email or not phone:
                skipped_rows.append({
                    "row": index + 2,
                    "reason": "Missing required fields"
                })
                continue

            # Parse skills safely
            skills_raw = row.get("Skills", "")
            skills = [
                s.strip()
                for s in str(skills_raw).split(",")
                if s.strip()
            ]

            application = Application(
                jobId=str(job.id),
                name=name,
                email=email,
                phone=phone,
                resumeUrl="excel_bulk_upload",  # Placeholder
                yearsOfExperience=row.get("Years of Experience"),
                skills=skills,
                currentSalary=row.get("Current Salary"),
                expectedSalary=row.get("Expected Salary"),
                source="excel_bulk_upload",
                company=current_user.company, 
                stage="Applied",
                appliedDate=datetime.utcnow()
            )

            applications.append(application)
            inserted_count += 1

        except Exception as e:
            skipped_rows.append({
                "row": index + 2,
                "reason": "Parsing error"
            })
            continue

    if not applications:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid rows found in Excel"
        )

    try:
        await Application.insert_many(applications)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk insert failed"
        )

    return {
        "message": "Bulk upload completed",
        "inserted": inserted_count,
        "skipped": len(skipped_rows),
        "total_rows": len(df),
        "skipped_details": skipped_rows[:10]  # limit error preview
    }
