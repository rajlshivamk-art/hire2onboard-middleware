import { useState, useEffect } from 'react';
import { CheckCircle2, User as UserIcon, Calendar, Trash2, Plus, Briefcase } from 'lucide-react';
import { User, Candidate, CandidateDocument } from '../types';
import { api } from '../lib/api';
import toast from "react-hot-toast";

interface OnboardingScreenProps {
  user: User;
  navigateTo: (screen: string, params?: any) => void;
}

export function OnboardingScreen({ user, navigateTo }: OnboardingScreenProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [candidatesData, jobsData] = await Promise.all([
          api.applications.getAll(),
          api.jobs.getAll()
        ]);
        setCandidates(candidatesData);
        setJobs(jobsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.id]);

  const onboardingCandidates = candidates.filter((c) => c.stage === 'Onboarding');



  const handleAddTask = async (candidateId: string) => {
    const task = taskInputs[candidateId];
    if (!task || !task.trim()) return;

    try {
      await api.applications.addTask(candidateId, task);
      setTaskInputs({ ...taskInputs, [candidateId]: '' });
      const data = await api.applications.getAll();
      setCandidates(data);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleDeleteTask = async (candidateId: string, taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.applications.deleteTask(candidateId, taskId);
      const data = await api.applications.getAll();
      setCandidates(data);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleViewDocument = async (candidateId: string, docType: string) => {
    try {
      // Fetch the file using centralized api
      const blob = await api.onboarding.getDocument(candidateId, docType);

      // Create URL and open in new tab
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL, "_blank");

      toast.success("Document opened successfully");
    } catch (error: any) {
      console.error("Failed to fetch document:", error);

      if (error.response?.status === 401) {
        toast.error("You are not authenticated. Please login again.");
      } else {
        toast.error("Failed to open document");
      }
    }
  };




  const handleMarkAsHired = async (candidateId: string) => {
    try {
      await api.applications.updateStage(candidateId, 'Hired');

      toast.success("Candidate marked as hired 🎉");

      const data = await api.applications.getAll();
      setCandidates(data);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;

      if (detail?.missingDocuments?.length) {
        const missing = detail.missingDocuments
          .map((d: string) => d.replace(/_/g, " ").toLowerCase())
          .join(", ");

        toast.error(
          `Missing mandatory documents: ${missing}`,
          { duration: 6000 }
        );
      } else {
        toast.error("Failed to mark candidate as hired");
      }
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="mb-8">
        <h1 className="text-white text-3xl font-semibold mb-2">Onboarding</h1>
        <p className="text-white/70">Manage onboarding process for new hires</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-300"></div>
        </div>
      ) : onboardingCandidates.length === 0 ? (
        <div className="glass-card rounded-3xl border border-white/10 p-12 text-center shadow-2xl max-w-xl mx-auto">
          <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-cyan-300" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">No candidates in onboarding</h2>
          <p className="text-white/70">Candidates who reach the onboarding stage will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {onboardingCandidates.map((candidate) => {
            const job = jobs.find((j) => j.id === candidate.jobId);
            const candidateTasks = candidate.onboardingTasks || [];
            const completedTasks = candidateTasks.filter((t) => t.status === 'Completed').length;
            const totalTasks = candidateTasks.length;
            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            const handleUpdateTaskStatus = async (taskId: string, status: string) => {
              try {
                await api.applications.updateOnboardingTask(candidate.id, taskId, status);
                // Refresh
                const data = await api.applications.getAll();
                setCandidates(data);
              } catch (error) {
                console.error('Failed to update task:', error);
              }
            };

            const handleSendReminder = async () => {
              if (!confirm(`Send document request email to ${candidate.name}?`)) return;
              try {
                await api.onboarding.sendUploadLink(candidate.id);
                toast.success("Onboarding document link sent to candidate email");
              } catch (error) {
                console.error("Failed to send email:", error);
                alert("Failed to send email");
              }
            };

            return (
              <div key={candidate.id} className="glass-card rounded-[28px] border border-white/10 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-slate-900 rounded-full flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                          <span className="text-lg">{candidate.name.charAt(0)}</span>
                        </div>
                        <div>
                          <h2 className="text-white text-xl font-semibold">{candidate.name}</h2>
                          <p className="text-white/70">{job?.title}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-sm text-white/60 mt-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Applied: {new Date(candidate.appliedDate).toLocaleDateString()}
                        </div>
                        {candidate.offeredSalary && user.canViewSalary && (
                          <div className="text-emerald-300 font-medium">
                            Offered: ₹{candidate.offeredSalary.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSendReminder}
                        className="px-4 py-2 border border-cyan-500/20 text-cyan-200 hover:bg-white/10 rounded-2xl transition-colors flex items-center gap-2"
                        title="Send reminder for pending documents"
                      >
                        <Briefcase className="w-4 h-4" />
                        Request Documents
                      </button>

                      <button
                        onClick={() => navigateTo('candidate-detail', { candidateId: candidate.id })}
                        className="px-4 py-2 text-white/90 border border-white/10 hover:bg-white/10 rounded-2xl transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/80">Onboarding Progress</p>
                      <p className="text-white/60">{completedTasks} / {totalTasks} completed</p>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="p-6">
                  <h3 className="text-white text-xl font-semibold mb-4">Onboarding Checklist</h3>
                  <div className="space-y-3">
                    {candidateTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex flex-col gap-4 p-4 rounded-3xl border border-white/10 bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex-1">
                          <p className={`font-medium ${task.status === 'Completed' ? 'text-emerald-300' : 'text-white'}`}>{task.task}</p>
                        </div>

                        {/* Radio Group */}
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer rounded-full px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors">
                            <input
                              type="radio"
                              name={`status-${candidate.id}-${task.id}`}
                              checked={task.status === 'Pending'}
                              onChange={() => handleUpdateTaskStatus(task.id, 'Pending')}
                              className="w-4 h-4 accent-amber-400 focus:ring-2 focus:ring-amber-400"
                            />
                            <span className={`text-sm ${task.status === 'Pending' ? 'text-amber-300 font-medium' : 'text-white/70'}`}>Pending</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer rounded-full px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors">
                            <input
                              type="radio"
                              name={`status-${candidate.id}-${task.id}`}
                              checked={task.status === 'Received'}
                              onChange={() => handleUpdateTaskStatus(task.id, 'Received')}
                              className="w-4 h-4 accent-cyan-400 focus:ring-2 focus:ring-cyan-400"
                            />
                            <span className={`text-sm ${task.status === 'Received' ? 'text-cyan-300 font-medium' : 'text-white/70'}`}>Received</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer rounded-full px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors">
                            <input
                              type="radio"
                              name={`status-${candidate.id}-${task.id}`}
                              checked={task.status === 'Completed'}
                              onChange={() => handleUpdateTaskStatus(task.id, 'Completed')}
                              className="w-4 h-4 accent-emerald-400 focus:ring-2 focus:ring-emerald-400"
                            />
                            <span className={`text-sm ${task.status === 'Completed' ? 'text-emerald-300 font-medium' : 'text-white/70'}`}>Completed</span>
                          </label>
                        </div>

                        {user.canManageUsers && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(candidate.id, task.id);
                            }}
                            className="ml-0 sm:ml-4 text-white/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Task Input */}
                  <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/10 sm:flex-row">
                    <input
                      type="text"
                      placeholder="Add new task..."
                      className="flex-1 px-4 py-3 rounded-2xl glass-input text-white/90"
                      value={taskInputs[candidate.id] || ''}
                      onChange={(e) => setTaskInputs({ ...taskInputs, [candidate.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTask(candidate.id);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAddTask(candidate.id)}
                      className="px-4 py-3 bg-cyan-500 text-slate-950 rounded-2xl hover:bg-cyan-400 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!taskInputs[candidate.id]?.trim()}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>

                <div className="mt-6 pb-4">
                  <h4 className="text-sm font-medium text-white/80 mb-3 px-4">
                    Uploaded Documents
                  </h4>

                  {candidate.documents?.length ? (
                    <div className="flex flex-wrap gap-2 px-4">
                      {candidate.documents.map((doc: CandidateDocument) => (
                        <button
                          key={doc.type}
                          onClick={() => handleViewDocument(candidate.id, doc.type)}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white/80 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                          <span className="capitalize whitespace-nowrap">
                            {doc.type.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/60 text-sm px-4">No documents uploaded yet.</p>
                  )}
                </div>


                {progress === 100 && (
                  <div className="mt-6 bg-emerald-500/10 border border-emerald-400/20 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mx-6 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">Ready to Hire</h4>
                        <p className="text-white/70 text-sm">All tasks completed. Mark {candidate.name} as hired.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkAsHired(candidate.id)}
                      className="px-6 py-2.5 bg-emerald-500 text-slate-950 font-medium rounded-2xl hover:bg-emerald-400 transition-colors shadow-sm flex items-center gap-2"
                    >
                      <Briefcase className="w-4 h-4" />
                      Mark as Hired
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}