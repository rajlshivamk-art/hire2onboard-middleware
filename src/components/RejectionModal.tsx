import { X, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Candidate } from '../types';

const rejectionSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
  feedback: z.string().min(1, 'Internal feedback is required'),
  sendEmail: z.boolean(),
});

type RejectionFormValues = z.infer<typeof rejectionSchema>;

interface RejectionModalProps {
  candidate: Candidate;
  onReject: (reason: string, feedback: string, sendEmail: boolean) => void;
  onClose: () => void;
}

export function RejectionModal({ candidate, onReject, onClose }: RejectionModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RejectionFormValues>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: {
      reason: '',
      feedback: '',
      sendEmail: true,
    },
  });

  const onSubmit = (data: RejectionFormValues) => {
    onReject(data.reason, data.feedback, data.sendEmail);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass-card max-w-lg w-full">
        <div className="bg-red-500/20 border-b border-red-500/30 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-300" />
            </div>
            <h2 className="text-white">Reject Candidate</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
            <p className="text-amber-200 text-sm">
              You are about to reject <strong>{candidate.name}</strong>. This action will move the candidate to the archived state and optionally send a rejection email.
            </p>
          </div>

          <div>
            <label className="block text-white/70 mb-2">Rejection Reason *</label>
            <select
              {...register('reason')}
              className={`glass-input w-full ${errors.reason ? 'border-rose-400' : ''}`}
            >
              <option value="">Select a reason</option>
              <option value="Skills">Insufficient Skills</option>
              <option value="Experience">Lack of Experience</option>
              <option value="Salary">Salary Expectations Mismatch</option>
              <option value="Culture">Cultural Fit Concerns</option>
              <option value="Behavior">Behavioral Concerns</option>
              <option value="Other">Other</option>
            </select>
            {errors.reason && (
              <p className="mt-1 text-sm text-rose-300">{errors.reason.message}</p>
            )}
          </div>

          <div>
            <label className="block text-white/70 mb-2">Internal Feedback *</label>
            <textarea
              {...register('feedback')}
              className={`glass-input w-full ${errors.feedback ? 'border-rose-400' : ''}`}
              rows={4}
              placeholder="Provide detailed internal feedback for record keeping..."
            />
            {errors.feedback && (
              <p className="mt-1 text-sm text-rose-300">{errors.feedback.message}</p>
            )}
            <p className="text-white/50 text-sm mt-1">
              This feedback will be stored internally and not shared with the candidate.
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg">
            <input
              type="checkbox"
              id="sendEmail"
              {...register('sendEmail')}
              className="w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500"
            />
            <label htmlFor="sendEmail" className="text-white/70 cursor-pointer">
              Send rejection email to candidate
            </label>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-red-500 text-white py-3 rounded-lg hover:bg-red-400 transition-colors disabled:opacity-50"
            >
              Confirm Rejection
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
