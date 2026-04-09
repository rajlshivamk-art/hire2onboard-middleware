import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "../lib/api";

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().min(1, "Email is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterPageProps {
  onRegisterSuccess: () => void;
}

const autofillFix: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  WebkitBoxShadow: "0 0 0px 1000px transparent inset",
  WebkitTextFillColor: "#ffffff",
  caretColor: "#ffffff",
  transition: "background-color 5000s ease-in-out 0s",
};

export function RegisterPage({ onRegisterSuccess }: RegisterPageProps) {
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError("");

    try {
      await api.auth.registerCompany({
        admin_name: data.name,
        email: data.email,
        password: data.password,
        company_name: data.name + "'s Company",
      });

      onRegisterSuccess();
    } catch (err: any) {
      if (err.response?.data?.detail) setError(err.response.data.detail);
      else if (err.message) setError(err.message);
      else setError("Registration failed");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >

      {/* Background (same as login) */}
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
          width: "360px",
          maxWidth: "90%",
          padding: "40px 34px",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(18px)",
          border: "1px solid rgba(255,255,255,0.25)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <h2 className="text-center text-2xl text-white font-semibold mb-8">
          Register
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">

          {/* Name */}
          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder="Full Name"
              {...register("name")}
              style={autofillFix}
              className="w-full bg-transparent border-b border-white/40 py-2 text-white outline-none placeholder-white/60 text-sm"
            />
            {errors.name && (
              <p className="text-xs text-red-300 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder="Email"
              {...register("email")}
              style={autofillFix}
              className="w-full bg-transparent border-b border-white/40 py-2 text-white outline-none placeholder-white/60 text-sm"
            />
            {errors.email && (
              <p className="text-xs text-red-300 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <input
              type="password"
              placeholder="Password"
              {...register("password")}
              style={autofillFix}
              className="w-full bg-transparent border-b border-white/40 py-2 text-white outline-none placeholder-white/60 text-sm"
            />
            {errors.password && (
              <p className="text-xs text-red-300 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1">
            <input
              type="password"
              placeholder="Confirm Password"
              {...register("confirmPassword")}
              style={autofillFix}
              className="w-full bg-transparent border-b border-white/40 py-2 text-white outline-none placeholder-white/60 text-sm"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-300 mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* API Error */}
          {error && <div className="text-xs text-red-300">{error}</div>}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ fontFamily: "'Inter', sans-serif" }}
              className="w-full py-2.5 rounded-full bg-white text-indigo-700 font-semibold hover:bg-gray-200 transition"
            >
              {isSubmitting ? "Creating account..." : "Register"}
            </button>
          </div>

          {/* Back to login */}
          <div
            className="text-center text-sm text-white/70"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Already have an account?{" "}
            <button
              type="button"
              onClick={onRegisterSuccess}
              style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-white font-medium hover:underline"
            >
              Login
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}