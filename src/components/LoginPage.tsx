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
}

export function LoginPage({ onLogin, onPublicAccess }: LoginPageProps) {
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
      console.error("Login Error:", err);
      if (err.response?.data?.detail) {
        setAuthError(err.response.data.detail);
      } else if (err.message) {
        setAuthError(err.message);
      } else {
        setAuthError('Login failed. Please check your connection.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10 border border-white/50">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-2xl shadow-blue-500/40 ring-4 ring-blue-100">
            <span className="text-white font-bold text-4xl">A</span>
          </div>
          <h1 className="text-blue-600 mb-1 text-3xl tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Recruitment HRMS</h1>
          <p className="text-gray-600">Enterprise Recruitment Solution</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-gray-700 mb-2">Email or Username</label>
            <input
              type="text"
              {...register('email')}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Enter your email or username"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              {...register('password')}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>

          <div className="flex flex-col gap-3 text-center mt-6">
            <a href="#" className="text-blue-600 text-sm hover:underline">
              Forgot Password?
            </a>

            {onPublicAccess && (
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">or</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>
            )}

            {onPublicAccess && (
              <button
                type="button"
                onClick={onPublicAccess}
                className="w-full bg-white text-blue-600 border-2 border-blue-600/20 py-2.5 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
              >
                View Public Job Board
              </button>
            )}
          </div>
        </form>


      </div>
    </div>
  );
}