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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-gray-900">Generate Offer Letter</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900">
              <strong>Candidate:</strong> {candidate.name}
            </p>
            <p className="text-blue-900">
              <strong>Position:</strong> {job?.title}
            </p>
          </div>

          {/* Salary Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-gray-600 text-sm mb-1">Salary Range</p>
              <p className="text-gray-900">
                ₹{job?.salaryRange.min.toLocaleString()} - ₹{job?.salaryRange.max.toLocaleString()}
              </p>
            </div>
            {candidate.currentSalary && (
              <div>
                <p className="text-gray-600 text-sm mb-1">Current Salary</p>
                <p className="text-gray-900">₹{candidate.currentSalary.toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-gray-600 text-sm mb-1">Expected Salary</p>
              <p className="text-gray-900">₹{candidate.expectedSalary?.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Offered Salary (₹) *</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                {...register('salary', { valueAsNumber: true })}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.salary ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="Enter offered salary"
              />
            </div>
            {errors.salary && (
              <p className="mt-1 text-sm text-red-600">{errors.salary.message}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Proposed Start Date *</label>
            <input
              type="date"
              {...register('startDate')}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Benefits Package</label>
            <textarea
              {...register('benefits')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="List benefits included in the offer"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Additional Terms</label>
            <textarea
              {...register('additionalTerms')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Any additional terms or conditions"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Upload Offer Letter (Optional)</label>
            <label className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer ${selectedFile ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
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
                  <FileText className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-sm text-blue-900 font-semibold text-center">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Click to change file</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 font-medium text-center">
                    Click to Upload Offer Letter
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Accepted formats: PDF, DOC, DOCX</p>
                </>
              )}
            </label>
          </div>


          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              The offer letter will be automatically generated and sent to {candidate.email}. A copy will be stored in the candidate's documents.
            </p>
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Generate & Send Offer
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