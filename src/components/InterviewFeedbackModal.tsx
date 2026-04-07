import { useMemo } from 'react';
import { X, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Candidate, UserRole, CandidateStage } from '../types';
import { api } from '../lib/api';

const createFeedbackSchema = (role: UserRole, stage: CandidateStage) => {
  return z.object({
    roundName: z.string().min(1, 'Round name is required'),
    rating: z.number().min(1, 'Rating is required'),
    comments: z.string().min(1, 'Comments are required'),
    decision: z.enum(['Advance', 'Reject', 'Hold']),
    technicalSkills: z.string().optional(),
    codeQuality: z.string().optional(),
    problemSolving: z.string().optional(),
    cultureFit: z.string().optional(),
    communication: z.string().optional(),
    negotiatedSalary: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (role === 'Tech Interviewer') {
      if (!data.technicalSkills) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Technical skills assessment is required', path: ['technicalSkills'] });
      if (!data.codeQuality) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Code quality assessment is required', path: ['codeQuality'] });
      if (!data.problemSolving) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Problem solving assessment is required', path: ['problemSolving'] });
    } else if (role === 'HR' || role === 'Recruiter') {
      if (stage === 'Round 1') {
        if (!data.cultureFit) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Behaviour & Grooming assessment is required', path: ['cultureFit'] });
        if (!data.communication) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Communication skills assessment is required', path: ['communication'] });
      } else if (stage === 'Round 3') {
        if (!data.negotiatedSalary) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Salary discussion is required for Final Round', path: ['negotiatedSalary'] });
      }
    } else if (role === 'Manager') {
      if (!data.cultureFit) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Leadership potential assessment is required', path: ['cultureFit'] });
      if (!data.communication) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Team fit assessment is required', path: ['communication'] });
    }
  });
};

type FeedbackFormValues = z.infer<ReturnType<typeof createFeedbackSchema>>;

interface InterviewFeedbackModalProps {
  candidate: Candidate;
  user: User;
  onClose: () => void;
  onFeedbackSubmitted?: () => void;
  initialData?: any;
  feedbackId?: string;
}

