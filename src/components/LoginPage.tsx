import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User } from '../types';
import { api } from '../lib/api';

const loginSchema = z.object({
  email: z.string().min(1, 'Email or Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onLogin: (user: User) => void;
  onPublicAccess?: () => void;
  onForgotPassword: () => void;
}

export function LoginPage({ onLogin, onPublicAccess, onForgotPassword }: LoginPageProps) {
  const [authError, setAuthError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError('');
    try {
      const user = await api.auth.login(data.email, data.password);
      onLogin(user);
    } catch (err: any) {
      if (err.response?.data?.detail) setAuthError(err.response.data.detail);
      else if (err.message) setAuthError(err.message);
      else setAuthError('Login failed. Please check your connection.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100 p-4 relative overflow-hidden">

      {/* Premium Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 px-8 py-8">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-2xl shadow-blue-500/40 ring-4 ring-blue-100">
            <span className="text-white font-bold text-4xl">A</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Recruitment HRMS
          </h1>
          <p className="text-gray-600">Enterprise Recruitment Solution</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Email or Username
            </label>
            <input
              type="text"
              placeholder="john@example.com or username"
              {...register('email')}
              className={`w-full px-1 py-2 text-sm bg-transparent border-0 border-b focus:outline-none focus:ring-0 transition ${errors.email
                ? 'border-b-red-500'
                : 'border-b-gray-300 focus:border-b-blue-500'
                }`}
            />
            {errors.email && (
              <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="John@123"
              {...register('password')}
              className={`w-full px-1 py-2 text-sm bg-transparent border-0 border-b focus:outline-none focus:ring-0 transition ${errors.password
                ? 'border-b-red-500'
                : 'border-b-gray-300 focus:border-b-blue-500'
                }`}
            />
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Auth Error */}
          {authError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {authError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Signing In…' : 'Sign In'}
          </button>

          {/* Footer */}
          <div className="text-center space-y-2 pt-2">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot Password?
            </button>

            {onPublicAccess && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="text-xs text-gray-400 uppercase">or</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>

                <button
                  type="button"
                  onClick={onPublicAccess}
                  className="w-full py-2.5 rounded-lg border border-blue-600/30 text-sm text-blue-600 hover:bg-blue-50 transition"
                >
                  View Public Job Board
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
