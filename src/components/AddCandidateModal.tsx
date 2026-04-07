import { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

const candidateSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(10, "Invalid phone number"),
    jobId: z.string().min(1, "Job is required"),
    currentSalary: z.number().optional(),
    expectedSalary: z.number().min(1, "Expected salary is required"),
    yearsOfExperience: z.number().min(0, "Experience required"),
    skills: z.string().min(1, "At least one skill is required"),
    resumeUrl: z.string().optional(),
    source: z.string().min(1, "Source is required"),
    otherSource: z.string().optional(),
    referredBy: z.string().optional(),
    dob: z.string().optional(),
    // Previous employment fields - only used if experience >= 1
    previousCompany: z.string().optional(),
    previousHrName: z.string().optional(),
    previousHrEmail: z.string().email("Invalid email").optional().or(z.literal('')),
    previousStartDate: z.string().optional(),
    previousEndDate: z.string().optional(),
    consentToContact: z.boolean().optional()
}).refine(data => {
    if (data.source === 'Referral' && (!data.referredBy || data.referredBy.length < 2)) {
        return false;
    }
    if (data.source === 'Other' && (!data.otherSource || data.otherSource.length < 2)) {
        return false;
    }
    // If experience >= 1, previous company is required
    if (data.yearsOfExperience >= 1 && (!data.previousCompany || data.previousCompany.length < 2)) {
        return false;
    }
    // If HR email is provided, consent is required
    if (data.previousHrEmail && data.previousHrEmail.length > 0 && !data.consentToContact) {
        return false;
    }
    return true;
}, {
    message: "Previous employment details required for experienced candidates",
    path: ["previousCompany"]
});

type CandidateFormValues = z.infer<typeof candidateSchema>;

interface AddCandidateModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function AddCandidateModal({ onClose, onSuccess }: AddCandidateModalProps) {
    const [jobs, setJobs] = useState<any[]>([]);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [fileSizeInfo, setFileSizeInfo] = useState<string>("");

    const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<CandidateFormValues>({
        resolver: zodResolver(candidateSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            jobId: '',
            expectedSalary: undefined,
            yearsOfExperience: 0,
            skills: '',
            resumeUrl: '',
            source: 'Walk-in',
            currentSalary: undefined,
            otherSource: '',
            referredBy: '',
            dob: '',
            previousCompany: '',
            previousHrName: '',
            previousHrEmail: '',
            previousStartDate: '',
            previousEndDate: '',
            consentToContact: false
        }
    });

    const watchSource = watch('source');
    const watchResume = watch('resumeUrl');
    const watchExperience = watch('yearsOfExperience');
    const showPreviousEmployment = watchExperience >= 1;

    useEffect(() => {
        api.jobs.getAll().then(setJobs).catch(err => {
            console.error(err);
            toast.error('Failed to load jobs');
        });
    }, []);

    const handleResumeUpload = async (file: File) => {
        if (!file) return;

        const sizeInKB = (file.size / 1024).toFixed(0);
        const minSize = 50 * 1024; // 50KB
        const maxSize = 2 * 1024 * 1024; // 2MB

        if (file.size < minSize) {
            toast.error(`File too small (${sizeInKB}KB). Min size is 50KB.`);
            return;
        }

        if (file.size > maxSize) {
            toast.error(`File too large. Max size is 2MB.`);
            return;
        }

        setFileSizeInfo(`${sizeInKB} KB`);
        setUploadStatus('uploading');

        try {
            const uploadedResume = await api.applications.uploadResume(file);
            setValue('resumeUrl', uploadedResume.url);
            setUploadStatus('success');
            toast.success("Resume uploaded successfully!");
        } catch (err: any) {
            console.error(err);
            setUploadStatus('error');
            toast.error("Failed to upload resume");
        }
    };

