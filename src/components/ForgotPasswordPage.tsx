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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                <h1 className="text-2xl font-semibold text-center mb-2">
                    Forgot Password
                </h1>

                <p className="text-sm text-gray-500 text-center mb-6">
                    Enter your email to receive a password reset link
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <input
                            {...register('email')}
                            placeholder="john@example.com"
                            className="w-full border-b border-gray-300 px-1 py-2 focus:outline-none focus:border-blue-600"
                        />
                        {errors.email && (
                            <p className="text-xs text-red-600 mt-1">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {isSubmitting ? 'Sending…' : 'Send Reset Link'}
                    </button>

                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full text-sm text-blue-600 hover:underline"
                    >
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
    );
}
