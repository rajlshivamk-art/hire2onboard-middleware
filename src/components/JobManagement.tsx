import { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Clock, IndianRupee, Ban, RefreshCw, Trash2 } from 'lucide-react';
import { User, Job } from '../types';
import { api } from '../lib/api';

interface JobManagementProps {
  user: User;
  navigateTo: (screen: string, params?: any) => void;
}

export function JobManagement({ user, navigateTo }: JobManagementProps) {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const data = await api.jobs.getAll();
      setJobs(data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-gray-900 mb-2">Job Postings</h1>
          <p className="text-gray-600">Manage all open and closed positions</p>
        </div>
        {user.canEditJob && (
          <button
            onClick={() => navigateTo('create-job', { jobId: null })}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 justify-center"
          >
            <Plus className="w-5 h-5" />
            Post New Job
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Departments</option>
            <option>Engineering</option>
            <option>Product</option>
            <option>Sales</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Status</option>
            <option>Open</option>
            <option>Closed</option>
            <option>On Hold</option>
          </select>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 gap-6">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-gray-900">{job.title}</h2>
                  <span
                    className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${job.status === 'Open' || job.status === 'Active'
                      ? 'bg-green-100 text-green-700'
                      : job.status === 'Closed'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-yellow-100 text-yellow-700'
                      }`}
                  >
                    {job.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{job.description}</p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {job.type}
                  </div>
                  {user.canViewSalary && (
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4" />
                      {job.salaryRange.min.toLocaleString()} - {job.salaryRange.max.toLocaleString()}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">•</span>
                    {job.openings} opening{job.openings > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 lg:flex-shrink-0">
                <button
                  onClick={() => navigateTo('pipeline', { jobId: job.id })}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  View Candidates
                </button>
                {user.canEditJob && job.status !== 'Closed' && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to close this job?')) {
                        try {
                          await api.jobs.update(job.id, { status: 'Closed' });
                          loadJobs();
                        } catch (error) {
                          console.error('Failed to close job:', error);
                          alert('Failed to close job');
                        }
                      }
                    }}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Close
                  </button>
                )}
                {user.canEditJob && job.status === 'Closed' && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to re-open this job?')) {
                        try {
                          await api.jobs.update(job.id, { status: 'Active' });
                          loadJobs();
                        } catch (error) {
                          console.error('Failed to re-open job:', error);
                          alert('Failed to re-open job');
                        }
                      }
                    }}
                    className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Re-open
                  </button>
                )}
                {user.canEditJob && (
                  <button
                    onClick={() => {
                      navigateTo('create-job', { jobId: job.id });
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                )}
                {user.canEditJob && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to DELETE this job? This will delete all associated applications locally. This does NOT delete from ERP.')) {
                        try {
                          await api.jobs.delete(job.id);
                          loadJobs();
                        } catch (error) {
                          console.error('Failed to delete job:', error);
                          alert('Failed to delete job');
                        }
                      }
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap flex items-center gap-2"
                    title="Delete Job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Requirements */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-gray-700 mb-2">Requirements:</p>
              <div className="flex flex-wrap gap-2">
                {job.requirements.map((req, idx) => (
                  <span
                    key={idx}
                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                  >
                    {req}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-gray-500 text-sm">Posted on {new Date(job.postedDate).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}