import { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  FileText,
  IndianRupee,
  Calendar,
  MessageSquare,
  ArrowLeft,
  AlertCircle,
  UserCheck,
  Edit2,
  Globe,
  CheckCircle2,
  Pencil,
  Trash2,
  Linkedin,
} from "lucide-react";
import { User, Candidate, CandidateStage, Job } from "../types";
import { api } from "../lib/api";
import { InterviewFeedbackModal } from "./InterviewFeedbackModal";
import { CandidateInteractions } from "./CandidateInteractions";
import { RejectionModal } from "./RejectionModal";
import { OfferModal } from "./OfferModal";

interface CandidateDetailProps {
  user: User;
  candidateId: string;
  navigateTo: (screen: string) => void;
}

export function CandidateDetail({
  user,
  candidateId,
  navigateTo,
}: CandidateDetailProps) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "history" | "feedback" | "emails" | "documents" | "onboarding" | "interactions"
  >("feedback");
  const [showFeedbackModal, setShowFeedbackModal] =
    useState(false);
  const [showRejectionModal, setShowRejectionModal] =
    useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [newJobId, setNewJobId] = useState("");
  const [editingFeedback, setEditingFeedback] = useState<any>(null);

  const fetchCandidate = async () => {
    try {
      const data = await api.applications.getById(candidateId);
      setCandidate(data);
    } catch (error) {
      console.error("Failed to fetch candidate:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidate();
  }, [candidateId]);

  useEffect(() => {
    // Fetch all jobs for the reassignment dropdown
    const fetchAllJobs = async () => {
      try {
        const data = await api.jobs.getAll();
        setAllJobs(data);
      } catch (error) {
        console.error("Failed to fetch all jobs:", error);
      }
    };
    fetchAllJobs();

    if (candidate?.jobId) {
      const fetchJob = async () => {
        try {
          const data = await api.jobs.getById(candidate.jobId);
          setJob(data);
        } catch (error) {
          console.error("Failed to fetch job:", error);
        }
      };
      fetchJob();
    }
  }, [candidate?.jobId]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p>Loading candidate details...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="p-8 text-center">
        <p>Candidate not found</p>
        <button
          onClick={() => navigateTo('pipeline')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to Pipeline
        </button>
      </div>
    );
  }

  // Enforce Recruiter ownership
  if (user.role === 'Recruiter' && candidate.assignedRecruiterId && candidate.assignedRecruiterId !== user.id) {
    return (
      <div className="p-8 text-center">
        <div className="flex flex-col items-center gap-4 text-red-600">
          <AlertCircle className="w-12 h-12" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view this candidate.</p>
          <button
            onClick={() => navigateTo('pipeline')}
            className="text-blue-600 hover:underline"
          >
            Back to Pipeline
          </button>
        </div>
      </div>
    );
  }

  // Use feedback from the candidate object, defaulting to empty array if undefined
  const candidateFeedback = candidate.feedback || [];

  const handleResumeClick = (e: React.MouseEvent) => {
    if (candidate.resumeUrl === '#' || !candidate.resumeUrl) {
      e.preventDefault();
      alert("This is a mock resume. In a real application, this would open the uploaded file.");
    }
  };

  const getNextStage = (
    currentStage: CandidateStage,
  ): CandidateStage | null => {
    const stages: CandidateStage[] = [
      "Applied",
      "Screening",
      "Round 1",
      "Round 2",
      "Round 3",
      "Management Round",
      "Offer",
      "Background Verification",
      "Onboarding",
    ];
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 1) {
      return stages[currentIndex + 1];
    }
    return null;
  };

  const handleAdvance = async () => {
    const nextStage = getNextStage(candidate.stage);
    if (nextStage) {
      try {
        await api.applications.updateStage(candidate.id, nextStage);
        setCandidate({ ...candidate, stage: nextStage });
        alert(`Candidate advanced to ${nextStage}`);
      } catch (error) {
        console.error("Failed to advance candidate:", error);
        alert("Failed to advance candidate. Please try again.");
      }
    }
  };

  const handleSkipRound = async () => {
    // Skip Management Round logic
    if (candidate.stage === "Round 3") {
      try {
        await api.applications.updateStage(candidate.id, "Offer");
        setCandidate({ ...candidate, stage: "Offer" });
        alert("Management Round skipped. Candidate moved to Offer stage.");
      } catch (error) {
        console.error("Failed to skip round:", error);
        alert("Failed to skip round. Please try again.");
      }
    }
  };

  const handleReject = async (
    reason: string,
    feedback: string,
    sendEmail: boolean,
  ) => {
    try {
      // Submit rejection feedback
      await api.applications.submitFeedback(candidate.id, {
        candidateId: candidate.id,
        stage: candidate.stage,
        roundName: "Rejection Decision",
        reviewerId: user.id,
        reviewerName: user.name,
        reviewerRole: user.role,
        date: new Date().toISOString(),
        rating: 0,
        comments: `[Reason: ${reason}] ${feedback}`,
        decision: "Reject",
      });

      // Update stage
      await api.applications.updateStage(candidate.id, "Rejected");

      setCandidate({ ...candidate, stage: "Rejected" });
      alert(
        `Candidate rejected. Reason: ${reason}. Email sent: ${sendEmail}`,
      );
      setShowRejectionModal(false);
      // Refresh candidate to show new feedback
      fetchCandidate();
    } catch (error) {
      console.error("Failed to reject candidate:", error);
      alert("Failed to reject candidate. Please try again.");
    }
  };

  const handleOfferGenerated = async (salary: number, startDate: string, additionalTerms?: string, file?: File) => {
    try {
      await api.applications.sendOffer(candidate.id, { salary, startDate, additionalTerms, file });

      setCandidate({
        ...candidate,
        offeredSalary: salary,
        stage: "Offer",
      });
      // OfferModal handles the close and alert on success now (or we can do it here)
    } catch (error) {
      console.error("Failed to send offer:", error);
      throw error; // Re-throw to be caught by OfferModal
    }
    setShowOfferModal(false);
  };



  const handleJobChange = async () => {
    if (newJobId && newJobId !== candidate.jobId) {
      try {
        await api.applications.update(candidate.id, { jobId: newJobId });
        setCandidate({ ...candidate, jobId: newJobId });
        alert("Candidate reassigned to new job successfully");
        setIsEditingJob(false);
      } catch (error: any) {
        console.error("Failed to update job:", error);
        alert(error.message || "Failed to update job");
      }
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (window.confirm("Are you sure you want to delete this feedback?")) {
      try {
        await api.applications.deleteFeedback(candidate.id, feedbackId);
        fetchCandidate();
      } catch (error) {
        console.error("Failed to delete feedback:", error);
        alert("Failed to delete feedback");
      }
    }
  };



  const nextStage = getNextStage(candidate.stage);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <button
        onClick={() => navigateTo("pipeline")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 md:mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Pipeline
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Sidebar - Profile */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white">
                <span className="text-3xl">
                  {candidate.name.charAt(0)}
                </span>
              </div>
              <h2 className="text-gray-900 mb-1">
                {candidate.name}
              </h2>
              <div className="text-gray-600 text-sm">
                <div className="text-gray-600 text-sm flex items-center justify-center gap-2">
                  {isEditingJob ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newJobId || candidate.jobId}
                        onChange={(e) => setNewJobId(e.target.value)}
                        className="border rounded px-2 py-1 text-sm max-w-[200px]"
                      >
                        {allJobs.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.title}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleJobChange}
                        className="text-green-600 hover:text-green-700 text-xs font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingJob(false)}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>{job?.title}</span>
                      {user.canEditJob && (
                        <button
                          onClick={() => {
                            setNewJobId(candidate.jobId);
                            setIsEditingJob(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit Job"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Attractive Source Badge */}
            {candidate.source && (
              <div className="flex justify-center mb-6 px-4">
                {(() => {
                  const getSourceStyle = (s: string) => {
                    const source = s.toLowerCase();
                    // Filled pastel styles matching the Pipeline design
                    if (source.includes('linkedin')) return 'bg-blue-100 text-blue-700';
                    if (source.includes('referral')) return 'bg-purple-100 text-purple-700';
                    if (source.includes('internshala')) return 'bg-sky-100 text-sky-700';
                    if (source.includes('walk-in')) return 'bg-orange-100 text-orange-800';
                    if (source.includes('career')) return 'bg-indigo-100 text-indigo-700';
                    if (source.includes('naukri')) return 'bg-teal-100 text-teal-800';
                    return 'bg-gray-100 text-gray-700';
                  };

                  const getSourceIcon = (s: string) => {
                    const source = s.toLowerCase();
                    if (source.includes('referral')) return <UserCheck className="w-4 h-4" />;
                    if (source.includes('walk-in')) return <UserCheck className="w-4 h-4" />;
                    return <Globe className="w-4 h-4" />;
                  };

                  return (
                    <div className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all hover:scale-105 cursor-default ${getSourceStyle(candidate.source)}`}>
                      {getSourceIcon(candidate.source)}
                      <span className="text-sm font-semibold tracking-wide antialiased">
                        {candidate.source}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-gray-600 text-sm">Email</p>
                  <p className="text-gray-900">
                    {candidate.email}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-gray-600 text-sm">Phone</p>
                  <p className="text-gray-900">
                    {candidate.phone}
                  </p>
                </div>
              </div>



              {candidate.linkedIn && (
                <div className="flex items-start gap-3">
                  <Linkedin className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-600 text-sm">LinkedIn</p>
                    <a
                      href={candidate.linkedIn.trim().startsWith('http') ? candidate.linkedIn.trim() : `https://${candidate.linkedIn.trim()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      View Profile
                    </a>
                  </div>
                </div>
              )}

              {candidate.coverLetter && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-600 text-sm">Cover Letter</p>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {candidate.coverLetter}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-gray-600 text-sm">
                    Resume
                  </p>
                  <a
                    href={(() => {
                      if (!candidate.resumeUrl || candidate.resumeUrl === '#') return '#';
                      if (candidate.resumeUrl.startsWith('http')) return candidate.resumeUrl;
                      const apiBase = import.meta.env.VITE_API_URL || '';
                      // If apiBase ends with /api and url starts with /api, strip one to avoid duplication
                      if (apiBase.endsWith('/api') && candidate.resumeUrl.startsWith('/api/')) {
                        return `${apiBase.slice(0, -4)}${candidate.resumeUrl}`;
                      }
                      return `${apiBase}${candidate.resumeUrl}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleResumeClick}
                    className="text-blue-600 hover:underline"
                  >
                    View Resume
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-gray-600 text-sm">
                    Applied Date
                  </p>
                  <p className="text-gray-900">
                    {new Date(
                      candidate.appliedDate,
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Referral Information */}
              {candidate.referredBy && (
                <div className="flex items-start gap-3">
                  <UserCheck className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-600 text-sm">
                      Referred By
                    </p>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 mt-1">
                      <p className="text-purple-900">
                        {candidate.referredBy}
                      </p>
                      <p className="text-purple-600 text-xs">
                        Employee Referral
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Salary Information - Hidden from Tech Interviewers */}
              {user.canViewSalary && (
                <>
                  {!!candidate.currentSalary && (
                    <div className="flex items-start gap-3">
                      <IndianRupee className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm">
                          Current Salary
                        </p>
                        <p className="text-gray-900">
                          ₹
                          {candidate.currentSalary.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {!!candidate.expectedSalary && (
                    <div className="flex items-start gap-3">
                      <IndianRupee className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm">
                          Expected Salary
                        </p>
                        <p className="text-green-600">
                          ₹
                          {candidate.expectedSalary.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {!!candidate.offeredSalary && (
                    <div className="flex items-start gap-3">
                      <IndianRupee className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-gray-600 text-sm">
                          Offered Salary
                        </p>
                        <p className="text-green-600">
                          ₹
                          {candidate.offeredSalary.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Info for Tech Interviewers */}
              {!user.canViewSalary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-800 text-xs">
                      Salary information is hidden based on your
                      role permissions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center - Timeline & Feedback */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Current Stage Banner */}
            <div className={`rounded-lg p-4 md:p-6 text-white mb-6 ${candidate.stage === 'Rejected' ? 'bg-red-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
              <p className="text-sm mb-1 opacity-90">
                Current Stage
              </p>
              <h2 className="break-words">{candidate.stage}</h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-2 text-xs sm:text-sm whitespace-nowrap ${activeTab === "history"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab("interactions")}
                className={`px-3 py-2 text-xs sm:text-sm whitespace-nowrap ${activeTab === "interactions"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Interactions
              </button>
              <button
                onClick={() => setActiveTab("feedback")}
                className={`px-3 py-2 text-xs sm:text-sm whitespace-nowrap ${activeTab === "feedback"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Feedback
              </button>
              <button
                onClick={() => setActiveTab("emails")}
                className={`px-3 py-2 text-xs sm:text-sm whitespace-nowrap ${activeTab === "emails"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Emails
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`px-3 py-2 text-xs sm:text-sm whitespace-nowrap ${activeTab === "documents"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Documents
              </button>
              <button
                onClick={() => setActiveTab("onboarding")}
                className={`px-3 py-2 text-xs sm:text-sm whitespace-nowrap ${activeTab === "onboarding"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Onboarding
              </button>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === "interactions" && (
                <CandidateInteractions
                  candidateId={candidate.id}
                  user={user}
                />
              )}

              {activeTab === "feedback" && (
                <>
                  <div className="max-h-[500px] overflow-y-auto mb-4 space-y-4">
                    {candidateFeedback.length > 0 ? (
                      candidateFeedback.map((feedback) => (
                        <div
                          key={feedback.id}
                          className="bg-gray-50 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-gray-900 font-medium">
                              {feedback.stage}
                            </p>
                            <span className="text-gray-500 text-xs">
                              {new Date(
                                feedback.date,
                              ).toLocaleString([], {
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-gray-600 text-sm">
                              Reviewer: {feedback.reviewerName}{" "}
                              ({feedback.reviewerRole})
                            </p>
                            {user.id === feedback.reviewerId && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingFeedback(feedback);
                                    setShowFeedbackModal(true);
                                  }}
                                  className="p-1 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteFeedback(feedback.id)}
                                  className="p-1 hover:bg-red-100 rounded-full text-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          <p className="text-gray-800 text-sm font-medium mb-2">
                            Round: {feedback.roundName}
                          </p>
                          {feedback.rating && (
                            <div className="mb-2">
                              <span className="text-yellow-500">
                                {"★".repeat(feedback.rating)}
                              </span>
                              <span className="text-gray-300">
                                {"★".repeat(5 - feedback.rating)}
                              </span>
                            </div>
                          )}
                          <p className="text-gray-700">
                            {feedback.comments}
                          </p>
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span
                              className={`px-3 py-1 rounded-full text-sm ${feedback.decision === "Advance"
                                ? "bg-green-100 text-green-700"
                                : feedback.decision ===
                                  "Reject"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                                }`}
                            >
                              {feedback.decision}
                            </span>
                          </div>

                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No feedback yet
                      </div>
                    )}
                  </div>

                  {candidate.stage !== "Rejected" && (
                    <button
                      onClick={() => setShowFeedbackModal(true)}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Feedback
                    </button>
                  )}
                </>
              )}

              {activeTab === "history" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-gray-900">
                        {candidate.stage}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Current stage
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-gray-900">Applied</p>
                      <p className="text-gray-500 text-sm">
                        {new Date(
                          candidate.appliedDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "emails" && (
                <div className="text-center py-8 text-gray-500">
                  No email communications yet
                </div>
              )}

              {activeTab === "documents" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-gray-900">
                        Resume.pdf
                      </p>
                      <p className="text-gray-500 text-sm">
                        Uploaded{" "}
                        {new Date(
                          candidate.appliedDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "onboarding" && (
                <div className="space-y-4">
                  <h3 className="text-gray-900 font-medium mb-4">Onboarding Checklist</h3>
                  {candidate.onboardingTasks && candidate.onboardingTasks.filter(t => t.status === 'Completed').length > 0 ? (
                    <div className="space-y-3">
                      {candidate.onboardingTasks.filter(t => t.status === 'Completed').map((task) => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100 justify-between">
                          <div className="flex-1 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-green-900">
                                {task.task}
                              </p>
                              <span className="text-xs text-green-700">Completed</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No completed onboarding tasks yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
            <h3 className="text-gray-900 mb-4">Actions</h3>

            <div className="space-y-3">
              {user.canMoveCandidate && nextStage && (
                <button
                  onClick={handleAdvance}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  Advance to {nextStage}
                </button>
              )}

              {candidate.stage === "Round 3" &&
                user.role === "Manager" &&
                user.canMoveCandidate && (
                  <button
                    onClick={handleSkipRound}
                    className="w-full bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Skip Management Round
                  </button>
                )}

              {candidate.stage === "Offer" &&
                user.role === "HR" &&
                user.canMoveCandidate && (
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Generate Offer
                  </button>
                )}

              {user.canMoveCandidate && candidate.stage !== "Rejected" && (
                <button
                  onClick={() => setShowRejectionModal(true)}
                  className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject Candidate
                </button>
              )}

              <a
                href={`mailto:${candidate.email}`}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Send Email
              </a>

              {candidate.stage === "Onboarding" && (
                <button
                  onClick={async () => {
                    if (confirm("Send email to candidate requesting pending documents?")) {
                      try {
                        const res = await api.applications.sendOnboardingReminder(candidate.id);
                        alert(res.message);
                      } catch (err) {
                        console.error(err);
                        alert("Failed to send reminder");
                      }
                    }
                  }}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Request Documents
                </button>
              )}
            </div>

            {/* Permission Info */}
            {!user.canMoveCandidate && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  You can provide feedback but cannot move
                  candidates between stages.
                </p>
              </div>
            )}
          </div>
        </div>
      </div >

      {/* Modals */}
      {
        showFeedbackModal && (
          <InterviewFeedbackModal
            candidate={candidate}
            user={user}
            initialData={editingFeedback}
            feedbackId={editingFeedback?.id}
            onClose={() => {
              setShowFeedbackModal(false);
              setEditingFeedback(null);
            }}
            onFeedbackSubmitted={() => {
              fetchCandidate();
              setShowFeedbackModal(false);
              setEditingFeedback(null);
            }}
          />
        )
      }

      {
        showRejectionModal && (
          <RejectionModal
            candidate={candidate}
            onReject={handleReject}
            onClose={() => setShowRejectionModal(false)}
          />
        )
      }

      {
        showOfferModal && (
          <OfferModal
            candidate={candidate}
            job={job || undefined}
            onGenerate={handleOfferGenerated}
            onClose={() => setShowOfferModal(false)}
          />
        )
      }
    </div >
  );
}