import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../lib/api';
import { User } from '../types';
import toast from 'react-hot-toast';

const PREDEFINED_DEPARTMENTS = ['Engineering', 'Product', 'Sales', 'Marketing', 'Operations'];
const PREDEFINED_TYPES = ['Full-time', 'Part-time', 'Contract'];

// Enhanced schema with custom validation for department/type
const jobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  department: z.string().optional(),
  customDepartment: z.string().optional(),

  type: z.string().optional(),
  customEmploymentType: z.string().optional(),

  location: z.string().min(3, 'Location must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  requirements: z.array(z.string()).min(1, 'At least one requirement is needed'),
  salaryMin: z.number().min(0),
  salaryMax: z.number().min(0),
  openings: z.number().min(1),
  postingChannels: z.array(z.string()).optional(),
  startDate: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  endDate: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  company: z.string().optional(),
})
  .refine((data) => data.salaryMax >= data.salaryMin, {
    message: "Max salary must be greater than or equal to min salary",
    path: ["salaryMax"],
  })
  .refine((data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  }, {
    message: "End date must be after start date",
    path: ["endDate"],
  })
  // Custom validation for department and type
  .refine((data) => {
    if (data.department === 'Other' || !data.department) {
      return data.customDepartment?.trim() ? true : false;
    }
    return true;
  }, {
    message: "Department is required",
    path: ["customDepartment"],
  })
  .refine((data) => {
    if (data.type === 'Other' || !data.type) {
      return data.customEmploymentType?.trim() ? true : false;
    }
    return true;
  }, {
    message: "Employment type is required",
    path: ["customEmploymentType"],
  });

type JobFormValues = z.infer<typeof jobSchema>;

interface CreateEditJobProps {
  user: User;
  navigateTo: (screen: string, params?: any) => void;
  jobId: string | null;
}

