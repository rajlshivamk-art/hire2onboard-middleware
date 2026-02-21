from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from beanie import PydanticObjectId
from datetime import date

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
    requirements: List[str] = Field(default_factory=list)
    salaryMin: float
    salaryMax: float
    openings: int
    postingChannels: List[str] = Field(default_factory=list)
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

# Application & Feedback Schemas
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

class OnboardingDocument(BaseModel):
    type: str
    fileId: str
    fileHash: str
    originalName: str
    mimeType: str
    uploadedAt: datetime

class PreviousEmployment(BaseModel):
    companyName: str
    hrName: Optional[str] = None
    hrEmail: Optional[EmailStr] = None
    employmentStartDate: date
    employmentEndDate: Optional[date] = None
    consentToContact: bool = False

    # Validate end date after start date
    @field_validator("employmentEndDate")
    def validate_dates(cls, v, info):
        start_date = info.data.get("employmentStartDate")
        if v and start_date and v < start_date:
            raise ValueError("employmentEndDate cannot be before employmentStartDate")
        return v

    # Validate consent if HR email is provided
    @field_validator("consentToContact")
    def validate_consent(cls, v, info):
        hr_email = info.data.get("hrEmail")
        if hr_email and not v:
            raise ValueError("Consent is required if HR email is provided")
        return v

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
    skills: List[str] = Field(default_factory=list)
    source: Optional[str] = None
    currentSalary: Optional[float] = None
    expectedSalary: Optional[float] = None
    offeredSalary: Optional[float] = None
    dob: Optional[date] = None
    documents: List[OnboardingDocument] = Field(default_factory=list)
    uploadTokenHash: Optional[str] = None
    uploadTokenExpiry: Optional[datetime] = None
    previousEmployments: List[PreviousEmployment] = Field(default_factory=list)

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

class InterviewSchedule(BaseModel):
    id: PydanticObjectId = Field(default_factory=PydanticObjectId)
    applicationId: str
    candidateId: str
    createdById: str
    createdByRole: str
    interviewerId: Optional[str] = None
    interviewerName: Optional[str] = None
    assignedBy: Optional[str] = None
    assignedAt: Optional[datetime] = None
    scheduledAt: datetime
    mode: str
    roundName: Optional[str] = None
    status: str = "Scheduled"
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EvaluationScore(BaseModel):
    roundName: str
    roundId: str
    technical: Optional[float] = Field(None, ge=0, le=5)
    communication: Optional[float] = Field(None, ge=0, le=5)
    problemSolving: Optional[float] = Field(None, ge=0, le=5)
    cultureFit: Optional[float] = Field(None, ge=0, le=5)
    overall: Optional[float] = Field(None, ge=0, le=5)
    reviewerId: str
    reviewerRole: str
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ApplicationResponse(ApplicationBase):
    id: PydanticObjectId
    stage: str
    appliedDate: datetime
    skills: List[str] = Field(default_factory=list)
    evaluationScores: List[EvaluationScore] = Field(default_factory=list)
    cumulativeScore: Optional[float] = None
    feedback: List[FeedbackResponse] = Field(default_factory=list)
    rejectionReason: Optional[str] = None
    assignedRecruiterId: Optional[str] = None
    onboardingTasks: List[OnboardingTask] = Field(default_factory=list)
    interviewSchedules: List[InterviewSchedule] = Field(default_factory=list)
    
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
    method: str
    status: str
    candidateUpdate: Optional[str] = None
    note: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    scheduledAt: Optional[datetime] = None

class EmailEvent(BaseModel):
    type: str
    timestamp: datetime
    ip: Optional[str] = None
    userAgent: Optional[str] = None
    source: Optional[str] = None
    confidence: Optional[str] = None
