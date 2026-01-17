import { useState, useEffect, useMemo } from 'react';
import { User, CandidateStage, Candidate } from '../types';
import { api } from '../lib/api';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Mail, Phone, UserCheck, Search, Globe, Calendar, ArrowUpDown } from 'lucide-react';

interface KanbanBoardProps {
  user: User;
  navigateTo: (screen: string, params?: any) => void;
}

const stages: CandidateStage[] = [
  'Applied',
  'Screening',
  'Round 1',
  'Round 2',
  'Round 3',
  'Management Round',
  'Offer',
  'Background Verification',
  'Onboarding',
  'Hired',
  'Rejected',
  'Hold',
];

interface CandidateCardProps {
  candidate: any;
  user: User;
  onClick: () => void;
}

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

function CandidateCard({ candidate, user, onClick }: CandidateCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'candidate',
    item: { id: candidate.id, currentStage: candidate.stage },
    canDrag: user.canMoveCandidate,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const hasReferral = candidate.referredBy && candidate.referredBy.trim() !== '';

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={`bg-white rounded-lg border ${hasReferral ? 'border-purple-300 bg-purple-50/30' : 'border-gray-200'
        } p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow ${isDragging ? 'opacity-50' : ''
        }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-gray-900 font-medium truncate pr-2">{candidate.name}</h3>
        {candidate.source && (() => {
          const getSourceStyle = (s: string) => {
            const source = s.toLowerCase();
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
            if (source.includes('referral')) return <UserCheck className="w-3 h-3" />;
            if (source.includes('walk-in')) return <UserCheck className="w-3 h-3" />;
            return <Globe className="w-3 h-3" />;
          };

          return (
            <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getSourceStyle(candidate.source)}`}>
              {getSourceIcon(candidate.source)}
              <span className="truncate max-w-[80px]">{candidate.source}</span>
            </span>
          );
        })()}
      </div>

      {hasReferral && (
        <p className="text-purple-600 text-xs mb-2 -mt-1">By: {candidate.referredBy}</p>
      )}
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Mail className="w-3 h-3" />
          {candidate.email}
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-3 h-3" />
          {candidate.phone}
        </div>
      </div>

      {
        candidate.stage === 'Round 2' && user.role === 'Tech Interviewer' && (
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded px-2 py-1 text-xs text-orange-700">
            Ready for Review
          </div>
        )
      }
      {
        candidate.stage === 'Rejected' && candidate.rejectionReason && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded px-2 py-1 text-xs text-red-700">
            Reason: {candidate.rejectionReason}
          </div>
        )
      }

      <div className="w-full flex justify-end mt-2">
        {(() => {
          const timeText = getTimeAgo(candidate.appliedDate);
          return (
            <span className={`text-xs font-medium whitespace-nowrap ${timeText === 'Just now' ? 'text-green-600' : 'text-gray-400'}`}>
              {timeText}
            </span>
          );
        })()}
      </div>
    </div >
  );
}

interface ColumnProps {
  stage: CandidateStage;
  candidates: any[];
  user: User;
  onCardClick: (candidateId: string) => void;
  onDrop: (candidateId: string, newStage: CandidateStage) => void;
  onHeaderClick: (stage: string) => void;
}

