import { useState, useEffect } from 'react';
import { MapPin, Clock, IndianRupee, Briefcase, Search, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';

interface PublicJobBoardProps {
  onApply: (jobId: string) => void;
}

export function PublicJobBoard({ onApply }: PublicJobBoardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await api.jobs.getAll();
        setJobs(data);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Show Open, Active, and Closed jobs (so candidates can see what's closed)
  const availableJobs = jobs.filter(j => ['Open', 'Active', 'Closed'].includes(j.status));

  const filteredJobs = availableJobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // Sort open jobs first
    if (a.status !== 'Closed' && b.status === 'Closed') return -1;
    if (a.status === 'Closed' && b.status !== 'Closed') return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="mb-4">Join Our Team</h1>
          <p className="text-xl opacity-90 mb-8">
            Discover opportunities to build your career with us
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by job title, department, or location..."
              className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      {/* Job Listings */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-12">Loading jobs...</div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-gray-900 mb-2">Open Positions</h2>
              <p className="text-gray-600">{filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} available</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all ${job.status === 'Closed' ? 'opacity-75 bg-gray-50' : 'hover:shadow-md'
                    }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-gray-900">{job.title}</h2>
                          <p className="text-gray-600">{job.department}</p>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${job.status === 'Closed' ? 'bg-gray-200 text-gray-600 font-medium' : 'bg-green-100 text-green-700'
                      }`}>
                      {job.status === 'Closed' ? 'Closed' : `${job.openings} opening${job.openings > 1 ? 's' : ''}`}
                    </span>
                  </div>

                  {/* Company Name Badge */}
                  {job.company && (
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {job.company}
                      </span>
                    </div>
                  )}

                  <p className="text-gray-700 mb-4">{job.description}</p>

                  {/* Job Details */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {job.type}
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4" />
                      {job.salaryRange.min.toLocaleString()} - {job.salaryRange.max.toLocaleString()}
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="mb-4">
                    <p className="text-gray-700 mb-2">Requirements:</p>
                    <div className="flex flex-wrap gap-2">
                      {job.requirements.map((req: string, idx: number) => (
                        <span
                          key={idx}
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <button
                    onClick={() => job.status !== 'Closed' && onApply(job.id)}
                    disabled={job.status === 'Closed'}
                    className={`w-full py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${job.status === 'Closed'
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                  >
                    {job.status === 'Closed' ? 'Position Closed' : 'Apply Now'}
                    {job.status !== 'Closed' && <ArrowRight className="w-5 h-5" />}
                  </button>
                </div>
              ))}

              {filteredJobs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No jobs found matching your search.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}