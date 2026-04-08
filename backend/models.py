from typing import List, Optional
from datetime import datetime
from uuid import uuid4

from beanie import Document, PydanticObjectId
from pydantic import Field

from .schemas import (
    UserBase,
    JobBase,
    FeedbackBase,
    ApplicationBase,
    CandidateInteraction,
    InterviewSchedule,
    EvaluationScore,
    EmailEvent,
)

# ===========================================================
# USER
# ===========================================================
class User(Document, UserBase):
    id: Optional[PydanticObjectId] = None
    password: str
    company: Optional[str] = None
    reset_token: Optional[str] = None
    reset_token_expiry: Optional[datetime] = None

    class Settings:
        name = "users"
        indexes = [
            [("email", 1)],
            "company",
        ]


# ===========================================================
# JOB
# ===========================================================
class Job(Document, JobBase):
    id: Optional[PydanticObjectId] = None
    postedDate: datetime
    status: str
    company: Optional[str] = None

    class Settings:
        name = "jobs"
        indexes = [
            [("status", 1)],
            [("postedDate", -1)],
            "title",
            "company",
        ]


# ===========================================================
# FEEDBACK (EMBEDDED)
# ===========================================================
class Feedback(FeedbackBase):
    id: PydanticObjectId = Field(default_factory=PydanticObjectId)
    candidateId: str
    date: datetime


# ===========================================================
# ONBOARDING TASK
# ===========================================================
class OnboardingTask(Document):
    id: Optional[PydanticObjectId] = None
    candidateId: str
    task: str
    status: str = "Pending"
    completedDate: Optional[datetime] = None

    class Settings:
        name = "onboarding_tasks"


# ===========================================================
# APPLICATION
# ===========================================================
class Application(Document, ApplicationBase):
    id: Optional[PydanticObjectId] = None
    stage: str
    appliedDate: datetime
    feedback: List[Feedback] = []
    rejectionReason: Optional[str] = None
    assignedRecruiterId: Optional[str] = None
    onboardingTasks: List[OnboardingTask] = []
    company: Optional[str] = None

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
            "dob",
        ]


# ===========================================================
# REFRESH TOKEN
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
            [("expires_at", 1)],
        ]


# ===========================================================
# EMAIL TRACKING
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

    class Settings:
        name = "email_tracking"
        indexes = ["trackingId", "applicationId", "candidateEmail"]


# ===========================================================
# 🔥 BITRIX PORTAL (NEW)
# ===========================================================
class Portal(Document):
    id: Optional[PydanticObjectId] = None

    member_id: str
    access_token: str
    refresh_token: Optional[str] = None
    domain: Optional[str] = None
    expires_at: datetime

    class Settings:
        name = "portals"
        indexes = [
            "member_id",
            [("expires_at", 1)],
        ]


# ===========================================================
# 🔥 BITRIX INTEGRATION (NEW)
# ===========================================================
class Integration(Document):
    id: Optional[PydanticObjectId] = None

    user_id: PydanticObjectId
    crm_type: str = "BITRIX"

    access_token: str
    refresh_token: Optional[str] = None
    api_domain: Optional[str] = None

    member_id: str
    expires_at: datetime

    status: str = "ACTIVE"
    last_error: Optional[str] = None
    last_tested_at: Optional[datetime] = None

    class Settings:
        name = "integrations"
        indexes = [
            "user_id",
            "member_id",
            [("expires_at", 1)],
        ]