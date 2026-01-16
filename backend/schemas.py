from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from beanie import PydanticObjectId

# User Schemas
class UserBase(BaseModel):
    name: str
    email: str # Changed from EmailStr to allow usernames (like 'administrator')
    role: str
    company: Optional[str] = None
    canViewSalary: bool = False
    canMoveCandidate: bool = False
    canEditJob: bool = False
    canManageUsers: bool = False
    isSuperUser: bool = False

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    company: Optional[str] = None
    canViewSalary: Optional[bool] = None
    canMoveCandidate: Optional[bool] = None
    canEditJob: Optional[bool] = None
    canManageUsers: Optional[bool] = None
    isSuperUser: Optional[bool] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: str # Changed from EmailStr to allow usernames
    password: str

class UserResponse(UserBase):
    id: PydanticObjectId
    
    model_config = ConfigDict(from_attributes=True)

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Job Schemas
class JobBase(BaseModel):
    title: str
    department: str
    location: str
    type: str # Full-time, Part-time, Contract
    description: str
    requirements: List[str]
    salaryMin: float
    salaryMax: float
    openings: int
    postingChannels: List[str] = []
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    company: Optional[str] = None  # Added company field

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    salaryMin: Optional[float] = None
    salaryMax: Optional[float] = None
    openings: Optional[int] = None
    postingChannels: Optional[List[str]] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    status: Optional[str] = None


class JobResponse(JobBase):
    id: str
    postedDate: datetime
    status: str
    
    model_config = ConfigDict(from_attributes=True)

# Application & Feedback Schemas (Stubbed or full if needed)
class FeedbackBase(BaseModel):
    reviewerId: str
    reviewerName: str
    reviewerRole: str
    comments: str
    decision: str 
    rating: Optional[int] = None
    technicalSkills: Optional[str] = None
    codeQuality: Optional[str] = None
    problemSolving: Optional[str] = None
    cultureFit: Optional[str] = None
    communication: Optional[str] = None
    negotiatedSalary: Optional[float] = None
    roundName: Optional[str] = None
    stage: str

class FeedbackCreate(FeedbackBase):
    pass

class ApplicationBase(BaseModel):
    jobId: str
    name: str
    email: EmailStr
    phone: str
    resumeUrl: str
    photoUrl: Optional[str] = None
    coverLetter: Optional[str] = None
    linkedIn: Optional[str] = None
    portfolio: Optional[str] = None
    yearsOfExperience: Optional[int] = None
    skills: List[str] = []
    source: Optional[str] = None
    currentSalary: Optional[float] = None
    expectedSalary: Optional[float] = None
    offeredSalary: Optional[float] = None

class ApplicationCreate(ApplicationBase):
    pass

class OnboardingTask(BaseModel):
    id: Optional[PydanticObjectId] = None
    candidateId: str
    task: str
    status: str = "Pending"
    completedDate: Optional[datetime] = None

class FeedbackResponse(FeedbackBase):
    id: PydanticObjectId
    candidateId: str
    date: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ApplicationResponse(ApplicationBase):
    id: PydanticObjectId
    stage: str
    appliedDate: datetime
    feedback: List[FeedbackResponse] = []
    rejectionReason: Optional[str] = None
    assignedRecruiterId: Optional[str] = None
    onboardingTasks: List[OnboardingTask] = []

    model_config = ConfigDict(from_attributes=True)


class ApplicationUpdate(BaseModel):
    jobId: Optional[str] = None
    stage: Optional[str] = None
    rejectionReason: Optional[str] = None
    reviewed: Optional[bool] = None
    notes: Optional[str] = None
    assignedRecruiterId: Optional[str] = None

class StageUpdate(BaseModel):
    stage: str
    reason: Optional[str] = None

class TaskCreate(BaseModel):
    task: str

class OfferCreate(BaseModel):
    salary: float
    startDate: str
    additionalTerms: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    status: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class CandidateInteraction(BaseModel):
    recruiterId: str
    recruiterName: str
    method: str                         # Call / Email / Message
    status: str                         # Pending / Completed / No Answer / Rescheduled
    candidateUpdate: Optional[str] = None # Candidate feedback: Available / Delayed / Not Interested
    note: Optional[str] = None          # Candidate feedback: Available / Delayed / Not Interested
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    scheduledAt: Optional[datetime] = None 

class InterviewSchedule(BaseModel):
    id: PydanticObjectId = Field(default_factory=PydanticObjectId)

    # Context
    applicationId: str
    candidateId: str

    # Who created the schedule (HR / Recruiter)
    createdById: str
    createdByRole: str  # HR | Recruiter

    # Who will take the interview
    interviewerId: Optional[str] = None
    interviewerName: Optional[str] = None

    # Interview details
    scheduledAt: datetime
    mode: str  # In-Person | Video | Call
    roundName: Optional[str] = None

    # Lifecycle
    status: str = "Scheduled"
    # Scheduled | Completed | Cancelled | Rescheduled | No-Show

    createdAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )