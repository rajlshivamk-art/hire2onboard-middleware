import { useState, useEffect } from 'react';
import { Users, Briefcase, Calendar, Clock, TrendingUp, AlertCircle, UserCheck, Plus } from 'lucide-react';
import { User, Candidate } from '../types';
import { AddCandidateModal } from './AddCandidateModal';
import { BulkUploadApplications } from "./BulkUploadApplications";
import { api } from '../lib/api';
import toast from 'react-hot-toast';

interface DashboardProps {
  user: User;
  navigateTo: (screen: string, params?: any) => void;
}

const interviewReminderCache = new Set<string>();
let isToastQueueRunning = false;
let hasRunReminderSession = false;


// Utility to calculate time ago (duplicated from KanbanBoard for consistency)
function getTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + "y ago";
  if (interval === 1) return "1y ago";

  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + "mo ago";
  if (interval === 1) return "1mo ago";

  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + "d ago";
  if (interval === 1) return "1d ago";

  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + "h ago";
  if (interval === 1) return "1h ago";

  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + "m ago";
  if (interval === 1) return "1m ago";

  if (seconds < 30) return "Just now";
  return Math.floor(seconds) + "s ago";
}

export function Dashboard({ user, navigateTo }: DashboardProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(false);


  const fetchData = async () => {
    try {
      const [candidatesData, jobsData] = await Promise.all([
        api.applications.getAll(),
        api.jobs.getAll(),
      ]);

      setCandidates(candidatesData);
      setJobs(jobsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    interviewReminderCache.clear();
    isToastQueueRunning = false;
    hasRunReminderSession = false;
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const refreshData = () => fetchData();

  // ---------------- FILTERED CANDIDATES ----------------
  const filteredCandidates = candidates.filter(c => {
    if (dateFilter === 'all') return true;

    const appliedAt = new Date(c.appliedDate);
    if (Number.isNaN(appliedAt.getTime())) return false;

    if (dateFilter === 'custom') {
      if (!customStartDate || !customEndDate) return true;
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return appliedAt >= start && appliedAt <= end;
    }

    const diffDays =
      Math.abs(Date.now() - appliedAt.getTime()) /
      (1000 * 60 * 60 * 24);

    if (dateFilter === '30d') return diffDays <= 30;
    if (dateFilter === '3m') return diffDays <= 90;
    if (dateFilter === '6m') return diffDays <= 180;
    if (dateFilter === '1y') return diffDays <= 365;

    return true;
  });

  // ---------------- METRICS ----------------
  const openJobs = jobs.filter(
    j => j.status === 'Open' || j.status === 'Active'
  ).length;

  const totalCandidates = filteredCandidates.length;

  const candidatesInPipeline = filteredCandidates.filter(
    c => !['Rejected', 'Archived', 'Onboarding'].includes(c.stage)
  ).length;

  // ---------------- UPCOMING INTERVIEWS (FINAL & SAFE) ----------------
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingInterviews = filteredCandidates
    .flatMap(application =>
      (application.interviewSchedules ?? []).map(interview => ({
        candidate: application,
        interview,
      }))
    )
    .filter(({ interview }) => {
      if (!interview?.scheduledAt) return false;

      const date = new Date(interview.scheduledAt);
      if (Number.isNaN(date.getTime())) return false;

      return (
        interview.status?.toLowerCase() === 'scheduled' &&
        date >= today
      );
    })
    .sort(
      (a, b) =>
        new Date(a.interview.scheduledAt).getTime() -
        new Date(b.interview.scheduledAt).getTime()
    );

  // ---------------- TOAST ON NEW INTERVIEW ----------------
  const formatTimeDiff = (diffMs: number) => {
    const totalMinutes = Math.floor(diffMs / 60000);

    if (totalMinutes < 60) {
      return `${Math.max(1, totalMinutes)}m`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours < 24) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  };

  useEffect(() => {
    if (loading) return;
    if (hasRunReminderSession) return; // 🚫 stop re-run on navigation
    if (isToastQueueRunning) return;

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const TOAST_DURATION = 5000;
    const now = Date.now();

    const queue = upcomingInterviews
      .map(({ interview, candidate }) => {
        const ts = new Date(interview.scheduledAt).getTime();
        return { interview, candidate, diffMs: ts - now };
      })
      .filter(
        i =>
          i.diffMs > 0 &&
          i.diffMs <= ONE_DAY_MS &&
          !interviewReminderCache.has(i.interview.id)
      )
      .sort((a, b) => a.diffMs - b.diffMs);

    if (queue.length === 0) {
      hasRunReminderSession = true;
      return;
    }

    isToastQueueRunning = true;
    hasRunReminderSession = true; // ✅ mark session as handled

    const showToastAtIndex = (index: number) => {
      if (index >= queue.length) {
        toast(
          `📅 ${queue.length} interview${queue.length > 1 ? "s" : ""} scheduled today`,
          {
            duration: 2000,
            style: {
              background: "#1f2937",
              color: "#fff",
            },
          }
        );

        isToastQueueRunning = false;
        return;
      }

      const { interview, candidate, diffMs } = queue[index];
      const timeText = formatTimeDiff(diffMs);

      toast(
        `Interview with ${candidate.name} in ${timeText} (${interview.roundName})`,

        {
          duration: TOAST_DURATION,
          style: {
            background: "#111827",
            color: "#e5e7eb",
          },
        }
      );

      interviewReminderCache.add(interview.id);

      setTimeout(() => {
        showToastAtIndex(index + 1);
      }, TOAST_DURATION + 300);
    };

    showToastAtIndex(0);
  }, [upcomingInterviews, loading]);

  // ---------------- PENDING ACTIONS ----------------
  const pendingActions = filteredCandidates.filter(
    c => c.stage === 'Round 2' && user.role === 'Tech Interviewer'
  );

  // ---------------- REFERRALS ----------------
  const referredCandidates = filteredCandidates.filter(
    c => c.referredBy && c.referredBy.trim() !== ''
  );

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }


  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 md:mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-gray-900 mb-2">Welcome back, {user.name}</h1>
          <p className="text-gray-600">Here's what's happening with your recruitment today.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Custom Date Inputs */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer outline-none"
            >
              <option value="all">All Time</option>
              <option value="30d">Last 30 Days</option>
              <option value="3m">Last 3 Months</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>
      </div>


      {/* KPI Cards */}
      < div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8" >
        <div
          onClick={() => navigateTo('jobs')}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 p-6 cursor-pointer hover:shadow-2xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Open Jobs</p>
          <p className="text-gray-900 text-3xl">{openJobs}</p>
        </div>

        <div
          onClick={() => navigateTo('candidate-list', { filter: 'total' })}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 p-6 cursor-pointer hover:shadow-2xl hover:border-purple-300 hover:-translate-y-1 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Candidates</p>
          <p className="text-gray-900 text-3xl">{totalCandidates}</p>
        </div>

        <div
          onClick={() => navigateTo('pipeline')}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-green-100 p-6 cursor-pointer hover:shadow-2xl hover:border-green-300 hover:-translate-y-1 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all">
              <Clock className="w-7 h-7 text-white" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">In Pipeline</p>
          <p className="text-gray-900 text-3xl">{candidatesInPipeline}</p>
        </div>

        <div
          onClick={() => navigateTo('pipeline')}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-orange-100 p-6 cursor-pointer hover:shadow-2xl hover:border-orange-300 hover:-translate-y-1 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-all">
              <Calendar className="w-7 h-7 text-white" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Upcoming Interviews</p>
          <p className="text-gray-900 text-3xl">{upcomingInterviews.length}</p>
        </div>
      </div >



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Referred Candidates - Priority for HR */}
        {user.role === 'HR' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-gray-900">Employee Referrals</h2>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                  {referredCandidates.length}
                </span>
              </div>
              <UserCheck className="w-5 h-5 text-purple-500" />
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {referredCandidates.length > 0 ? (
                referredCandidates.map((candidate) => {
                  const job = jobs.find(j => j.id === candidate.jobId);
                  return (
                    <div
                      key={candidate.id}
                      className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 cursor-pointer transition-colors"
                      onClick={() => navigateTo('candidate-detail', { candidateId: candidate.id })}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-gray-900">{candidate.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-blue-600 text-sm">{job?.title || 'Position Not Found'}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500 text-sm">{job?.department}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${candidate.stage === 'Rejected' ? 'bg-red-100 text-red-700' :
                          candidate.stage === 'Offer' ? 'bg-green-100 text-green-700' :
                            candidate.stage === 'Onboarding' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-blue-100 text-blue-700'
                          }`}>
                          {candidate.stage}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-purple-200">
                        <UserCheck className="w-4 h-4 text-purple-600" />
                        <p className="text-purple-700 text-sm">
                          Referred by: <strong>{candidate.referredBy}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-gray-400 text-xs">Applied:</span>
                        {(() => {
                          const timeText = getTimeAgo(candidate.appliedDate);
                          return (
                            <span className={`text-xs font-medium ${timeText === 'Just now' ? 'text-green-600' : 'text-gray-500'}`}>
                              {timeText}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No referred candidates yet</p>
              )}
            </div>
            {referredCandidates.length > 0 && (
              <button
                onClick={() => navigateTo('pipeline')}
                className="w-full mt-4 text-purple-600 text-sm hover:underline"
              >
                View all in pipeline →
              </button>
            )}
          </div>
        )}

        {/* Upcoming Interviews */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">Upcoming Interviews</h2>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {upcomingInterviews.slice(0, 5).map(({ candidate, interview }) => {
              const job = jobs.find(j => j.id === candidate.jobId);

              return (
                <div
                  key={interview.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition"
                  onClick={() =>
                    navigateTo('candidate-detail', { candidateId: candidate.id })
                  }
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-900">{candidate.name}</p>
                      <p className="text-sm text-gray-600">
                        {job?.title || 'Position'} · {interview.roundName}
                      </p>
                    </div>

                    <span className="text-sm font-medium text-blue-600 whitespace-nowrap">
                      {new Date(interview.scheduledAt).toLocaleDateString()}{' '}
                      {new Date(interview.scheduledAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    Scheduled interview
                  </div>
                </div>
              );
            })}

            {upcomingInterviews.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">
                No upcoming interviews scheduled
              </p>
            )}
          </div>
        </div>
        {/* Pending Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">Pending Actions</h2>
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="space-y-3">
            {user.role === 'Tech Interviewer' && pendingActions.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-800 mb-2">
                  {pendingActions.length} candidate{pendingActions.length > 1 ? 's' : ''} waiting for Round 2 feedback
                </p>
                <button
                  onClick={() => navigateTo('pipeline')}
                  className="text-orange-600 text-sm hover:underline"
                >
                  Review now →
                </button>
              </div>
            )}
            {user.role === 'HR' && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 mb-2">
                    {candidates.filter(c => c.stage === 'Screening').length} candidates in screening
                  </p>
                  <button
                    onClick={() => navigateTo('pipeline')}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    View pipeline →
                  </button>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 mb-2">
                    {candidates.filter(c => c.stage === 'Offer').length} pending offers
                  </p>
                  <button
                    onClick={() => navigateTo('pipeline')}
                    className="text-green-600 text-sm hover:underline"
                  >
                    Manage offers →
                  </button>
                </div>
              </>
            )}
            {user.role === 'Manager' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-purple-800 mb-2">
                  {candidates.filter(c => c.stage === 'Management Round').length} candidates for management round
                </p>
                <button
                  onClick={() => navigateTo('pipeline')}
                  className="text-purple-600 text-sm hover:underline"
                >
                  Review candidates →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {
        user.canEditJob && (
          <div className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-sm p-6 text-white">
            <h2 className="mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">

              <button
                onClick={() => navigateTo('create-job')}
                className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Post New Job
              </button>
              <button
                onClick={() => navigateTo('pipeline')}
                className="bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors"
              >
                View Pipeline
              </button>
              <button
                onClick={() => setShowAddCandidateModal(true)}
                className="bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Walk-in Candidate
              </button>
              <button
                onClick={() => setShowBulkUpload(true)}
                className="bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors"
              >
                Bulk Upload Candidates
              </button>

            </div>
          </div>
        )
      }
      {showBulkUpload && (
        <BulkUploadApplications
          jobs={jobs}
          onSuccess={() => {
            setShowBulkUpload(false);
            refreshData();
          }}
        />
      )}

      {
        showAddCandidateModal && (
          <AddCandidateModal
            onClose={() => setShowAddCandidateModal(false)}
            onSuccess={() => {
              setShowAddCandidateModal(false);
              refreshData();
            }}
          />
        )
      }
    </div >
  );
}