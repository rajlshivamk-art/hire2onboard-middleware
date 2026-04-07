import { X, FileText, IndianRupee, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Candidate, Job } from '../types';

const offerSchema = z.object({
  salary: z.number().min(1, 'Salary must be a positive number'),
  startDate: z.string().min(1, 'Start date is required'),
  benefits: z.string().optional(),
  additionalTerms: z.string().optional(),
});

type OfferFormValues = z.infer<typeof offerSchema>;

interface OfferModalProps {
  candidate: Candidate;
  job: Job | undefined;
  onGenerate: (salary: number, startDate: string, additionalTerms?: string, file?: File) => void;
  onClose: () => void;
}

export function OfferModal({ candidate, job, onGenerate, onClose }: OfferModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // State for file

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      salary: candidate.expectedSalary || job?.salaryRange.max || 0,
      startDate: '',
      benefits: 'Standard benefits package including health insurance, 401k, PTO',
      additionalTerms: '',
    },
  });

  const onSubmit = async (data: OfferFormValues) => {
    try {
      await onGenerate(data.salary, data.startDate, data.additionalTerms, selectedFile || undefined);
      alert('Offer letter generated and sent to candidate!');
      onClose();
    } catch (error) {
      console.error("Error generating offer:", error);
      alert('Failed to send offer. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <h2 className="text-white">Generate Offer Letter</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-200">
              <strong>Candidate:</strong> {candidate.name}
            </p>
            <p className="text-blue-200">
              <strong>Position:</strong> {job?.title}
            </p>
          </div>

          {/* Salary Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg">
            <div>
              <p className="text-white/70 text-sm mb-1">Salary Range</p>
              <p className="text-white">
                ₹{job?.salaryRange.min.toLocaleString()} - ₹{job?.salaryRange.max.toLocaleString()}
              </p>
            </div>
            {candidate.currentSalary && (
              <div>
                <p className="text-white/70 text-sm mb-1">Current Salary</p>
                <p className="text-white">₹{candidate.currentSalary.toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-white/70 text-sm mb-1">Expected Salary</p>
              <p className="text-white">₹{candidate.expectedSalary?.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <label className="block text-white/70 mb-2">Offered Salary (₹) *</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="number"
                {...register('salary', { valueAsNumber: true })}
                className={`glass-input w-full pl-10 pr-4 py-3 ${errors.salary ? 'border-rose-400' : ''}`}
                placeholder="Enter offered salary"
              />
            </div>
            {errors.salary && (
              <p className="mt-1 text-sm text-rose-300">{errors.salary.message}</p>
            )}
          </div>

          <div>
            <label className="block text-white/70 mb-2">Proposed Start Date *</label>
            <input
              type="date"
              {...register('startDate')}
              className={`glass-input w-full px-4 py-3 ${errors.startDate ? 'border-rose-400' : ''}`}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-rose-300">{errors.startDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-white/70 mb-2">Benefits Package</label>
            <textarea
              {...register('benefits')}
              className="glass-input w-full px-4 py-3"
              rows={3}
              placeholder="List benefits included in the offer"
            />
          </div>

          <div>
            <label className="block text-white/70 mb-2">Additional Terms</label>
            <textarea
              {...register('additionalTerms')}
              className="glass-input w-full px-4 py-3"
              rows={3}
              placeholder="Any additional terms or conditions"
            />
          </div>

          <div>
            <label className="block text-white/70 mb-2">Upload Offer Letter (Optional)</label>
            <label className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer ${selectedFile ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/20 bg-slate-800/50 hover:bg-slate-700/50'}`}>
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="hidden"
                accept=".pdf,.doc,.docx"
              />

              {selectedFile ? (
                <>
                  <FileText className="w-8 h-8 text-cyan-300 mb-2" />
                  <p className="text-sm text-cyan-200 font-semibold text-center">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-cyan-300 mt-1">Click to change file</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-white/50 mb-2" />
                  <p className="text-sm text-white/70 font-medium text-center">
                    Click to Upload Offer Letter
                  </p>
                  <p className="text-xs text-white/50 mt-1">Accepted formats: PDF, DOC, DOCX</p>
                </>
              )}
            </label>
          </div>


          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-4">
            <p className="text-emerald-200 text-sm">
              The offer letter will be automatically generated and sent to {candidate.email}. A copy will be stored in the candidate's documents.
            </p>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-cyan-500 text-white py-3 rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50"
            >
              Generate & Send Offer
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 text-white/80 py-3 rounded-lg hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}