import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, UserCheck, Globe } from 'lucide-react';
import { User, Candidate, Job } from '../types';
import { api } from '../lib/api';

interface CandidateListProps {
    user: User;
    navigateTo: (screen: string, params?: any) => void;
    filter: 'total' | 'hired' | 'rejected';
    initialStage?: string;
}

export function CandidateList({ user, navigateTo, filter, initialStage = 'all' }: CandidateListProps) {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedJobId, setSelectedJobId] = useState<string>('all');
    const [selectedStage, setSelectedStage] = useState<string>(initialStage);
    const [selectedSource, setSelectedSource] = useState<string>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        setSelectedStage(initialStage);
    }, [initialStage]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [candidatesData, jobsData] = await Promise.all([
                    api.applications.getAll(),
                    api.jobs.getAll()
                ]);
                setCandidates(candidatesData.sort((a, b) =>
                    new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime()
                ));
                setJobs(jobsData);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user.id]);

    // Unique sources for filter
    const uniqueSources = useMemo(() => Array.from(new Set(candidates.map(c => c.source).filter(Boolean))) as string[], [candidates]);

    // Stages list
    const stages = [
        'Applied', 'Screening', 'Round 1', 'Round 2', 'Round 3',
        'Management Round', 'Offer', 'Background Verification',
        'Onboarding', 'Hired', 'Rejected', 'Hold', 'Archived'
    ];

    const filteredList = useMemo(() => {
        let filtered = candidates;

        // 1. High-level Filter (Prop)
        if (filter === 'hired') {
            filtered = filtered.filter(c => ['Offer', 'Onboarding', 'Hired'].includes(c.stage));
        } else if (filter === 'rejected') {
            filtered = filtered.filter(c => c.stage === 'Rejected');
        }

        // 2. Job Filter
        if (selectedJobId !== 'all') {
            filtered = filtered.filter(c => c.jobId === selectedJobId);
        }

        // 3. Stage Filter
        if (selectedStage !== 'all') {
            filtered = filtered.filter(c => c.stage === selectedStage);
        }

        // 4. Source Filter
        if (selectedSource !== 'all') {
            filtered = filtered.filter(c => c.source === selectedSource);
        }

        // 5. Date Range Filter
        if (startDate) {
            filtered = filtered.filter(c => new Date(c.appliedDate) >= new Date(startDate));
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(c => new Date(c.appliedDate) <= end);
        }

        // 6. Search Filter
        // 6. Search Filter (name, email, phone, DOB)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();

            filtered = filtered.filter(c => {
                const dobString = c.dob
                    ? new Date(c.dob).toISOString().slice(0, 10) // yyyy-mm-dd
                    : '';

                return (
                    c.name.toLowerCase().includes(term) ||
                    c.email.toLowerCase().includes(term) ||
                    c.phone.includes(term) ||
                    dobString.includes(term)
                );
            });
        }


        return filtered;
    }, [candidates, filter, selectedJobId, selectedStage, selectedSource, startDate, endDate, searchTerm]);

    const getPageTitle = () => {
        switch (filter) {
            case 'hired': return 'Hired Candidates';
            case 'rejected': return 'Rejected Candidates';
            case 'total': return 'Total Candidates';
            default: return 'Candidates';
        }
    };



    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading candidates...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigateTo('dashboard')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
                        <p className="text-gray-500 text-sm mt-1">{filteredList.length} candidates found</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>

                    {/* Job Filter */}
                    <div>
                        <select
                            value={selectedJobId}
                            onChange={(e) => setSelectedJobId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                        >
                            <option value="all">All Jobs</option>
                            {jobs.map(job => (
                                <option key={job.id} value={job.id}>{job.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Stage Filter */}
                    <div>
                        <select
                            value={selectedStage}
                            onChange={(e) => setSelectedStage(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                        >
                            <option value="all">All Stages</option>
                            {stages.map(stage => (
                                <option key={stage} value={stage}>{stage}</option>
                            ))}
                        </select>
                    </div>

                    {/* Source Filter */}
                    <div>
                        <select
                            value={selectedSource}
                            onChange={(e) => setSelectedSource(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                        >
                            <option value="all">All Sources</option>
                            {uniqueSources.map(source => (
                                <option key={source} value={source}>{source}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range Start */}
                    <div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="Start Date"
                        />
                    </div>

                    {/* Date Range End */}
                    <div>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="End Date"
                        />
                    </div>

                    {/* Reset Button */}
                    <div className="flex items-center">
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedJobId('all');
                                setSelectedStage('all');
                                setSelectedSource('all');
                                setStartDate('');
                                setEndDate('');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full relative">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Applied</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied Date</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredList.length > 0 ? (
                                filteredList.map((candidate) => {
                                    const job = jobs.find(j => j.id === candidate.jobId);
                                    return (
                                        <tr
                                            key={candidate.id}
                                            onClick={() => navigateTo('candidate-detail', { candidateId: candidate.id })}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-3 whitespace-nowrap align-middle">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium shadow-sm flex-shrink-0">
                                                        {candidate.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                                                        <div className="text-sm text-gray-500">{candidate.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap align-middle text-center">
                                                <div className="text-sm text-gray-900">{job?.title || 'Unknown Job'}</div>
                                                <div className="text-xs text-gray-500">{job?.department}</div>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap align-middle text-center">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                            ${candidate.stage === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                        ['Offer', 'Onboarding', 'Hired'].includes(candidate.stage) ? 'bg-green-100 text-green-800' :
                                                            'bg-blue-100 text-blue-800'}`}>
                                                    {candidate.stage}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap align-middle text-center">
                                                <div className="text-sm text-gray-500">
                                                    {new Date(candidate.appliedDate).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap align-middle text-center">
                                                {candidate.source ? (() => {
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
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceStyle(candidate.source)}`}>
                                                            {getSourceIcon(candidate.source)}
                                                            <span className="capitalize">{candidate.source}</span>
                                                        </span>
                                                    );
                                                })() : (
                                                    <span className="text-gray-500 text-sm">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-center text-sm font-medium align-middle">
                                                <button className="text-blue-600 hover:text-blue-900">View Details</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No candidates found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
