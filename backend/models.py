from typing import List, Optional
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import EmailStr, Field
from .schemas import UserBase, JobBase, FeedbackBase, ApplicationBase, CandidateInteraction, InterviewSchedule, EvaluationScore

class User(Document, UserBase):
    id: Optional[PydanticObjectId] = None
    password: str 
    company: Optional[str] = None # Added for multi-tenancy
    reset_token: Optional[str] = None #forgot password f
    reset_token_expiry: Optional[datetime] = None #forgot password f
    class Settings:
        name = "users"
        indexes = [
            [("email", 1)],
            "company" # Index company for faster lookups
        ]

class Job(Document, JobBase):
    id: Optional[PydanticObjectId] = None
    postedDate: datetime
    status: str
    company: Optional[str] = None # Added for multi-tenancy

    class Settings:
        name = "jobs"
        indexes = [
            [("status", 1)],
            [("postedDate", -1)],
            "title",
            "company" # Index company
        ]

class Feedback(FeedbackBase):
    id: PydanticObjectId = Field(default_factory=PydanticObjectId)
    candidateId: str
    date: datetime

class OnboardingTask(Document):
    id: Optional[PydanticObjectId] = None
    candidateId: str
    task: str
    status: str = "Pending"  # valid: Pending, Received, Completed, Cannot Receive
    completedDate: Optional[datetime] = None

    class Settings:
        name = "onboarding_tasks"

class Application(Document, ApplicationBase):
    id: Optional[PydanticObjectId] = None
    stage: str
    appliedDate: datetime
    feedback: List[Feedback] = []
    rejectionReason: Optional[str] = None
    assignedRecruiterId: Optional[str] = None
    onboardingTasks: List[OnboardingTask] = []
    company: Optional[str] = None # Added for multi-tenancy
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
            "company" # Index company
        ]

class RefreshToken(Document):
    id: Optional[PydanticObjectId] = None
    user_id: PydanticObjectId  # link to User
    token: str
    expires_at: datetime

    class Settings:
        name = "refresh_tokens"  # collection name in MongoDB
        indexes = [
            "user_id",
            [("expires_at", 1)]  # optional TTL index for cleanup
        ]