from fastapi import APIRouter, HTTPException, status, UploadFile, File, BackgroundTasks, Depends # Added Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime
from beanie import PydanticObjectId
from ..models import Application, Feedback, OnboardingTask, User, Job
from ..schemas import ApplicationCreate, ApplicationUpdate, FeedbackCreate, ApplicationResponse, FeedbackResponse, StageUpdate, TaskCreate, OfferCreate, TaskStatusUpdate, CandidateInteraction
from ..utils.files import upload_file_from_stream, get_file_stream
from ..utils.email import send_email
from .auth import get_current_user # Imported get_current_user
from ..services.erp_service import ERPService # Added ERPService
from fastapi import Form, Body

router = APIRouter(
    prefix="/api/applications",
    tags=["applications"]
)

@router.get("/", response_model=List[ApplicationResponse])
async def get_applications(userId: Optional[str] = None, current_user: User = Depends(get_current_user)):
    # Base query: Filter by company if user has one
    query = Application.find(Application.company == current_user.company) if current_user.company else Application.find_all()
    
    if userId:
        # Check user role (admin checking on recruiter, or recruiter checking themselves)
        if PydanticObjectId.is_valid(userId):
            # If requesting user is "Recruiter", force their ID only (security)
            if current_user.role == "Recruiter" and str(current_user.id) != userId:
                 raise HTTPException(status_code=403, detail="Cannot view other recruiter's applications")
            
            # If user wants to filter by a specific recruiterId
            query = query.find(Application.assignedRecruiterId == userId)
    elif current_user.role == "Recruiter":
        # Default behavior for Recruiter: see only assigned
        query = query.find(Application.assignedRecruiterId == str(current_user.id))

    return await query.sort("-appliedDate").to_list()

@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def submit_application(application: ApplicationCreate, background_tasks: BackgroundTasks):
    app_data = application.model_dump()
    app_data["stage"] = "Applied"
    app_data["appliedDate"] = datetime.now()
    app_data["feedback"] = []
    app_data["onboardingTasks"] = []
    
    # --- Assign Company from Job ---
    if PydanticObjectId.is_valid(app_data["jobId"]):
        job = await Job.get(PydanticObjectId(app_data["jobId"]))
        if job:
            app_data["company"] = job.company
            
    app = Application(**app_data)
    await app.insert()

    # --- Email Triggers (Background) ---
    try:
        # Fetch Job Title for email context
        job_title = "Position"
        # Job already fetched above if valid
        if PydanticObjectId.is_valid(app.jobId):
             # We might have fetched it above, but ensure it's available
             if 'job' not in locals():
                 job = await Job.get(PydanticObjectId(app.jobId))
             
             if job:
                job_title = job.title

        # 1. Send specific confirmation to Candidate
        background_tasks.add_task(
            send_email,
            recipients=[app.email],
            subject=f"Application Received - {job_title}",
            template_name="candidate_application_confirmation",
            context={"name": app.name, "job_title": job_title}
        )
        
        # 2. Alert Recruiter
        background_tasks.add_task(
            send_email,
            recipients=["kunal.s@indianwellness.org"],
            subject=f"New Applicant Alert - {job_title}",
            template_name="recruiter_new_application_alert",
            context={
                "name": app.name, 
                "email": app.email,
                "job_title": job_title
            }
        )
        
        print("Scheduled background email tasks")
    except Exception as e:
        print(f"Error scheduling email tasks: {e}")
        print(f"Error scheduling email tasks: {e}")
    # ----------------------

    # --- ERP Sync (Applicant) ---
    background_tasks.add_task(ERPService.create_job_applicant, app_data, job_title)
    # ----------------------------

    return app

@router.get("/{applicationId}", response_model=ApplicationResponse)
async def get_application(applicationId: str):
    if not PydanticObjectId.is_valid(applicationId):
        raise HTTPException(status_code=404, detail="Application not found")
        
    application = await Application.get(PydanticObjectId(applicationId))
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application