    const onSubmit = async (data: CandidateFormValues) => {
        try {
            const skillsArray = data.skills.split(',').map(s => s.trim());

            const newCandidate = {
                name: data.name,
                email: data.email,
                phone: data.phone,
                jobId: data.jobId,
                expectedSalary: data.expectedSalary,
                currentSalary: data.currentSalary,
                yearsOfExperience: data.yearsOfExperience,
                resumeUrl: data.resumeUrl || '#',
                source: data.source === 'Other' ? data.otherSource : data.source,
                referredBy: data.source === 'Referral' ? data.referredBy : undefined,
                skills: skillsArray,
                dob: data.dob || undefined,
                stage: 'Applied',
                appliedDate: new Date().toISOString(),
                // Add previous employment data only if experienced
                ...(data.yearsOfExperience >= 1 && {
                    previousEmployment: {
                        company: data.previousCompany,
                        hrName: data.previousHrName,
                        hrEmail: data.previousHrEmail,
                        startDate: data.previousStartDate,
                        endDate: data.previousEndDate,
                        consentToContact: data.consentToContact
                    }
                })
            };

            await api.applications.submit(newCandidate);
            toast.success('Candidate added successfully!');
            onSuccess();
        } catch (error) {
            console.error('Failed to add candidate:', error);
            toast.error('Failed to add candidate');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card rounded-xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 glass border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-xl font-semibold text-white/90">Add Walk-in Candidate</h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white/80">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    {/* Job Selection */}
                    <div>
                        <label className="block text-white/70 mb-2 font-medium">Select Job Role *</label>
                        <select
                            {...register('jobId')}
                            className={`w-full px-4 py-3  ${errors.jobId ? 'border-red-500' : 'glass-input text-white/80'}`}
                        >
                            <option value="">Select a job...</option>
                            {jobs.filter(j => j.status === 'Open' || j.status === 'Active').map(job => (
                                <option key={job.id} value={job.id}>{job.title} ({job.department})</option>
                            ))}
                        </select>
                        {errors.jobId && <p className="text-red-600 text-sm mt-1">{errors.jobId.message}</p>}
                    </div>

                    {/* Personal Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-white/70 mb-2">Full Name *</label>
                            <input
                                {...register('name')}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'glass-input text-white/80'}`}
                                placeholder="Candidate Name"
                            />
                            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-white/70 mb-2">Date of Birth</label>
                            <input
                                type="date"
                                {...register('dob')}
                                className="w-full px-4 py-3 border glass-input text-white/80 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-white/70 mb-2">Email *</label>
                            <input
                                {...register('email')}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="email@example.com"
                            />
                            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="block text-white/70 mb-2">Source *</label>
                            <select
                                {...register('source')}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.source ? 'border-red-500' : 'border-gray-300'}`}
                            >
                                <option className="bg-[#0d0840]" value="Walk-in">Walk-in</option>
                                <option className="bg-[#0d0840]" value="LinkedIn">LinkedIn</option>
                                <option className="bg-[#0d0840]" value="Internshala">Internshala</option>
                                <option className="bg-[#0d0840]" value="Career Site">Career Site</option>
                                <option className="bg-[#0d0840]" value="Naukri">Naukri</option>
                                <option className="bg-[#0d0840]" value="Referral">Referral</option>
                                <option className="bg-[#0d0840]" value="Other">Other</option>
                            </select>
                            {errors.source && <p className="text-red-600 text-sm mt-1">{errors.source.message}</p>}
                        </div>

                        {watchSource === 'Referral' && (
                            <div>
                                <label className="block text-white/70 mb-2">Referral Name *</label>
                                <input
                                    {...register('referredBy')}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.referredBy ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Enter referrer's name"
                                />
                                {errors.referredBy && <p className="text-red-600 text-sm mt-1">{errors.referredBy.message}</p>}
                            </div>
                        )}

                        <div>
                            <label className="block text-white/70 mb-2">Phone *</label>
                            <input
                                {...register('phone')}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="Phone Number"
                            />
                            {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>}
                        </div>

                        <div>
                            <label className="block text-white/70 mb-2">Experience (Years) *</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                {...register('yearsOfExperience', {
                                    valueAsNumber: true,
                                    min: {
                                        value: 0,
                                        message: "Experience cannot be negative"
                                    }
                                })}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.yearsOfExperience ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="0"
                                onKeyDown={(e) => {
                                    if (e.key === '-' || e.key === 'e') {
                                        e.preventDefault();
                                    }
                                }}
                            />
                            {errors.yearsOfExperience && <p className="text-red-600 text-sm mt-1">{errors.yearsOfExperience.message}</p>}
                        </div>
                    </div>

                    {/* Resume Upload */}
                    <div>
                        <label className="block text-white/70 mb-2">Resume *</label>
                        <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${uploadStatus === 'success' ? 'border-green-500 bg-green-500/10' :
                            uploadStatus === 'uploading' ? 'border-yellow-400 bg-yellow-500/10' :
                                'border-white/20 hover:border-white/40'
                            }`}>
                            <Upload className={`w-12 h-12 mx-auto mb-4 ${uploadStatus === 'success' ? 'text-green-300' : 'text-white/40'
                                }`} />
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => e.target.files?.[0] && handleResumeUpload(e.target.files[0])}
                                className="hidden"
                                id="resume-upload"
                                disabled={uploadStatus === 'uploading'}
                            />
                            <label
                                htmlFor="resume-upload"
                                className={`cursor-pointer accent-indigo-500 hover:underline ${uploadStatus === 'uploading' ? 'opacity-90 cursor-not-allowed' : ''
                                    }`}
                            >
                                {uploadStatus === 'uploading' ? 'Uploading...' : 'Click to upload'}
                            </label>
                            <div className="mt-2 text-sm space-y-1">
                                <p className="text-white/50">Required: PDF, DOC, or DOCX (50KB - 2MB)</p>
                                {uploadStatus === 'uploading' && (
                                    <p className="text-yellow-600 font-medium animate-pulse">
                                        Uploading... Please wait
                                    </p>
                                )}
                                {uploadStatus === 'success' && watchResume && ( 
                                    <div className="text-green-700 font-medium">
                                        <p>✔ Upload Complete</p>
                                        <p className="text-xs text-green-600">{fileSizeInfo}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                        <label className="block text-blue-300 font-medium mb-2">Key Skills (Comma separated) *</label>
                        <textarea
                            {...register('skills')}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.skills ? 'border-red-500' : 'glass-input'}`}
                            placeholder="e.g. React, Node.js, TypeScript"
                            rows={3}
                        />
                        {errors.skills && <p className="text-red-600 text-sm mt-1">{errors.skills.message}</p>}
                    </div>

                    {/* Previous Employment Section - Only shown for experienced candidates */}
                    {showPreviousEmployment && (
                        <div className="glass border border-white/10 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-white/90 mb-4">Previous Employment Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white/70 mb-2">Previous Company *</label>
                                    <input
                                        {...register('previousCompany')}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.previousCompany ? 'border-red-500' : 'border-gray-300'}`}
                                        placeholder="Company Name"
                                    />
                                    {errors.previousCompany && <p className="text-red-600 text-sm mt-1">{errors.previousCompany.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-white/70 mb-2">HR Name</label>
                                    <input
                                        {...register('previousHrName')}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="HR Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/70 mb-2">HR Email</label>
                                    <input
                                        type="email"
                                        {...register('previousHrEmail')}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.previousHrEmail ? 'border-red-500' : 'border-gray-300'}`}
                                        placeholder="hr@company.com"
                                    />
                                    {errors.previousHrEmail && <p className="text-red-600 text-sm mt-1">{errors.previousHrEmail.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-white/70 mb-2">Start Date *</label>
                                    <input
                                        type="date"
                                        {...register('previousStartDate')}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.previousStartDate ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                    {errors.previousStartDate && <p className="text-red-600 text-sm mt-1">{errors.previousStartDate.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-white/70 mb-2">End Date</label>
                                    <input
                                        type="date"
                                        {...register('previousEndDate')}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            {...register('consentToContact')}
                                            className="w-4 h-4 accent-indigo-500 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-white/70">Consent to Contact HR</span>
                                    </label>
                                </div>
                            </div>
                            {watch('previousHrEmail') && !watch('consentToContact') && (
                                <p className="text-amber-300 text-sm mt-2">
                                    ⚠ Consent required if HR email is provided
                                </p>
                            )}
                        </div>
                    )}

                    {/* Salary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-white/70 mb-2">Current Salary</label>
                            <input
                                type="number"
                                {...register('currentSalary', { valueAsNumber: true })}
                                className="w-full px-4 py-3 border glass-input rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 mb-2">Expected Salary *</label>
                            <input
                                type="number"
                                {...register('expectedSalary', { valueAsNumber: true })}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.expectedSalary ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="Required"
                            />
                            {errors.expectedSalary && <p className="text-red-600 text-sm mt-1">{errors.expectedSalary.message}</p>}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-white/10">
                        <button
                            type="submit"
                            disabled={isSubmitting || uploadStatus === 'uploading'}
                            className="flex-1 btn-glass-primary transition-colors disabled:opacity-100"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Walk-in Candidate'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 glass text-white/80 hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}