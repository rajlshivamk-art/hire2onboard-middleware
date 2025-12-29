import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
    referredBy: z.string().optional(),
}).refine(data => {
    if (data.source === 'Referral' && (!data.referredBy || data.referredBy.length < 2)) {
        return false;
    }
    return true;
}, {
    message: "Referral name is required",
    path: ["referredBy"]
});

type CandidateFormValues = z.infer<typeof candidateSchema>;

interface AddCandidateModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function AddCandidateModal({ onClose, onSuccess }: AddCandidateModalProps) {


    const [jobs, setJobs] = useState<any[]>([]);

    useEffect(() => {
        api.jobs.getAll().then(setJobs).catch(console.error);
    }, []);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CandidateFormValues>({
        resolver: zodResolver(candidateSchema),
        defaultValues: {
            resumeUrl: '#',
            source: 'Walk-in'
        }
    });

    const watchSource = watch('source');



    // Calculate Match Score Logic


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
                source: data.source, // Uses selected source
                referredBy: data.source === 'Referral' ? data.referredBy : undefined,
                skills: skillsArray,
                stage: 'Applied', // Applied > Screening
                appliedDate: new Date().toISOString()
            };

            await api.applications.submit(newCandidate);

            // If score is high (>= 80), auto-move to Screening? 
            // For now, adhering to workflow: stays in Applied until HR moves.

            alert(`Candidate added successfully!`);
            onSuccess();
        } catch (error) {
            console.error('Failed to add candidate:', error);
            alert('Failed to add candidate');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-xl font-semibold text-gray-900">Add Walk-in Candidate</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">

                    {/* Job Selection */}
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">Select Job Role *</label>
                        <select
                            {...register('jobId')}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.jobId ? 'border-red-500' : 'border-gray-300'}`}
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
                            <label className="block text-gray-700 mb-2">Full Name *</label>
                            <input
                                {...register('name')}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="Candidate Name"
                            />
                            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2">Email *</label>
                            <input
                                {...register('email')}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="email@example.com"
                            />
                            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2">Source *</label>
                            <select
                                {...register('source')}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.source ? 'border-red-500' : 'border-gray-300'}`}
                            >
                                <option value="Walk-in">Walk-in</option>
                                <option value="LinkedIn">LinkedIn</option>
                                <option value="Internshala">Internshala</option>
                                <option value="Career Site">Career Site</option>
                                <option value="Naukri">Naukri</option>
                                <option value="Referral">Referral</option>
                                <option value="Other">Other</option>
                            </select>
                            {errors.source && <p className="text-red-600 text-sm mt-1">{errors.source.message}</p>}
                        </div>

                        {watchSource === 'Referral' && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="block text-gray-700 mb-2">Referral Name *</label>
                                <input
                                    {...register('referredBy')}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.referredBy ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Enter referrer's name"
                                />
                                {errors.referredBy && <p className="text-red-600 text-sm mt-1">{errors.referredBy.message}</p>}
                            </div>
                        )}
                        <div>
                            <label className="block text-gray-700 mb-2">Phone *</label>
                            <input
                                {...register('phone')}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="Phone Number"
                            />
                            {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>}
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2">Experience (Years) *</label>
                            <input
                                type="number"
                                {...register('yearsOfExperience', { valueAsNumber: true })}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.yearsOfExperience ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="0"
                            />
                            {errors.yearsOfExperience && <p className="text-red-600 text-sm mt-1">{errors.yearsOfExperience.message}</p>}
                        </div>
                    </div>

                    {/* Skills & Match Score */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex justify-between items-start mb-2">
                            <label className="block text-blue-900 font-medium">Key Skills (Comma separated) *</label>
                        </div>
                        <textarea
                            {...register('skills')}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.skills ? 'border-red-500' : 'border-blue-200'}`}
                            placeholder="e.g. React, Node.js, TypeScript, Python"
                            rows={3}
                        />
                        {errors.skills && <p className="text-red-600 text-sm mt-1">{errors.skills.message}</p>}

                    </div>

                    {/* Salary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-gray-700 mb-2">Current Salary</label>
                            <input
                                type="number"
                                {...register('currentSalary', { valueAsNumber: true })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2">Expected Salary *</label>
                            <input
                                type="number"
                                {...register('expectedSalary', { valueAsNumber: true })}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.expectedSalary ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="Required"
                            />
                            {errors.expectedSalary && <p className="text-red-600 text-sm mt-1">{errors.expectedSalary.message}</p>}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Walk-in Candidate'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