@router.post("/{applicationId}/feedback", response_model=FeedbackResponse)
async def submit_feedback(applicationId: str, feedback: FeedbackCreate, background_tasks: BackgroundTasks):
    if not PydanticObjectId.is_valid(applicationId):
         raise HTTPException(status_code=404, detail="Application not found")
         
    app = await Application.get(PydanticObjectId(applicationId))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    fb_data = feedback.model_dump()
    fb_data["candidateId"] = applicationId
    fb_data["date"] = datetime.now()
    
    new_feedback = Feedback(**fb_data)
    app.feedback.append(new_feedback)
    await app.save()
    # --- ERP Sync (Feedback) ---
    job = await Job.get(PydanticObjectId(app.jobId))
    job_title = job.title if job else "Unknown Job"
    
    background_tasks.add_task(
         ERPService.sync_interview_feedback,
         feedback_data=fb_data,
         applicant_email=app.email,
         job_title=job_title
    )
    # ---------------------------
    
    return new_feedback



@router.put("/{applicationId}/feedback/{feedbackId}", response_model=FeedbackResponse)
async def update_feedback(applicationId: str, feedbackId: str, feedback: FeedbackCreate):
    if not PydanticObjectId.is_valid(applicationId):
         raise HTTPException(status_code=404, detail="Application not found")

    app = await Application.get(PydanticObjectId(applicationId))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    found_fb = None
    for fb in app.feedback:
        if str(fb.id) == feedbackId:
            update_dict = feedback.model_dump()
            fb.roundName = update_dict["roundName"]
            fb.comments = update_dict["comments"]
            fb.decision = update_dict["decision"]
            fb.rating = update_dict.get("rating")
            fb.technicalSkills = update_dict.get("technicalSkills")
            fb.codeQuality = update_dict.get("codeQuality")
            fb.problemSolving = update_dict.get("problemSolving")
            fb.cultureFit = update_dict.get("cultureFit")
            fb.communication = update_dict.get("communication")
            fb.negotiatedSalary = update_dict.get("negotiatedSalary")
            found_fb = fb
            break
            
    if found_fb:
        await app.save()
        return found_fb
    else:
        raise HTTPException(status_code=404, detail="Feedback not found")