export function CreateEditJob({ user, navigateTo, jobId }: CreateEditJobProps) {
  const [loading, setLoading] = useState(!!jobId);
  const [newRequirement, setNewRequirement] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [useCustomDepartment, setUseCustomDepartment] = useState(false);
  const [useCustomEmploymentType, setUseCustomEmploymentType] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema) as unknown as Resolver<JobFormValues>,
    defaultValues: {
      type: 'Full-time',
      department: 'Engineering',
      requirements: [],
      postingChannels: [],
      openings: 1,
      salaryMin: 0,
      salaryMax: 0
    },
  });

  /** Permission check */
  useEffect(() => {
    if (!user.canEditJob) {
      toast.error('You do not have permission to edit jobs');
      navigateTo('dashboard');
    }
  }, [user, navigateTo]);

  /** ✅ RESET when switching from Edit → Create (NO refresh needed) */
  useEffect(() => {
    if (!jobId) {
      reset({
        title: '',
        department: 'Engineering',
        customDepartment: '',
        type: 'Full-time',
        customEmploymentType: '',
        location: '',
        description: '',
        requirements: [],
        salaryMin: 0,
        salaryMax: 0,
        openings: 1,
        postingChannels: [],
        startDate: undefined,
        endDate: undefined,
        company: '',
      });
      setUseCustomDepartment(false);
      setUseCustomEmploymentType(false);
    }
  }, [jobId, reset]);

  /** Load job for edit */
  useEffect(() => {
    if (!jobId) return;

    setLoading(true);
    api.jobs.getById(jobId)
      .then(job => {
        if (!job) return;

        const safeDate = (d?: string) => d ? d.split('T')[0] : '';

        const isCustomDept = job.department && !PREDEFINED_DEPARTMENTS.includes(job.department);
        const isCustomType = job.type && !PREDEFINED_TYPES.includes(job.type);

        setUseCustomDepartment(!!isCustomDept);
        setUseCustomEmploymentType(!!isCustomType);

        reset({
          title: job.title || '',
          department: isCustomDept ? '' : job.department,
          customDepartment: isCustomDept ? job.department : '',
          location: job.location || '',
          type: isCustomType ? '' : job.type,
          customEmploymentType: isCustomType ? job.type : '',
          description: job.description || '',
          requirements: job.requirements || [],
          salaryMin: job.salaryRange?.min || 0,
          salaryMax: job.salaryRange?.max || 0,
          openings: job.openings || 1,
          postingChannels: job.postingChannels || [],
          startDate: safeDate(job.startDate),
          endDate: safeDate(job.endDate),
        });
      })
      .finally(() => setLoading(false));
  }, [jobId, reset]);

  const requirements = watch('requirements');
  const department = watch('department');
  const employmentType = watch('type');

  useEffect(() => {
    register('requirements');
  }, [register]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-white">Loading job details...</div>;

  const onSubmit = async (data: JobFormValues) => {
    const payload: any = { ...data };

    if ((department === 'Other' || useCustomDepartment) && data.customDepartment?.trim()) {
      payload.department = data.customDepartment.trim();
    }
    if ((employmentType === 'Other' || useCustomEmploymentType) && data.customEmploymentType?.trim()) {
      payload.type = data.customEmploymentType.trim();
    }

    delete payload.customDepartment;
    delete payload.customEmploymentType;

    try {
      if (jobId) {
        await api.jobs.update(jobId, payload);
        toast.success('Job updated successfully!');
        navigateTo('jobs');
      } else {
        const newJob = await api.jobs.create(payload);
        if (!newJob?.id) {
          toast.error("Error: Job created but ID is missing!");
          return;
        }
        toast.success(`Job created successfully! (ID: ${newJob.id})`);
        navigateTo('create-job', { jobId: newJob.id });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail
          ? typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : JSON.stringify(err.response.data.detail)
          : 'Failed to save job';

      toast.error(`Error: ${msg}`);
    }
  };

  const addRequirement = () => {
    if (!newRequirement.trim()) return;
    setValue('requirements', [...requirements, newRequirement.trim()], { shouldValidate: true });
    setNewRequirement('');
  };

  const removeRequirement = (i: number) => {
    setValue('requirements', requirements.filter((_, idx) => idx !== i), { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <button
        onClick={() => navigateTo('jobs')}
        className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Jobs
      </button>

      <div className="glass-card rounded-[32px] border border-white/10 shadow-2xl p-4 md:p-8">
        <h1 className="text-3xl font-semibold text-white mb-6">
          {jobId ? 'Edit Job Posting' : 'Create New Job Posting'}
        </h1>

        <form onSubmit={handleSubmit(onSubmit, (errors) => {
          console.error("Form Validation Errors:", errors);
          toast.error("Please check the form for errors. Missing or invalid fields need to be fixed.");
        })} className="space-y-6">
          {/* Admin Override: Company Selection */}
          {(user.role === 'HR' && user.email === 'administrator') && (
            <div className="glass-card border border-amber-500/20 bg-amber-500/10 rounded-[24px] p-4 mb-4">
              <label className="block text-amber-200 mb-2 font-semibold">Target Company (Admin Only)</label>
              <input
                type="text"
                {...register('company')}
                placeholder="e.g. Averlon World"
                className="glass-input w-full px-4 py-3 rounded-2xl text-white/90 bg-transparent"
              />
              <p className="text-xs text-amber-200/80 mt-1">Specify which company this job belongs to in the ERP.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white/70 mb-2">Job Title *</label>
              <input
                type="text"
                {...register('title')}
                className={`glass-input w-full px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${errors.title ? 'border-red-400' : 'border-white/20'} text-white bg-slate-950/70`}
                placeholder="e.g. Senior Frontend Developer"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-rose-300">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-white/70 mb-2">Department *</label>

              {!useCustomDepartment ? (
                <>
                  <select
                    {...register('department')}
                    className={`glass-input w-full px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${errors.department ? 'border-red-400' : 'border-white/20'} text-white bg-slate-950/70`}
                  >
                    <option value="">Select Department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                    <option value="Other">Other</option>
                  </select>
                  {department === 'Other' && (
                    <input
                      type="text"
                      {...register('customDepartment')}
                      placeholder="Enter custom department"
                      className="glass-input w-full mt-2 px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500"
                    />
                  )}
                </>
              ) : (
                <input
                  type="text"
                  {...register('customDepartment')}
                  placeholder="Enter custom department"
                  className="glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500"
                />
              )}

              <button
                type="button"
                onClick={() => setUseCustomDepartment(!useCustomDepartment)}
                className="mt-2 text-sm text-cyan-300 hover:text-cyan-100 underline"
              >
                {useCustomDepartment ? 'Select from list' : 'Add custom department'}
              </button>

              {(errors.department || errors.customDepartment) && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.department?.message || errors.customDepartment?.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-white/70 mb-2">Location *</label>
              <input
                type="text"
                {...register('location')}
                className={`glass-input w-full px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${errors.location ? 'border-red-400' : 'border-white/20'} text-white bg-slate-950/70`}
                placeholder="e.g. Remote, San Francisco, CA"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
              )}
            </div>

            <div>
              <label className="block text-white/70 mb-2">Employment Type *</label>

              {!useCustomEmploymentType ? (
                <>
                  <select
                    {...register('type')}
                    className={`glass-input w-full px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${errors.type ? 'border-red-400' : 'border-white/20'} text-white bg-slate-950/70`}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Other">Other</option>
                  </select>
                  {employmentType === 'Other' && (
                    <input
                      type="text"
                      {...register('customEmploymentType')}
                      placeholder="Enter custom employment type"
                      className="glass-input w-full mt-2 px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500"
                    />
                  )}
                </>
              ) : (
                <input
                  type="text"
                  {...register('customEmploymentType')}
                  placeholder="Enter custom employment type"
                  className="glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500"
                />
              )}

              <button
                type="button"
                onClick={() => setUseCustomEmploymentType(!useCustomEmploymentType)}
                className="mt-2 text-sm text-cyan-300 hover:text-cyan-100 underline"
              >
                {useCustomEmploymentType ? 'Select from list' : 'Add custom type'}
              </button>

              {(errors.type || errors.customEmploymentType) && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.type?.message || errors.customEmploymentType?.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-white/70 mb-2">Salary Min (INR) *</label>
              <input
                type="number"
                {...register('salaryMin', { valueAsNumber: true })}
                className={`glass-input w-full px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${errors.salaryMin ? 'border-red-400' : 'border-white/20'} text-white bg-slate-950/70`}
                placeholder="100000"
              />
              {errors.salaryMin && (
                <p className="mt-1 text-sm text-red-600">{errors.salaryMin.message}</p>
              )}
            </div>

            <div>
              <label className="block text-white/70 mb-2">Salary Max (INR) *</label>
              <input
                type="number"
                {...register('salaryMax', { valueAsNumber: true })}
                className={`glass-input w-full px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${errors.salaryMax ? 'border-red-400' : 'border-white/20'} text-white bg-slate-950/70`}
                placeholder="150000"
              />
              {errors.salaryMax && (
                <p className="mt-1 text-sm text-red-600">{errors.salaryMax.message}</p>
              )}
            </div>

            <div>
              <label className="block text-white/70 mb-2">Number of Openings *</label>
              <input
                type="number"
                {...register('openings', { valueAsNumber: true })}
                className={`glass-input w-full px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${errors.openings ? 'border-red-400' : 'border-white/20'} text-white bg-slate-950/70`}
                min="1"
              />
              {errors.openings && (
                <p className="mt-1 text-sm text-red-600">{errors.openings.message}</p>
              )}
            </div>

            <div>
              <label className="block text-white/70 mb-2">Start Date (Optional)</label>
              <input
                type="date"
                {...register('startDate')}
                className="glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-white/70 mb-2">End Date (Optional)</label>
              <input
                type="date"
                {...register('endDate')}
                className={`glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${errors.endDate ? 'border-red-400' : 'border-white/20'}`}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-white/70 mb-2">Job Description *</label>
            <textarea
              {...register('description')}
              className={`glass-input w-full px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 ${errors.description ? 'border-red-400' : 'border-white/20'} text-white bg-slate-950/70`}
              rows={4}
              placeholder="Describe the role, responsibilities, and what you're looking for..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-white/70 mb-2">Requirements *</label>
            <div className="mb-3 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addRequirement();
                  }
                }}
                className="glass-input w-full sm:flex-1 px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g. 5+ years of React experience"
              />

              <button
                type="button"
                onClick={addRequirement}
                className="w-full sm:w-auto bg-cyan-500 text-slate-950 px-6 py-3 rounded-2xl hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2 font-medium whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(requirements || []).map((req, idx) => (
                <div
                  key={idx}
                  className="glass-card px-3 py-2 rounded-2xl flex items-center gap-2 border border-white/10 bg-white/5 text-white"
                >
                  {req}
                  <button
                    type="button"
                    onClick={() => removeRequirement(idx)}
                    className="text-slate-300 hover:text-rose-300"
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

          <div className="flex flex-col-reverse sm:flex-row gap-4 pt-6 border-t border-white/10">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-cyan-500 text-slate-950 px-8 py-3 rounded-2xl hover:bg-cyan-400 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (jobId ? 'Update Job' : 'Create Job')}
            </button>
            <button
              type="button"
              onClick={() => navigateTo('jobs')}
              className="bg-white/10 text-white px-8 py-3 rounded-2xl hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {jobId && (
        <div className="mt-8 glass-card rounded-[32px] border border-white/10 p-4 md:p-8">
          <h2 className="text-2xl font-semibold text-white mb-2">Trackable Sourcing Links</h2>
          <p className="text-slate-300 mb-6">Use these links to post on different platforms. We'll automatically track the source of applications.</p>

          {/* Custom Source Generator */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Custom Source Generator</h3>
            <div className="glass-card rounded-[24px] p-4 md:p-6 border border-white/10 bg-white/5">
              <label className="block text-slate-200 mb-2 font-medium">Create a custom link for any channel:</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={customSource}
                  placeholder="e.g. Campus Drive, WhatsApp Group, Email Newsletter"
                  className="glass-input flex-1 px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500"
                  onChange={(e) => setCustomSource(e.target.value)}
                />
              </div>

              {customSource && (
                <div className="mt-4 p-4 glass-card border border-white/10 rounded-2xl bg-white/5">
                  <p className="text-sm text-cyan-200 mb-2 font-medium">Generated Link for "{customSource}":</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      readOnly
                      value={`${window.location.origin}/?screen=apply&jobId=${jobId}&source=${encodeURIComponent(customSource)}`}
                      className="flex-1 px-3 py-3 bg-slate-950/80 border border-white/10 rounded-2xl text-sm text-slate-200 focus:outline-none font-mono"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/?screen=apply&jobId=${jobId}&source=${encodeURIComponent(customSource)}`;
                          navigator.clipboard.writeText(link);
                          toast.success(`Copied ${customSource} link to clipboard!`);
                        }}
                        className="px-4 py-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400 rounded-2xl text-sm font-medium transition-colors"
                      >
                        Copy Link
                      </button>
                      <a
                        href={`${window.location.origin}/?screen=apply&jobId=${jobId}&source=${encodeURIComponent(customSource)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white/10 border border-white/10 text-white hover:bg-white/15 rounded-2xl text-sm font-medium transition-colors flex items-center"
                        title="Test Link"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Common Platforms</h3>
          <div className="grid gap-4">
            {['LinkedIn', 'Indeed', 'Naukri', 'Twitter', 'Facebook', 'Instagram'].map((source) => {
              const link = `${window.location.origin}/?screen=apply&jobId=${jobId}&source=${source}`;
              return (
                <div key={source} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="w-24 font-medium text-slate-200">{source}</div>
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <input
                      readOnly
                      value={link}
                      className="flex-1 px-3 py-3 bg-slate-950/80 border border-white/10 rounded-2xl text-sm text-slate-200 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(link);
                          toast.success(`Copied ${source} link to clipboard!`);
                        }}
                        className="px-4 py-2 text-slate-950 hover:bg-cyan-400 rounded-2xl bg-cyan-500 text-sm font-medium transition-colors"
                      >
                        Copy
                      </button>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white/10 border border-white/10 text-white hover:bg-white/15 rounded-2xl text-sm font-medium transition-colors flex items-center"
                        title="Test Link"
                      >
                        Open
                      </a>
                    </div>
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