export function InterviewFeedbackModal({ candidate, user, onClose, onFeedbackSubmitted, initialData, feedbackId }: InterviewFeedbackModalProps) {
  console.log("Feedback Modal - User Role:", user.role, "Candidate Stage:", candidate.stage);
  const schema = useMemo(() => createFeedbackSchema(user.role, candidate.stage), [user.role, candidate.stage]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      roundName: initialData?.roundName || '',
      rating: initialData?.rating || 0,
      technicalSkills: initialData?.technicalSkills || '',
      codeQuality: initialData?.codeQuality || '',
      problemSolving: initialData?.problemSolving || '',
      cultureFit: initialData?.cultureFit || '',
      communication: initialData?.communication || '',
      negotiatedSalary: initialData?.negotiatedSalary ? String(initialData.negotiatedSalary) : '',
      comments: initialData?.comments || '',
      decision: initialData?.decision || 'Advance',
    },
  });

  const rating = watch('rating');

  const onSubmit = async (data: FeedbackFormValues) => {
    try {
      const payload = {
        ...data,
        stage: candidate.stage,
        reviewerId: user.id,
        reviewerName: user.name,
        reviewerRole: user.role,
        // Convert negotiatedSalary to number or undefined if empty string
        negotiatedSalary: data.negotiatedSalary ? parseFloat(data.negotiatedSalary) : null,
      };

      if (feedbackId) {
        await api.applications.updateFeedback(candidate.id, feedbackId, payload);
        alert('Feedback updated successfully!');
      } else {
        await api.applications.submitFeedback(candidate.id, payload);
        alert('Feedback submitted successfully!');
      }
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-[32px] border border-white/10 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white">Interview Feedback - {candidate.stage}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Round Name */}
          <div>
            <label className="block text-white/70 mb-2">Round Name *</label>
            <input
              type="text"
              {...register('roundName')}
              className={`glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500 outline-none ${errors.roundName ? 'border-red-400' : ''}`}
              placeholder="e.g. System Design, Coding Round 1"
            />
            {errors.roundName && (
              <p className="mt-1 text-sm text-rose-300">{errors.roundName.message}</p>
            )}
          </div>

          {/* Rating */}
          <div>
            <label className="block text-white/70 mb-2">Overall Rating *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setValue('rating', star, { shouldValidate: true })}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-400'
                      }`}
                  />
                </button>
              ))}
            </div>
            {errors.rating && (
              <p className="mt-1 text-sm text-rose-300">{errors.rating.message}</p>
            )}
          </div>

          {/* Tech Interviewer Fields */}
          {user.role === 'Tech Interviewer' && (
            <>
              <div>
                <label className="block text-white/70 mb-2">Code Quality *</label>
                <textarea
                  {...register('codeQuality')}
                  className={`glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500 outline-none resize-none ${errors.codeQuality ? 'border-red-400' : ''}`}
                  rows={3}
                  placeholder="Assess code quality, best practices, etc."
                />
                {errors.codeQuality && (
                  <p className="mt-1 text-sm text-rose-300">{errors.codeQuality.message}</p>
                )}
              </div>

              <div>
                <label className="block text-white/70 mb-2">Problem Solving *</label>
                <textarea
                  {...register('problemSolving')}
                  className={`glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500 outline-none resize-none ${errors.problemSolving ? 'border-red-400' : ''}`}
                  rows={3}
                  placeholder="How did they approach problems?"
                />
                {errors.problemSolving && (
                  <p className="mt-1 text-sm text-rose-300">{errors.problemSolving.message}</p>
                )}
              </div>

              <div>
                <label className="block text-white/70 mb-2">Technical Skills *</label>
                <textarea
                  {...register('technicalSkills')}
                  className={`glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500 outline-none resize-none ${errors.technicalSkills ? 'border-red-400' : ''}`}
                  rows={3}
                  placeholder="Evaluate specific technical competencies"
                />
                {errors.technicalSkills && (
                  <p className="mt-1 text-sm text-rose-300">{errors.technicalSkills.message}</p>
                )}
              </div>

              {/* Salary field HIDDEN for Tech Interviewers */}
              <div className="glass-card border border-cyan-500/20 bg-cyan-500/10 rounded-2xl p-4">
                <p className="text-cyan-200 text-sm">
                  Note: Salary negotiation fields are not available for your role.
                </p>
              </div>
            </>
          )}

          {/* HR & Recruiter Fields */}
          {(user.role === 'HR' || user.role === 'Recruiter') && (
            <>
              <div>
                <label className="block text-white/70 mb-2">
                  {candidate.stage === 'Round 1' ? 'Behaviour & Grooming *' : 'Culture Fit *'}
                </label>
                <textarea
                  {...register('cultureFit')}
                  className={`glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500 outline-none resize-none ${errors.cultureFit ? 'border-red-400' : ''}`}
                  rows={3}
                  placeholder={candidate.stage === 'Round 1' ? "Assess behaviour, communication, and grooming" : "How well does the candidate align with company culture?"}
                />
                {errors.cultureFit && (
                  <p className="mt-1 text-sm text-rose-300">{errors.cultureFit.message}</p>
                )}
              </div>

              <div>
                <label className="block text-white/70 mb-2">Communication Skills *</label>
                <textarea
                  {...register('communication')}
                  className={`glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500 outline-none resize-none ${errors.communication ? 'border-red-400' : ''}`}
                  rows={3}
                  placeholder="Assess verbal and written communication"
                />
                {errors.communication && (
                  <p className="mt-1 text-sm text-rose-300">{errors.communication.message}</p>
                )}
              </div>

              {/* Salary Discussion - Only for Round 3 (Final HR) */}
              {candidate.stage === 'Round 3' && (
                <div>
                  <label className="block text-white/70 mb-2">Negotiated Salary ($) *</label>
                  <input
                    type="number"
                    {...register('negotiatedSalary')}
                    className={`glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500 outline-none ${errors.negotiatedSalary ? 'border-red-400' : ''}`}
                    placeholder="Enter negotiated salary"
                  />
                  {errors.negotiatedSalary && (
                    <p className="mt-1 text-sm text-rose-300">{errors.negotiatedSalary.message}</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Manager Fields */}
          {user.role === 'Manager' && (
            <>
              <div>
                <label className="block text-white/70 mb-2">Leadership Potential *</label>
                <textarea
                  {...register('cultureFit')}
                  className={`glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500 outline-none resize-none ${errors.cultureFit ? 'border-red-400' : ''}`}
                  rows={3}
                  placeholder="Assess leadership and strategic thinking"
                />
                {errors.cultureFit && (
                  <p className="mt-1 text-sm text-rose-300">{errors.cultureFit.message}</p>
                )}
              </div>

              <div>
                <label className="block text-white/70 mb-2">Team Fit *</label>
                <textarea
                  {...register('communication')}
                  className={`glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500 outline-none resize-none ${errors.communication ? 'border-red-400' : ''}`}
                  rows={3}
                  placeholder="How well will they fit with the existing team?"
                />
                {errors.communication && (
                  <p className="mt-1 text-sm text-rose-300">{errors.communication.message}</p>
                )}
              </div>
            </>
          )}

          {/* Common Fields */}
          <div>
            <label className="block text-white/70 mb-2">Additional Comments *</label>
            <textarea
              {...register('comments')}
              className={`glass-input w-full px-4 py-3 rounded-2xl text-white bg-slate-950/70 border-white/20 focus:ring-2 focus:ring-cyan-500 outline-none resize-none ${errors.comments ? 'border-red-400' : ''}`}
              rows={4}
              placeholder="Any other observations or notes"
            />
            {errors.comments && (
              <p className="mt-1 text-sm text-rose-300">{errors.comments.message}</p>
            )}
          </div>

          <div>
            <label className="block text-white/70 mb-2">Decision *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="Advance"
                  {...register('decision')}
                  className="w-4 h-4 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-white/80">Advance</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="Hold"
                  {...register('decision')}
                  className="w-4 h-4 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-white/80">Hold</span>
              </label>
              {user.role !== 'Tech Interviewer' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="Reject"
                    {...register('decision')}
                    className="w-4 h-4 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-white/80">Reject</span>
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-cyan-500 text-slate-950 py-3 rounded-2xl hover:bg-cyan-400 transition-colors disabled:opacity-50 font-medium"
            >
              Submit Feedback
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/10 text-white py-3 rounded-2xl hover:bg-white/20 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