@router.delete("/{applicationId}/feedback/{feedbackId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feedback(applicationId: str, feedbackId: str):
    if not PydanticObjectId.is_valid(applicationId):
         raise HTTPException(status_code=404, detail="Application not found")

    app = await Application.get(PydanticObjectId(applicationId))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    initial_len = len(app.feedback)
    app.feedback = [fb for fb in app.feedback if str(fb.id) != feedbackId]
    
    if len(app.feedback) < initial_len:
        await app.save()
    else:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return None

@router.patch("/{applicationId}/stage", response_model=ApplicationResponse)
async def update_application_stage(applicationId: str, update: StageUpdate, background_tasks: BackgroundTasks):
    if not PydanticObjectId.is_valid(applicationId):
         raise HTTPException(status_code=404, detail="Application not found")

    app = await Application.get(PydanticObjectId(applicationId))
    if not app:
         raise HTTPException(status_code=404, detail="Application not found")

    app.stage = update.stage
    if update.reason:
        app.rejectionReason = update.reason
    
    # Auto-generate onboarding tasks
    if update.stage == "Onboarding" and not app.onboardingTasks:
        default_tasks = [
            "Sign Offer Letter",
            "Background Check Completed",
            "IT Setup (Laptop/Email)",
            "HR Orientation",
            "Team Introduction",
            "Project Access Granted"
        ]
        app.onboardingTasks = [
            OnboardingTask(
                id=PydanticObjectId(),
                candidateId=applicationId,
                task=task_name,
                status="Pending"
            )
            for task_name in default_tasks
        ]
    
    await app.save()
    
    # --- Email Triggers (Background) ---
    try:
        # Fetch Job details
        job_title = "Position"
        if PydanticObjectId.is_valid(app.jobId):
            job = await Job.get(PydanticObjectId(app.jobId))
            if job:
                job_title = job.title
                
        # Custom message based on stage - ONLY for specific stages
        # User requested: Rejected, Offer, Onboarding (Document)
        should_send_email = False
        message = ""
        
        if update.stage == "Round 1":
            should_send_email = True
            message = "We are pleased to inform you that your application has been shortlisted for the next stage. Our team was impressed with your credentials and will be contacting you shortly to schedule an interaction."
        elif update.stage == "Rejected":
            should_send_email = True
            message = f"After a thorough review, we regret to inform you that we will not be proceeding with your application at this time. We had a strong pool of candidates and our decision was difficult. We wish you the best in your future endeavors."
        elif update.stage == "Offer":
            # For Offer, we NO LONGER send email automatically. 
            # It is triggered manually via /offer endpoint.
            should_send_email = False 
        elif update.stage == "Onboarding":
            # Don't send welcome email automatically. 
            # HR will trigger "Request Documents" manually or we send "Pending" reminders.
            should_send_email = False

        if should_send_email:
            background_tasks.add_task(
                send_email,
                recipients=[app.email],
                subject=f"Employment Offer - {job_title}" if update.stage == "Offer" else (f"Welcome Aboard - {job_title}" if update.stage == "Onboarding" else f"Application Update - {job_title}"),
                template_name="candidate_offer_letter" if update.stage == "Offer" else ("candidate_onboarding_welcome" if update.stage == "Onboarding" else "candidate_stage_update"),
                context={
                    "name": app.name, 
                    "job_title": job_title, 
                    "new_stage": update.stage,
                    "message": message,
                    "documents": [
                        "Valid ID Proof (Aadhar/PAN)",
                        "Educational Certificates",
                        "Previous Employment Relieving Letter",
                        "Last 3 Months Salary Slips",
                        "Signed Offer Letter"
                    ] if update.stage == "Onboarding" else []
                }
            )
            print(f"Scheduled stage update email ({update.stage}) for {app.email}")
            print(f"Skipping email for stage: {update.stage}")

    except Exception as e:
        print(f"Error scheduling stage update email: {e}")
    # ----------------------
    
    # --- ERP Sync (Status Update) ---
    background_tasks.add_task(
        ERPService.update_applicant_status,
        applicant_email=app.email,
        status=update.stage
    )
    # --------------------------------
    
    return app

@router.post("/{applicationId}/offer", status_code=status.HTTP_202_ACCEPTED)
async def send_offer_email(
    applicationId: str, 
    background_tasks: BackgroundTasks,
    salary: float = Form(...),
    startDate: str = Form(...),
    additionalTerms: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    if not PydanticObjectId.is_valid(applicationId):
         raise HTTPException(status_code=404, detail="Application not found")

    app = await Application.get(PydanticObjectId(applicationId))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Fetch Job details
    job_title = "Position"
    if PydanticObjectId.is_valid(app.jobId):
        job = await Job.get(PydanticObjectId(app.jobId))
        if job:
            job_title = job.title

    attachments = [file] if file else None

    background_tasks.add_task(
        send_email,
        recipients=[app.email],
        subject=f"Employment Offer - {job_title}",
        template_name="candidate_offer_letter",
        context={
            "name": app.name,
            "job_title": job_title,
            "salary": salary,
            "start_date": startDate,
            "additional_terms": additionalTerms or ""
        },
        attachments=attachments
    )
    
    # Update candidate offer details (optional but good for record)
    app.offeredSalary = salary
    await app.save()

    # --- ERP Sync (Offer) ---
    background_tasks.add_task(
         ERPService.create_job_offer,
         offer_data={"salary": salary, "date": startDate}, 
         applicant_email=app.email, 
         job_title=job_title
    )
    # ------------------------

    return {"message": "Offer email scheduled"}

@router.patch("/{applicationId}/onboarding/{taskId}", response_model=ApplicationResponse)
async def update_onboarding_task(applicationId: str, taskId: str, status: TaskStatusUpdate):
    if not PydanticObjectId.is_valid(applicationId):
        raise HTTPException(status_code=404, detail="Application not found")

    app = await Application.get(PydanticObjectId(applicationId))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    task_found = False
    for task in app.onboardingTasks:
        if str(task.id) == taskId:
            task.status = status.status
            if status.status == "Completed":
                task.completedDate = datetime.now()
            else:
                task.completedDate = None
            task_found = True
            break
    
    if not task_found:
        raise HTTPException(status_code=404, detail="Task not found")
        
    await app.save()
    return app

@router.post("/{applicationId}/onboarding/remind")
async def send_onboarding_reminder(applicationId: str, background_tasks: BackgroundTasks):
    if not PydanticObjectId.is_valid(applicationId):
         raise HTTPException(status_code=404, detail="Application not found")

    app = await Application.get(PydanticObjectId(applicationId))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Find pending tasks (exclude Completed and Received)
    pending_tasks = [t.task for t in app.onboardingTasks if t.status == "Pending"]
    
    if not pending_tasks:
        return {"message": "No pending tasks to remind about (Received/Completed tasks excluded)"}

    # Fetch job title for subject
    job_title = "Position"
    if PydanticObjectId.is_valid(app.jobId):
        job = await Job.get(PydanticObjectId(app.jobId))
        if job:
            job_title = job.title

    background_tasks.add_task(
        send_email,
        recipients=[app.email],
        subject=f"Urgent: Pending Onboarding Documents - {job_title}",
        template_name="candidate_document_request",
        context={
            "name": app.name,
            "job_title": job_title,
            "documents": pending_tasks
        }
    )
    
    return {"message": f"Reminder sent for {len(pending_tasks)} pending items"}

@router.patch("/{applicationId}/tasks/{taskId}/toggle", response_model=ApplicationResponse)
async def toggle_task(applicationId: str, taskId: str):
    if not PydanticObjectId.is_valid(applicationId):
         raise HTTPException(status_code=404, detail="Application not found")

    app = await Application.get(PydanticObjectId(applicationId))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    found_task = False
    if app.onboardingTasks:
        for task in app.onboardingTasks:
            if str(task.id) == taskId:
                # Toggle between Pending and Completed
                if task.status == "Completed":
                    task.status = "Pending"
                    task.completedDate = None
                else:
                    task.status = "Completed"
                    task.completedDate = datetime.now()
                found_task = True
                break
                
    if found_task:
        await app.save()
        return app
    else:
        raise HTTPException(status_code=404, detail="Task not found")

@router.post("/{applicationId}/tasks", response_model=ApplicationResponse)
async def add_task(applicationId: str, task_in: TaskCreate):
    if not PydanticObjectId.is_valid(applicationId):
         raise HTTPException(status_code=404, detail="Application not found")

    app = await Application.get(PydanticObjectId(applicationId))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    new_task = OnboardingTask(
        id=PydanticObjectId(),
        candidateId=applicationId,
        task=task_in.task,
        status="Pending"
    )
    if app.onboardingTasks is None:
        app.onboardingTasks = []
    app.onboardingTasks.append(new_task)
    
    await app.save()
    return app

@router.delete("/{applicationId}/tasks/{taskId}", response_model=ApplicationResponse)
async def delete_task(applicationId: str, taskId: str):
    if not PydanticObjectId.is_valid(applicationId):
         raise HTTPException(status_code=404, detail="Application not found")

    app = await Application.get(PydanticObjectId(applicationId))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    if app.onboardingTasks:
        initial_len = len(app.onboardingTasks)
        app.onboardingTasks = [t for t in app.onboardingTasks if str(t.id) != taskId]
        if len(app.onboardingTasks) < initial_len:
            await app.save()
            return app
            
    raise HTTPException(status_code=404, detail="Task not found")

@router.patch("/{applicationId}", response_model=ApplicationResponse)
async def update_application(
    applicationId: str,
    app_update: ApplicationUpdate,
    current_user: User = Depends(get_current_user)
):
    if not PydanticObjectId.is_valid(applicationId):
        raise HTTPException(status_code=404, detail="Application not found")

    app = await Application.get(PydanticObjectId(applicationId))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = app_update.model_dump(exclude_unset=True)

    # -------------------------------------------------
    # RBAC: Only HR / Manager / SuperAdmin can assign recruiter
    # -------------------------------------------------
    if "assignedRecruiterId" in update_data:
        if not (
            current_user.role in ["HR", "Manager", "SuperAdmin", "Admin"]
            or current_user.canManageUsers
        ):
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to assign recruiter"
            )

    # -------------------------------------------------
    # STRICT MULTI-TENANCY CHECK (Job must belong to same company)
    # -------------------------------------------------
    if "jobId" in update_data and update_data["jobId"]:
        if not PydanticObjectId.is_valid(update_data["jobId"]):
            raise HTTPException(status_code=400, detail="Invalid jobId")

        job = await Job.get(PydanticObjectId(update_data["jobId"]))
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if job.company != app.company:
            raise HTTPException(
                status_code=400,
                detail="Job does not belong to the same company"
            )

    # -------------------------------------------------
    # Apply updates safely
    # -------------------------------------------------
    for key, value in update_data.items():
        setattr(app, key, value)

    await app.save()
    return app

@router.post("/upload-resume", status_code=status.HTTP_201_CREATED)
async def upload_resume(file: UploadFile = File(...)):
    try:
        # Validate file type
        if file.content_type not in ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            raise HTTPException(status_code=400, detail="Invalid file type. Only PDF and Word documents are allowed.")
        
        file_id = await upload_file_from_stream(file.filename, file.file, file.content_type)
        
        # Return a URL-like string or just the ID that frontend can use to construct the URL
        # We'll return the full URL for the frontend to store in resumeUrl
        return {"url": f"/api/applications/resume/{file_id}", "fileId": file_id}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/resume/{file_id}")

async def get_resume(file_id: str):
    try:
        print(f"Attempting to download resume: {file_id}")
        grid_out = await get_file_stream(file_id)
        if not grid_out:
            print(f"Resume not found for ID: {file_id}")
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Define an async generator to yield chunks from the stream
        async def file_iterator():
            try:
                # Motor GridOut is an async iterator
                async for chunk in grid_out:
                    yield chunk
            except Exception as e:
                print(f"Error during file streaming: {e}")
                import traceback
                traceback.print_exc()
                raise

        # Properly quote the filename to handle special characters
        from urllib.parse import quote
        filename = quote(grid_out.filename)
        
        return StreamingResponse(
            file_iterator(), 
            media_type=grid_out.metadata.get("contentType", "application/octet-stream"),
            headers={"Content-Disposition": f"inline; filename*=utf-8''{filename}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in get_resume: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# Add a new candidate interaction
@router.post("/{application_id}/interactions", response_model=CandidateInteraction)
async def add_candidate_interaction(
    application_id: PydanticObjectId,
    interaction: CandidateInteraction,
    current_user = Depends(get_current_user)  # RBAC can be enforced inside this
):
    # Ensure only recruiter / HR assigned can add
    if current_user.role not in ["SuperAdmin", "HR", "Recruiter"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    app = await Application.get(application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.interactions.append(interaction)
    await app.save()
    return interaction

# Get all interactions for a candidate
@router.get("/{application_id}/interactions", response_model=List[CandidateInteraction])
async def get_candidate_interactions(
    application_id: PydanticObjectId,
    current_user = Depends(get_current_user)
):
    app = await Application.get(application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Only assigned recruiter, HR, or SuperAdmin can view
    if current_user.role not in ["SuperAdmin", "HR", "Recruiter"] and current_user.id != app.assignedRecruiterId:
        raise HTTPException(status_code=403, detail="Not authorized")

    return app.interactions