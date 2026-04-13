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

  useEffect(() => { fetchData(); }, [user.id]);

  const refreshData = () => fetchData();

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
    const diffDays = Math.abs(Date.now() - appliedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (dateFilter === '30d') return diffDays <= 30;
    if (dateFilter === '3m') return diffDays <= 90;
    if (dateFilter === '6m') return diffDays <= 180;
    if (dateFilter === '1y') return diffDays <= 365;
    return true;
  });

  const openJobs = jobs.filter(j => j.status === 'Open' || j.status === 'Active').length;
  const totalCandidates = filteredCandidates.length;
  const candidatesInPipeline = filteredCandidates.filter(
    c => !['Rejected', 'Archived', 'Onboarding'].includes(c.stage)
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingInterviews = filteredCandidates
    .flatMap(application =>
      (application.interviewSchedules ?? []).map(interview => ({ candidate: application, interview }))
    )
    .filter(({ interview }) => {
      if (!interview?.scheduledAt) return false;
      const date = new Date(interview.scheduledAt);
      if (Number.isNaN(date.getTime())) return false;
      return interview.status?.toLowerCase() === 'scheduled' && date >= today;
    })
    .sort((a, b) =>
      new Date(a.interview.scheduledAt).getTime() - new Date(b.interview.scheduledAt).getTime()
    );

  const formatTimeDiff = (diffMs: number) => {
    const totalMinutes = Math.floor(diffMs / 60000);
    if (totalMinutes < 60) return `${Math.max(1, totalMinutes)}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  };

  useEffect(() => {
    if (loading) return;
    if (hasRunReminderSession) return;
    if (isToastQueueRunning) return;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const TOAST_DURATION = 5000;
    const now = Date.now();
    const queue = upcomingInterviews
      .map(({ interview, candidate }) => {
        const ts = new Date(interview.scheduledAt).getTime();
        return { interview, candidate, diffMs: ts - now };
      })
      .filter(i => i.diffMs > 0 && i.diffMs <= ONE_DAY_MS && !interviewReminderCache.has(i.interview.id))
      .sort((a, b) => a.diffMs - b.diffMs);
    if (queue.length === 0) { hasRunReminderSession = true; return; }
    isToastQueueRunning = true;
    hasRunReminderSession = true;
    const showToastAtIndex = (index: number) => {
      if (index >= queue.length) {
        toast(`📅 ${queue.length} interview${queue.length > 1 ? "s" : ""} scheduled today`, {
          duration: 2000,
          style: { background: "rgba(12,10,48,0.92)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px" },
        });
        isToastQueueRunning = false;
        return;
      }
      const { interview, candidate, diffMs } = queue[index];
      toast(`Interview with ${candidate.name} in ${formatTimeDiff(diffMs)} (${interview.roundName})`, {
        duration: TOAST_DURATION,
        style: { background: "rgba(12,10,48,0.92)", color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px" },
      });
      interviewReminderCache.add(interview.id);
      setTimeout(() => showToastAtIndex(index + 1), TOAST_DURATION + 300);
    };
    showToastAtIndex(0);
  }, [upcomingInterviews, loading]);

  const pendingActions = filteredCandidates.filter(
    c => c.stage === 'Round 2' && user.role === 'Tech Interviewer'
  );
  const referredCandidates = filteredCandidates.filter(
    c => c.referredBy && c.referredBy.trim() !== ''
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl text-white/60 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-2">

      {/* ── Header ── */}
      <div className="mb-6 md:mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-white/90 mb-1">Welcome back, {user.name}</h1>
          <p className="text-white/50 text-sm">Here's what's happening with your recruitment today.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs bg-transparent border border-white/10 rounded-lg px-2 py-1
                  text-white/70 focus:ring-1 focus:ring-indigo-500/50 outline-none"
              />
              <span className="text-white/30 text-xs">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs bg-transparent border border-white/10 rounded-lg px-2 py-1
                  text-white/70 focus:ring-1 focus:ring-indigo-500/50 outline-none"
              />
            </div>
          )}

          <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-white/40" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-none text-sm text-white/80
                focus:ring-0 cursor-pointer outline-none"
            >
              <option value="all"  className="bg-[#0d0840]">All Time</option>
              <option value="30d"  className="bg-[#0d0840]">Last 30 Days</option>
              <option value="3m"   className="bg-[#0d0840]">Last 3 Months</option>
              <option value="6m"   className="bg-[#0d0840]">Last 6 Months</option>
              <option value="1y"   className="bg-[#0d0840]">Last Year</option>
              <option value="custom" className="bg-[#0d0840]">Custom Range</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">

        <div
          onClick={() => navigateTo('jobs')}
          className="glass-card p-6 cursor-pointer hover:bg-white/10 hover:-translate-y-1
            transition-all duration-300 group shadow-glass"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600
              rounded-xl flex items-center justify-center shadow-primary
              group-hover:shadow-primary-lg transition-all">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div className="w-7 h-7 bg-green-500/20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
          </div>
          <p className="text-white/50 text-sm mb-1">Open Jobs</p>
          <p className="text-white/90 text-3xl font-medium">{openJobs}</p>
        </div>

        <div
          onClick={() => navigateTo('candidate-list', { filter: 'total' })}
          className="glass-card p-6 cursor-pointer hover:bg-white/10 hover:-translate-y-1
            transition-all duration-300 group shadow-glass"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600
              rounded-xl flex items-center justify-center
              shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-white/50 text-sm mb-1">Total Candidates</p>
          <p className="text-white/90 text-3xl font-medium">{totalCandidates}</p>
        </div>

        <div
          onClick={() => navigateTo('pipeline')}
          className="glass-card p-6 cursor-pointer hover:bg-white/10 hover:-translate-y-1
            transition-all duration-300 group shadow-glass"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600
              rounded-xl flex items-center justify-center
              shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-white/50 text-sm mb-1">In Pipeline</p>
          <p className="text-white/90 text-3xl font-medium">{candidatesInPipeline}</p>
        </div>

        <div
          onClick={() => navigateTo('pipeline')}
          className="glass-card p-6 cursor-pointer hover:bg-white/10 hover:-translate-y-1
            transition-all duration-300 group shadow-glass"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600
              rounded-xl flex items-center justify-center
              shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-all">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-white/50 text-sm mb-1">Upcoming Interviews</p>
          <p className="text-white/90 text-3xl font-medium">{upcomingInterviews.length}</p>
        </div>
      </div>

      {/* ── Lower panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

        {/* Referred Candidates */}
        {user.role === 'HR' && (
          <div className="glass-card p-6 shadow-glass">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-white/90 text-base font-medium">Employee Referrals</h2>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30
                  px-2.5 py-0.5 rounded-full text-xs">
                  {referredCandidates.length}
                </span>
              </div>
              <UserCheck className="w-5 h-5 text-purple-400" />
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {referredCandidates.length > 0 ? (
                referredCandidates.map((candidate) => {
                  const job = jobs.find(j => j.id === candidate.jobId);
                  return (
                    <div
                      key={candidate.id}
                      className="p-4 glass rounded-xl hover:bg-white/10 cursor-pointer
                        transition-all duration-200 border border-purple-500/20"
                      onClick={() => navigateTo('candidate-detail', { candidateId: candidate.id })}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-white/90 text-sm font-medium">{candidate.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-indigo-400 text-xs">{job?.title || 'Position Not Found'}</span>
                            <span className="text-white/20">•</span>
                            <span className="text-white/40 text-xs">{job?.department}</span>
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs border whitespace-nowrap ${
                          candidate.stage === 'Rejected'
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : candidate.stage === 'Offer'
                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                            : candidate.stage === 'Onboarding'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          {candidate.stage}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                        <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                        <p className="text-purple-300 text-xs">
                          Referred by: <strong className="text-purple-200">{candidate.referredBy}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-white/30 text-xs">Applied:</span>
                        {(() => {
                          const timeText = getTimeAgo(candidate.appliedDate);
                          return (
                            <span className={`text-xs font-medium ${
                              timeText === 'Just now' ? 'text-green-400' : 'text-white/40'
                            }`}>
                              {timeText}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-white/35 text-sm text-center py-6">No referred candidates yet</p>
              )}
            </div>
            {referredCandidates.length > 0 && (
              <button
                onClick={() => navigateTo('pipeline')}
                className="w-full mt-4 text-indigo-400 text-sm hover:text-indigo-300
                  transition-colors duration-200"
              >
                View all in pipeline →
              </button>
            )}
          </div>
        )}

        {/* Upcoming Interviews */}
        <div className="glass-card p-6 shadow-glass">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white/90 text-base font-medium">Upcoming Interviews</h2>
            <Calendar className="w-5 h-5 text-white/30" />
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {upcomingInterviews.slice(0, 5).map(({ candidate, interview }) => {
              const job = jobs.find(j => j.id === candidate.jobId);
              return (
                <div
                  key={interview.id}
                  className="p-4 glass rounded-xl hover:bg-white/10 cursor-pointer
                    transition-all duration-200"
                  onClick={() => navigateTo('candidate-detail', { candidateId: candidate.id })}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/90 text-sm font-medium">{candidate.name}</p>
                      <p className="text-white/45 text-xs mt-0.5">
                        {job?.title || 'Position'} · {interview.roundName}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-indigo-400 whitespace-nowrap">
                      {new Date(interview.scheduledAt).toLocaleDateString()}{' '}
                      {new Date(interview.scheduledAt).toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-white/30">
                    <Clock className="w-3 h-3" />
                    Scheduled interview
                  </div>
                </div>
              );
            })}
            {upcomingInterviews.length === 0 && (
              <p className="text-white/35 text-sm text-center py-6">
                No upcoming interviews scheduled
              </p>
            )}
          </div>
        </div>

        {/* Pending Actions */}
        <div className="glass-card p-6 shadow-glass">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white/90 text-base font-medium">Pending Actions</h2>
            <AlertCircle className="w-5 h-5 text-orange-400" />
          </div>
          <div className="space-y-3">
            {user.role === 'Tech Interviewer' && pendingActions.length > 0 && (
              <div className="glass rounded-xl p-4 border border-orange-500/25">
                <p className="text-orange-300 text-sm mb-2">
                  {pendingActions.length} candidate{pendingActions.length > 1 ? 's' : ''} waiting for Round 2 feedback
                </p>
                <button
                  onClick={() => navigateTo('pipeline')}
                  className="text-orange-400 text-xs hover:text-orange-300 transition-colors"
                >
                  Review now →
                </button>
              </div>
            )}
            {user.role === 'HR' && (
              <>
                <div className="glass rounded-xl p-4 border border-blue-500/25">
                  <p className="text-blue-300 text-sm mb-2">
                    {candidates.filter(c => c.stage === 'Screening').length} candidates in screening
                  </p>
                  <button onClick={() => navigateTo('pipeline')}
                    className="text-blue-400 text-xs hover:text-blue-300 transition-colors">
                    View pipeline →
                  </button>
                </div>
                <div className="glass rounded-xl p-4 border border-green-500/25">
                  <p className="text-green-300 text-sm mb-2">
                    {candidates.filter(c => c.stage === 'Offer').length} pending offers
                  </p>
                  <button onClick={() => navigateTo('pipeline')}
                    className="text-green-400 text-xs hover:text-green-300 transition-colors">
                    Manage offers →
                  </button>
                </div>
              </>
            )}
            {user.role === 'Manager' && (
              <div className="glass rounded-xl p-4 border border-purple-500/25">
                <p className="text-purple-300 text-sm mb-2">
                  {candidates.filter(c => c.stage === 'Management Round').length} candidates for management round
                </p>
                <button onClick={() => navigateTo('pipeline')}
                  className="text-purple-400 text-xs hover:text-purple-300 transition-colors">
                  Review candidates →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      {user.canEditJob && (
        <div className="mt-6 glass-card p-6 shadow-glass border border-indigo-500/25">
          <h2 className="text-white/90 text-base font-medium mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigateTo('create-job')}
              className="btn-glass-primary px-5 py-2.5 rounded-xl text-sm"
            >
              Post New Job
            </button>
            <button
              onClick={() => navigateTo('pipeline')}
              className="btn-glass-ghost px-5 py-2.5 rounded-xl text-sm"
            >
              View Pipeline
            </button>
            <button
              onClick={() => setShowAddCandidateModal(true)}
              className="btn-glass-ghost px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Walk-in Candidate
            </button>
            <button
              onClick={() => setShowBulkUpload(true)}
              className="btn-glass-ghost px-5 py-2.5 rounded-xl text-sm"
            >
              Bulk Upload Candidates
            </button>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <BulkUploadApplications
          jobs={jobs}
          onSuccess={() => { setShowBulkUpload(false); refreshData(); }}
        />
      )}

      {showAddCandidateModal && (
        <AddCandidateModal
          onClose={() => setShowAddCandidateModal(false)}
          onSuccess={() => { setShowAddCandidateModal(false); refreshData(); }}
        />
      )}
    </div>
  );
}