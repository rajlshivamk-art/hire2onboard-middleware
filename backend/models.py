from typing import List, Optional
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import EmailStr, Field
from uuid import uuid4

from .schemas import (
    UserBase,
    JobBase,
    FeedbackBase,
    ApplicationBase,
    CandidateInteraction,
    InterviewSchedule,
    EvaluationScore,
    EmailEvent
)

# ===========================================================
# 🏢 COMPANY (NEW - SaaS TENANT)
# ===========================================================
class Company(Document):
    name: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "companies"



# ===========================================================
# 👤 USER
# ===========================================================
class User(Document, UserBase):
    id: Optional[PydanticObjectId] = None

    password: str

    # 🔥 OLD FIELD (KEEP - backward compatibility)
    company: Optional[str] = None

    # ✅ NEW FIELD (SaaS)
    companyId: Optional[PydanticObjectId] = None

    # Reset password
    reset_token: Optional[str] = None
    reset_token_expiry: Optional[datetime] = None

    class Settings:
        name = "users"
        indexes = [
            [("email", 1)],
            "company",
            "companyId"  # ✅ IMPORTANT for SaaS queries
        ]


# ===========================================================
# 💼 JOB
# ===========================================================
class Job(Document, JobBase):
    id: Optional[PydanticObjectId] = None

    postedDate: datetime
    status: str

    # 🔥 OLD
    company: Optional[str] = None

    # ✅ NEW
    companyId: Optional[PydanticObjectId] = None

    class Settings:
        name = "jobs"
        indexes = [
            [("status", 1)],
            [("postedDate", -1)],
            "title",
            "company",
            "companyId"
        ]


# ===========================================================
# 📝 FEEDBACK (Embedded)
# ===========================================================
class Feedback(FeedbackBase):
    id: PydanticObjectId = Field(default_factory=PydanticObjectId)
    candidateId: str
    date: datetime


# ===========================================================
# 📋 ONBOARDING TASK
# ===========================================================
class OnboardingTask(Document):
    id: Optional[PydanticObjectId] = None

    candidateId: str
    task: str
    status: str = "Pending"
    completedDate: Optional[datetime] = None

    # ✅ SaaS ready
    companyId: Optional[PydanticObjectId] = None

    class Settings:
        name = "onboarding_tasks"


# ===========================================================
# 📄 APPLICATION
# ===========================================================
class Application(Document, ApplicationBase):
    id: Optional[PydanticObjectId] = None

    stage: str
    appliedDate: datetime

    feedback: List[Feedback] = []
    rejectionReason: Optional[str] = None
    assignedRecruiterId: Optional[str] = None
    onboardingTasks: List[OnboardingTask] = []

    # 🔥 OLD
    company: Optional[str] = None

    # ✅ NEW
    companyId: Optional[PydanticObjectId] = None

    interactions: List[CandidateInteraction] = []
    interviewSchedules: List[InterviewSchedule] = []
    evaluationScores: List[EvaluationScore] = []
    cumulativeScore: Optional[float] = None

    class Settings:
        name = "applications"
        indexes = [
            "assignedRecruiterId",
            "jobId",
            "stage",
            [("appliedDate", -1)],
            "source",
            "company",
            "companyId",
            "dob"
        ]


# ===========================================================
# 🔑 REFRESH TOKEN
# ===========================================================
class RefreshToken(Document):
    id: Optional[PydanticObjectId] = None

    user_id: PydanticObjectId
    token: str
    expires_at: datetime

    class Settings:
        name = "refresh_tokens"
        indexes = [
            "user_id",
            [("expires_at", 1)]
        ]


# ===========================================================
# 📧 EMAIL TRACKING
# ===========================================================
class EmailTracking(Document):
    id: Optional[PydanticObjectId] = None

    applicationId: str
    candidateEmail: str

    trackingId: str = Field(default_factory=lambda: str(uuid4()))

    template: str
    subject: str

    sentAt: datetime = Field(default_factory=datetime.utcnow)

    openedAt: Optional[datetime] = None
    openCount: int = 0

    clickedAt: Optional[datetime] = None
    clickCount: int = 0

    events: List[EmailEvent] = Field(default_factory=list)

    lastOpenedAt: Optional[datetime] = None
    lastOpenIP: Optional[str] = None
    lastUserAgent: Optional[str] = None
    lastOpenSource: Optional[str] = None
    openConfidence: Optional[str] = None

    # ✅ SaaS ready
    companyId: Optional[PydanticObjectId] = None

    class Settings:
        name = "email_tracking"
        indexes = [
            "trackingId",
            "applicationId",
            "candidateEmail",
            "companyId"
        ]


# ===========================================================
# 🔗 INTEGRATION (BITRIX ETC)
# ===========================================================
class Integration(Document):
    id: Optional[PydanticObjectId] = None

    member_id: str
    domain: Optional[str] = None

    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None

    # ✅ SaaS ready
    companyId: Optional[PydanticObjectId] = None

    class Settings:
        name = "integrations"
        indexes = ["member_id", "companyId"]


# ===========================================================
# 🌐 PORTAL (BITRIX)
# ===========================================================
class Portal(Document):
    id: Optional[PydanticObjectId] = None

    member_id: str
    access_token: str
    refresh_token: Optional[str] = None
    domain: Optional[str] = None
    expires_at: Optional[datetime] = None

    # ✅ SaaS ready
    companyId: Optional[PydanticObjectId] = None

    class Settings:
        name = "portals"
        indexes = ["member_id", "companyId"]