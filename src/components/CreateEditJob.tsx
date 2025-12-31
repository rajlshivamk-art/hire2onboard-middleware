import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../lib/api';

const jobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  department: z.string().min(1, 'Department is required'),
  location: z.string().min(3, 'Location must be at least 3 characters'),
  type: z.enum(['Full-time', 'Part-time', 'Contract']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  requirements: z.array(z.string()).min(1, 'At least one requirement is needed'),
  salaryMin: z.number().min(0, 'Minimum salary must be positive'),
  salaryMax: z.number().min(0, 'Maximum salary must be positive'),
  openings: z.number().min(1, 'Must have at least 1 opening'),
  postingChannels: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  company: z.string().optional(), // Added company field for Admin overrides
}).refine((data) => data.salaryMax >= data.salaryMin, {
  message: "Max salary must be greater than or equal to min salary",
  path: ["salaryMax"],
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type JobFormValues = z.infer<typeof jobSchema>;

import { User } from '../types';

interface CreateEditJobProps {
  user: User;
  navigateTo: (screen: string, params?: any) => void;
  jobId: string | null;
}

export function CreateEditJob({ user, navigateTo, jobId }: CreateEditJobProps) {
  const [loading, setLoading] = useState(jobId ? true : false);

  useEffect(() => {
    if (!user.canEditJob) {
      alert("You do not have permission to edit jobs.");
      navigateTo('dashboard');
    }
  }, [user, navigateTo]);
  const [newRequirement, setNewRequirement] = useState('');
  const [customSource, setCustomSource] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset, // Added reset
    formState: { errors, isSubmitting },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema) as unknown as Resolver<JobFormValues>,
    defaultValues: {
      type: 'Full-time',
      requirements: [],
      postingChannels: [],
      openings: 1,
      salaryMin: 0,
      salaryMax: 0
    },
  });

  useEffect(() => {
    console.log("CreateEditJob mounted/updated. JobId:", jobId);
    if (jobId) {
      setLoading(true);
      api.jobs.getById(jobId)
        .then(job => {
          console.log("Fetched job details:", job);
          if (!job) {
            console.error("Job details are null/undefined");
            setLoading(false);
            return;
          }
          try {
            // Safety: Ensure dates are YYYY-MM-DD
            const safeDate = (d: string | null | undefined) => d ? d.split('T')[0] : '';

            reset({
              title: job.title || '',
              department: job.department || '',
              location: job.location || '',
              type: job.type as any,
              description: job.description || '',
              requirements: job.requirements || [],
              salaryMin: job.salaryRange?.min || 0,
              salaryMax: job.salaryRange?.max || 0,
              openings: job.openings || 1,
              postingChannels: job.postingChannels || [],
              startDate: safeDate(job.startDate),
              endDate: safeDate(job.endDate),
            });
          } catch (resetError) {
            console.error("Detailed Reset Error:", resetError);
            alert("Error loading job form: " + String(resetError));
          }
        })
        .catch(err => {
          console.error(err);
          alert("Failed to fetch job: " + String(err));
        })
        .finally(() => setLoading(false));
    }
  }, [jobId, reset]);

  const requirements = watch('requirements');

  // Register requirements manually to ensure it's part of the form state
  useEffect(() => {
    register('requirements');
  }, [register]);

  if (loading) return <div>Loading job details...</div>;

  const onSubmit = async (data: JobFormValues) => {
    try {
      if (jobId) {
        await api.jobs.update(jobId, data);
        alert('Job updated successfully!');
        navigateTo('jobs');
      } else {
        const newJob = await api.jobs.create(data);
        console.log("Job created response:", newJob);
        if (!newJob || !newJob.id) {
          alert("Error: Job created but ID is missing!");
          return;
        }
        alert(`Job created successfully! (ID: ${newJob.id}). Scroll down to see tracking links.`);
        // Redirect to edit mode for the new job so user can see links immediately
        navigateTo('create-job', { jobId: newJob.id });
      }
    } catch (err: any) {
      console.error("Job update failed:", err);
      // Improve error message extraction
      let errorMessage = 'Failed to save job';
      if (err.response && err.response.data && err.response.data.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else {
          errorMessage = JSON.stringify(err.response.data.detail);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      alert(`Error: ${errorMessage}`);
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setValue('requirements', [...requirements, newRequirement.trim()], { shouldValidate: true });
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    setValue('requirements', requirements.filter((_, i) => i !== index), { shouldValidate: true });
  };

  return (
    <div className="p-8">
      <button
        onClick={() => navigateTo('jobs')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Jobs
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-gray-900 mb-6">{jobId ? 'Edit Job Posting' : 'Create New Job Posting'}</h1>

        <form onSubmit={handleSubmit(onSubmit, (errors) => {
          console.error("Form Validation Errors:", errors);
          alert("Please check the form for errors. Missing or invalid fields need to be fixed.");
        })} className="space-y-6">
          {/* Admin Override: Company Selection */}
          {(user.role === 'HR' && user.email === 'administrator') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <label className="block text-yellow-800 mb-2 font-medium">Target Company (Admin Only)</label>
              <input
                type="text"
                {...register('company')}
                placeholder="e.g. Averlon World"
                className="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <p className="text-xs text-yellow-700 mt-1">Specify which company this job belongs to in the ERP.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 mb-2">Job Title *</label>
              <input
                type="text"
                {...register('title')}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="e.g. Senior Frontend Developer"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Department *</label>
              <select
                {...register('department')}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.department ? 'border-red-500' : 'border-gray-300'
                  }`}
              >
                <option value="">Select Department</option>
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Operations">Operations</option>
              </select>
              {errors.department && (
                <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Location *</label>
              <input
                type="text"
                {...register('location')}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.location ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="e.g. Remote, San Francisco, CA"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Employment Type *</label>
              <select
                {...register('type')}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.type ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Salary Min (INR) *</label>
              <input
                type="number"
                {...register('salaryMin', { valueAsNumber: true })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.salaryMin ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="100000"
              />
              {errors.salaryMin && (
                <p className="mt-1 text-sm text-red-600">{errors.salaryMin.message}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Salary Max (INR) *</label>
              <input
                type="number"
                {...register('salaryMax', { valueAsNumber: true })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.salaryMax ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="150000"
              />
              {errors.salaryMax && (
                <p className="mt-1 text-sm text-red-600">{errors.salaryMax.message}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Number of Openings *</label>
              <input
                type="number"
                {...register('openings', { valueAsNumber: true })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.openings ? 'border-red-500' : 'border-gray-300'
                  }`}
                min="1"
              />
              {errors.openings && (
                <p className="mt-1 text-sm text-red-600">{errors.openings.message}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Start Date (Optional)</label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">End Date (Optional)</label>
              <input
                type="date"
                {...register('endDate')}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.endDate ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Job Description *</label>
            <textarea
              {...register('description')}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              rows={4}
              placeholder="Describe the role, responsibilities, and what you're looking for..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Requirements</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 5+ years of React experience"
              />
              <button
                type="button"
                onClick={addRequirement}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(requirements || []).map((req, idx) => (
                <div
                  key={idx}
                  className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2"
                >
                  {req}
                  <button
                    type="button"
                    onClick={() => removeRequirement(idx)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {errors.requirements && (
              <p className="mt-1 text-sm text-red-600">{errors.requirements.message}</p>
            )}
          </div>



          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (jobId ? 'Update Job' : 'Create Job')}
            </button>
            <button
              type="button"
              onClick={() => navigateTo('jobs')}
              className="bg-gray-100 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {jobId && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Trackable Sourcing Links</h2>
          <p className="text-gray-600 mb-6">Use these links to post on different platforms. We'll automatically track the source of applications.</p>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Custom Source Generator</h3>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <label className="block text-gray-700 mb-2 font-medium">Create a custom link for any channel:</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={customSource}
                  placeholder="e.g. Campus Drive, WhatsApp Group, Email Newsletter"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setCustomSource(e.target.value)}
                />
              </div>

              {customSource && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <p className="text-sm text-blue-800 mb-2 font-medium">Generated Link for "{customSource}":</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={`${window.location.origin}/?screen=apply&jobId=${jobId}&source=${encodeURIComponent(customSource)}`}
                      className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-gray-600 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const link = `${window.location.origin}/?screen=apply&jobId=${jobId}&source=${encodeURIComponent(customSource)}`;
                        navigator.clipboard.writeText(link);
                        alert(`Copied ${customSource} link to clipboard!`);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Copy Link
                    </button>
                    <a
                      href={`${window.location.origin}/?screen=apply&jobId=${jobId}&source=${encodeURIComponent(customSource)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors flex items-center"
                      title="Test Link"
                    >
                      Open
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Common Platforms</h3>
          <div className="grid gap-4">
            {['LinkedIn', 'Indeed', 'Naukri', 'Twitter', 'Facebook', 'Instagram'].map((source) => {
              const link = `${window.location.origin}/?screen=apply&jobId=${jobId}&source=${source}`;
              return (
                <div key={source} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="w-24 font-medium text-gray-700 flex items-center gap-2">
                    {source}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      readOnly
                      value={link}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(link);
                        // Using a simple toast or alert here - keeping it consistent with existing alerts
                        alert(`Copied ${source} link to clipboard!`);
                      }}
                      className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg bg-white border border-blue-200 text-sm font-medium transition-colors"
                    >
                      Copy
                    </button>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors flex items-center"
                      title="Test Link"
                    >
                      Open
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
