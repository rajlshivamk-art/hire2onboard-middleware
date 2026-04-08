import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User } from '../types';
import { api } from '../lib/api';
import { setAccessToken } from '../types';

const loginSchema = z.object({
  email: z.string().min(1, 'Email or Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onLogin: (user: User) => void;
  onPublicAccess?: () => void;
  onForgotPassword: () => void;
  onRegister?: () => void;
}

export function LoginPage({
  onLogin,
  onPublicAccess,
  onForgotPassword,
  onRegister,
}: LoginPageProps) {
  const [authError, setAuthError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError('');
    try {
      const { access_token, user } = await api.auth.login(
        data.email,
        data.password
      );
      setAccessToken(access_token);
      onLogin(user);
    } catch (err: any) {
      if (err.response?.data?.detail) setAuthError(err.response.data.detail);
      else if (err.message) setAuthError(err.message);
      else setAuthError('Login failed. Please check your connection.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 1440 420"
          preserveAspectRatio="xMidYMax slice"
        >
          <path d="M0 420 L0 280 L120 180 L240 260 L360 140 L480 220 L600 100 L720 200 L840 120 L960 210 L1080 140 L1200 230 L1320 160 L1440 240 L1440 420 Z" fill="rgba(15,20,80,0.7)" />
          <path d="M0 420 L0 320 L180 240 L300 300 L420 200 L540 280 L660 180 L780 260 L900 190 L1020 270 L1140 210 L1260 300 L1380 240 L1440 290 L1440 420 Z" fill="rgba(10,14,60,0.85)" />
        </svg>
      </div>

      {/* Card */}
      <div
        className="relative z-10 mx-auto"
        style={{
          width: '360px',
          maxWidth: '90%',
          padding: '40px 34px',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        }}
      >
        <h2 className="text-center text-2xl text-white font-semibold mb-8">
          Login
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Email */}
          <input
            type="text"
            placeholder="Email"
            {...register('email')}
            className="w-full bg-transparent border-b border-white/40 pb-2 text-white outline-none placeholder-white/60"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            {...register('password')}
            className="w-full bg-transparent border-b border-white/40 pb-2 text-white outline-none placeholder-white/60"
          />

          {/* Forgot */}
          <div className="flex justify-end text-sm">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-white/70 hover:text-white"
            >
              Forgot Password?
            </button>
          </div>

          {/* Error */}
          {authError && (
            <div className="text-xs text-red-300">
              {authError}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-3 mt-2">

            {/* Login */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-full bg-white text-indigo-700 font-medium hover:bg-gray-200 transition"
            >
              {isSubmitting ? 'Signing in…' : 'Login'}
            </button>

            {/* Register (FIXED CLICK SAFE) */}
            <div className="text-center text-sm text-white/70 mt-1">
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  if (onRegister) onRegister();
                  else console.warn("onRegister not provided");
                }}
                className="text-white font-medium hover:underline"
              >
                Register
              </button>
            </div>

            {/* Public */}
            {onPublicAccess && (
              <button
                type="button"
                onClick={onPublicAccess}
                className="w-full py-2.5 rounded-full border border-white/30 text-white/80 hover:bg-white/10 transition"
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