function Column({ stage, candidates, user, onCardClick, onDrop, onHeaderClick }: ColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'candidate',
    canDrop: () => user.canMoveCandidate,
    drop: (item: any) => {
      if (item.currentStage !== stage) {
        onDrop(item.id, stage);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });


  const getColumnTitle = (stage: CandidateStage) => {
    return stage;
  };

  const getColumnColor = (stage: CandidateStage) => {
    if (stage === 'Onboarding') return 'border-t-4 border-t-indigo-500';
    if (stage === 'Hired') return 'border-t-4 border-t-green-500';
    if (stage === 'Rejected') return 'border-t-4 border-t-red-500';
    return '';
  };

  return (
    <div
      ref={drop}
      className={`bg-gray-50 rounded-xl min-w-[280px] sm:min-w-[320px] flex flex-col h-[500px] md:h-[600px] ${isOver ? 'bg-blue-50 ring-2 ring-blue-400' : ''
        } ${getColumnColor(stage)}`}
    >
      <div
        onClick={() => onHeaderClick(stage)}
        className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0 cursor-pointer hover:bg-gray-100 transition-colors rounded-t-xl"
        title="View all candidates in this stage"
      >
        <h2 className="text-gray-900 font-medium">{getColumnTitle(stage)}</h2>
        <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
          {candidates.length}
        </span>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            user={user}
            onClick={() => onCardClick(candidate.id)}
          />
        ))}
        {candidates.length === 0 && (
          <div className="text-gray-400 text-sm text-center py-12">
            No candidates
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ user, navigateTo }: KanbanBoardProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', '30d', '3m', '6m', '1y', 'custom', 'specific_date'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [specificDate, setSpecificDate] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'name_asc', 'name_desc'

  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [candidatesData, jobsData] = await Promise.all([
          api.applications.getAll(),
          api.jobs.getAll()
        ]);
        setCandidates(candidatesData);
        setJobs(jobsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    loadData();
  }, [user.id]);


  const handleDrop = async (candidateId: string, newStage: CandidateStage) => {
    // Optimistic UI update
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId ? { ...c, stage: newStage } : c
      )
    );

    try {
      await api.applications.updateStage(candidateId, newStage);
    } catch (error) {
      console.error('Failed to update stage:', error);
      // Revert on failure (optional but recommended, simple alert for now)
      alert("Failed to save stage change. Please refresh.");
    }
  };

  const filteredCandidates = useMemo(() => candidates.filter((c) => {
    // 1. Job Filter
    const matchesJob = selectedJobId === 'all' ? true : c.jobId === selectedJobId;

    // 2. Text Search
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());

    // 3. Date Filter
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const date = new Date(c.appliedDate);

      if (dateFilter === 'custom') {
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = date >= start && date <= end;
        }
      } else if (dateFilter === 'specific_date') {
        if (specificDate) {
          const targetDate = new Date(specificDate);
          // Check if same day (ignoring time)
          matchesDate = date.getDate() === targetDate.getDate() &&
            date.getMonth() === targetDate.getMonth() &&
            date.getFullYear() === targetDate.getFullYear();
        }
      } else {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (dateFilter === '30d') matchesDate = diffDays <= 30;
        else if (dateFilter === '3m') matchesDate = diffDays <= 90;
        else if (dateFilter === '6m') matchesDate = diffDays <= 180;
        else if (dateFilter === '1y') matchesDate = diffDays <= 365;
      }
    }

    const matches = matchesJob && matchesSearch && matchesDate;
    return matches;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime();
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'newest':
      default:
        return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
    }
  }), [candidates, selectedJobId, searchQuery, dateFilter, customStartDate, customEndDate, specificDate, sortBy]);
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h1 className="text-gray-900 mb-2">Recruitment Pipeline</h1>

            {/* Date Filters - Moved to Top Right to match Dashboard */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Specific Date Input */}
              {dateFilter === 'specific_date' && (
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

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
                  <option value="specific_date">Specific Date</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-gray-700 font-medium">Job:</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto bg-white"
              >
                <option value="all">All Jobs</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {!user.canMoveCandidate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              You can view the pipeline but cannot move candidates between stages. Click on a candidate to provide feedback.
            </p>
          </div>
        )}

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                candidates={filteredCandidates.filter((c) => c.stage === stage)}
                user={user}
                onCardClick={(candidateId) => navigateTo('candidate-detail', { candidateId })}
                onDrop={handleDrop}
                onHeaderClick={(s) => navigateTo('candidate-list', { filter: 'total', stage: s })}
              />
            ))}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}