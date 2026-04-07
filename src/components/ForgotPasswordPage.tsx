import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../lib/api';

const forgotSchema = z.object({
    email: z.string().email('Invalid email address'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

interface ForgotPasswordPageProps {
    onBack: () => void;
}

export function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotFormValues>({
        resolver: zodResolver(forgotSchema),
    });

    const onSubmit = async (data: ForgotFormValues) => {
        setError(null);
        setMessage(null);

        try {
            const res = await api.auth.forgotPassword(data.email);

            setMessage(
                res?.message ||
                'If the email exists, a reset link has been sent.'
            );
        } catch (err: any) {
            const detail = err?.response?.data?.detail;

            // FastAPI can send object/array for 422 → never render raw object
            setError(
                typeof detail === 'string'
                    ? detail
                    : 'Unable to send reset email'
            );
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
            <div className="glass-card w-full max-w-md p-8">
                <h1 className="text-2xl font-semibold text-center mb-2 text-white">
                    Forgot Password
                </h1>

                <p className="text-sm text-white/70 text-center mb-6">
                    Enter your email to receive a password reset link
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <input
                            {...register('email')}
                            placeholder="john@example.com"
                            className={`glass-input w-full text-white placeholder-white/50 ${errors.email
                                ? 'border-rose-400'
                                : 'border-white/20 focus:border-cyan-400'
                                }`}
                        />
                        {errors.email && (
                            <p className="text-xs text-rose-300 mt-1">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded px-3 py-2">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-cyan-500 text-white py-2.5 rounded-lg hover:bg-cyan-400 transition disabled:opacity-50"
                    >
                        {isSubmitting ? 'Sending…' : 'Send Reset Link'}
                    </button>

                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full text-sm text-cyan-300 hover:text-cyan-200 hover:underline"
                    >
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
    );
}
