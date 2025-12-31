import { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Trash2, Filter, Briefcase, DollarSign, Users, Calendar } from 'lucide-react';
import { User, Job } from '../types';
import { api } from '../lib/api';

interface JobManagementProps {
  user: User;
  navigateTo: (screen: string, params?: any) => void;
}

export function JobManagement({ user, navigateTo }: JobManagementProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');

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

  const onNavigate = (screen: string, job?: Job) => {
    navigateTo(screen, job ? { jobId: job.id } : {});
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    if (window.confirm(`Are you sure you want to change the status of this job to ${newStatus}?`)) {
      try {
        await api.jobs.update(jobId, { status: newStatus });
        loadJobs();
      } catch (error) {
        console.error(`Failed to change job status to ${newStatus}:`, error);
        alert(`Failed to change job status to ${newStatus}`);
      }
    }
  };

  const onViewApplications = (job: Job) => {
    navigateTo('pipeline', { jobId: job.id });
  };

  const canEditJob = user.canEditJob; // Assuming user.canEditJob is defined

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
    // Assuming job has a department property for filtering
    const matchesDepartment = departmentFilter === 'All' || (job as any).department === departmentFilter; // Cast to any if department is not in Job type

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Management</h1>
          <p className="text-gray-500">Create, manage and track your job openings</p>
        </div>
        {(canEditJob) && (
          <button
            onClick={() => onNavigate('create-job')}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto"
          >
            <Plus size={20} />
            Post New Job
          </button>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="All">All Departments</option>
                {/* Dynamic departments could go here */}
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Job List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No jobs found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${job.status === 'Open' ? 'bg-green-50 text-green-700' :
                      job.status === 'Closed' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                      {job.status}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {job.type}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign size={16} />
                      {job.salaryRange.min.toLocaleString()} - {job.salaryRange.max.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={16} />
                      {job.openings} Applicants {/* Assuming 'openings' is now 'applicants' or similar */}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      Posted {new Date(job.postedDate).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {job.requirements.slice(0, 3).map((req, index) => (
                      <span key={index} className="bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded">
                        {req}
                      </span>
                    ))}
                    {job.requirements.length > 3 && (
                      <span className="text-xs text-gray-500 py-1">+ {job.requirements.length - 3} more</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end gap-2 md:gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                  {(canEditJob) && (
                    <>
                      <button
                        onClick={() => onNavigate('create-job', job)}
                        className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors w-full md:w-32"
                      >
                        Edit Job
                      </button>
                      {job.status === 'Open' ? (
                        <button
                          onClick={() => handleStatusChange(job.id, 'Closed')}
                          className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors w-full md:w-32"
                        >
                          Close Job
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(job.id, 'Open')}
                          className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition-colors w-full md:w-32"
                        >
                          Re-open
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={() => onViewApplications(job)}
                    className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors w-full md:w-32"
                  >
                    Applications
                  </button>


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
              < div className="border-t border-gray-200 pt-4 mt-4" >
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
          ))
        )}
      </div>
    </div >
  );
}