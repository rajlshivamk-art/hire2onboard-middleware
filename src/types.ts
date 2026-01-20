export type UserRole = 'HR' | 'Tech Interviewer' | 'Manager' | 'Recruiter';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  canViewSalary: boolean;
  canMoveCandidate: boolean;
  canEditJob: boolean;
  canManageUsers: boolean;
  company?: string;
}

export type CandidateStage =
  | 'Applied'
  | 'Screening'
  | 'Round 1'
  | 'Round 2'
  | 'Round 3'
  | 'Management Round'
  | 'Offer'
  | 'Background Verification'
  | 'Onboarding'
  | 'Hired'
  | 'Rejected'
  | 'Hold'
  | 'Archived';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeUrl: string;
  photoUrl?: string;
  jobId: string;
  stage: CandidateStage;
  appliedDate: string;
  feedback: Feedback[];
  currentSalary?: number;
  expectedSalary?: number;
  offeredSalary?: number;
  rejectionReason?: string;
  referredBy?: string;
  assignedRecruiterId?: string;
  coverLetter?: string;
  linkedIn?: string;
  portfolio?: string;
  yearsOfExperience?: number;
  onboardingTasks?: OnboardingTask[];
  source?: string;
  skills?: string[];
  interviewSchedules?: InterviewSchedule[];
}

export interface Feedback {
  id: string;
  candidateId: string;
  stage: CandidateStage;
  roundName?: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: UserRole;
  date: string;
  rating?: number;
  technicalSkills?: string;
  codeQuality?: string;
  problemSolving?: string;
  cultureFit?: string;
  communication?: string;
  negotiatedSalary?: number;
  comments: string;
  decision: 'Advance' | 'Reject' | 'Hold';
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract';
  description: string;
  requirements: string[];
  salaryRange: { min: number; max: number };
  status: 'Open' | 'Closed' | 'On Hold' | 'Active';
  postedDate: string;
  startDate?: string;
  endDate?: string;
  openings: number;
  postingChannels?: string[];
  company?: string;
}

export interface OnboardingTask {
  id: string;
  candidateId: string;
  task: string;
  status: 'Pending' | 'Received' | 'Completed' | 'Cannot Receive';
  completedDate?: string;
}

export interface InterviewSchedule {
  id: string;
  applicationId: string;
  scheduledAt: string;
  roundName?: string;
  mode: string;
  status: "Scheduled" | "Completed" | "Cancelled" | "No-Show" | "Rescheduled";
  createdById: string;
  createdByRole: string;
}


let accessToken: string | null = localStorage.getItem('access_token');

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
};

export const clearAccessToken = () => {
  accessToken = null;
};

export type Application = {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  resumeUrl: string;
  photoUrl?: string;
  coverLetter?: string;
  linkedIn?: string;
  portfolio?: string;
  yearsOfExperience?: number;
  skills: string[];
  source?: string;
  currentSalary?: number;
  expectedSalary?: number;
  offeredSalary?: number;

  stage: CandidateStage;
  appliedDate: string;
  feedback: Feedback[];
  rejectionReason?: string;
  assignedRecruiterId?: string;
  onboardingTasks: OnboardingTask[];
  company?: string;
  interactions: any[];
  interviewSchedules: InterviewSchedule[];
}
