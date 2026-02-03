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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Onboarding</h1>
        <p className="text-gray-600">Manage onboarding process for new hires</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : onboardingCandidates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-gray-900 mb-2">No candidates in onboarding</h2>
          <p className="text-gray-600">Candidates who reach the onboarding stage will appear here.</p>
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
              <div key={candidate.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white">
                          <span className="text-lg">{candidate.name.charAt(0)}</span>
                        </div>
                        <div>
                          <h2 className="text-gray-900">{candidate.name}</h2>
                          <p className="text-gray-600">{job?.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Applied: {new Date(candidate.appliedDate).toLocaleDateString()}
                        </div>
                        {candidate.offeredSalary && user.canViewSalary && (
                          <div className="text-green-600">
                            Offered: ₹{candidate.offeredSalary.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSendReminder}
                        className="px-4 py-2 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                        title="Send reminder for pending documents"
                      >
                        <Briefcase className="w-4 h-4" /> {/* Using Briefcase as generic icon since Mail might need import */}
                        Request Documents
                      </button>

                      <button
                        onClick={() => navigateTo('candidate-detail', { candidateId: candidate.id })}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-700">Onboarding Progress</p>
                      <p className="text-gray-600">{completedTasks} / {totalTasks} completed</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="p-6">
                  <h3 className="text-gray-900 mb-4">Onboarding Checklist</h3>
                  <div className="space-y-3">
                    {candidateTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className={`font-medium ${task.status === 'Completed' ? 'text-green-700' : 'text-gray-900'}`}>{task.task}</p>
                        </div>

                        {/* Radio Group */}
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-yellow-50 p-1 rounded">
                            <input
                              type="radio"
                              name={`status-${candidate.id}-${task.id}`}
                              checked={task.status === 'Pending'}
                              onChange={() => handleUpdateTaskStatus(task.id, 'Pending')}
                              className="w-4 h-4 text-yellow-600 border-gray-300 focus:ring-yellow-500"
                            />
                            <span className={`text-sm ${task.status === 'Pending' ? 'text-yellow-700 font-medium' : 'text-gray-600'}`}>Pending</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-1 rounded">
                            <input
                              type="radio"
                              name={`status-${candidate.id}-${task.id}`}
                              checked={task.status === 'Received'}
                              onChange={() => handleUpdateTaskStatus(task.id, 'Received')}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className={`text-sm ${task.status === 'Received' ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>Received</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer hover:bg-green-50 p-1 rounded">
                            <input
                              type="radio"
                              name={`status-${candidate.id}-${task.id}`}
                              checked={task.status === 'Completed'}
                              onChange={() => handleUpdateTaskStatus(task.id, 'Completed')}
                              className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                            />
                            <span className={`text-sm ${task.status === 'Completed' ? 'text-green-700 font-medium' : 'text-gray-600'}`}>Completed</span>
                          </label>
                        </div>

                        {/* Delete Action - kept from original */}
                        {user.canManageUsers && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(candidate.id, task.id);
                            }}
                            className="ml-4 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Task Input */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <input
                      type="text"
                      placeholder="Add new task..."
                      className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      disabled={!taskInputs[candidate.id]?.trim()}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>

                <div className="mt-6 pb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 px-4">
                    Uploaded Documents
                  </h4>

                  {candidate.documents?.length ? (
                    <div className="flex flex-wrap gap-2 px-4">
                      {candidate.documents.map((doc: CandidateDocument) => (
                        <button
                          key={doc.type}
                          onClick={() => handleViewDocument(candidate.id, doc.type)}
                          className="
            inline-flex items-center gap-2
            px-3 py-1.5
            text-sm text-gray-800
            rounded-full
            border border-gray-200
            bg-gray-50
            shadow-sm
            hover:bg-gray-100
            hover:border-gray-300
            transition
            cursor-pointer
          "
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          <span className="capitalize whitespace-nowrap">
                            {doc.type.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm px-4">No documents uploaded yet.</p>
                  )}
                </div>


                {progress === 100 && (
                  <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mx-6 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-green-900">Ready to Hire</h4>
                        <p className="text-green-700 text-sm">All tasks completed. Mark {candidate.name} as hired.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkAsHired(candidate.id)}
                      className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
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