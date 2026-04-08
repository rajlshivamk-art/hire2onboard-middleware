import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "../lib/api";
import { User } from "../types";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must include uppercase")
    .regex(/[a-z]/, "Must include lowercase")
    .regex(/[0-9]/, "Must include number"),
  confirm: z.string()
}).refine((data) => data.password === data.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

type FormValues = z.infer<typeof registerSchema>;

interface Props {
  onRegisterSuccess: () => void;
}

export function RegisterPage({ onRegisterSuccess }: Props) {
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch("password");

  const onSubmit = async (data: FormValues) => {
    setError("");
    try {
      await api.auth.register(data.name, data.email, data.password);
      onRegisterSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">

      {/* SAME BACKGROUND AS LOGIN */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 420">
          <path d="M0 420 L0 280 L120 180 L240 260 L360 140 L480 220 L600 100 L720 200 L840 120 L960 210 L1080 140 L1200 230 L1320 160 L1440 240 L1440 420 Z" fill="rgba(15,20,80,0.7)" />
        </svg>
      </div>

      {/* CARD */}
      <div className="relative z-10 mx-auto"
        style={{
          width: "360px",
          padding: "40px 34px",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(18px)",
          border: "1px solid rgba(255,255,255,0.25)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <h2 className="text-center text-2xl text-white font-semibold mb-6">
          Register
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* NAME */}
          <input
            placeholder="Full Name"
            {...register("name")}
            className="w-full bg-transparent border-b border-white/40 pb-2 text-white outline-none"
          />
          {errors.name && <p className="text-red-300 text-xs">{errors.name.message}</p>}

          {/* EMAIL */}
          <input
            placeholder="Email"
            {...register("email")}
            className="w-full bg-transparent border-b border-white/40 pb-2 text-white outline-none"
          />
          {errors.email && <p className="text-red-300 text-xs">{errors.email.message}</p>}

          {/* PASSWORD */}
          <input
            type="password"
            placeholder="Password"
            {...register("password")}
            className="w-full bg-transparent border-b border-white/40 pb-2 text-white outline-none"
          />
          {password && (
            <div className="text-xs text-white/60">
              Strength: {password.length < 6 ? "Weak" : password.length < 10 ? "Medium" : "Strong"}
            </div>
          )}
          {errors.password && <p className="text-red-300 text-xs">{errors.password.message}</p>}

          {/* CONFIRM */}
          <input
            type="password"
            placeholder="Confirm Password"
            {...register("confirm")}
            className="w-full bg-transparent border-b border-white/40 pb-2 text-white outline-none"
          />
          {errors.confirm && <p className="text-red-300 text-xs">{errors.confirm.message}</p>}

          {/* ERROR */}
          {error && <p className="text-red-400 text-xs">{error}</p>}

          {/* BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-full bg-white text-indigo-700 font-medium hover:bg-gray-200"
          >
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>

        </form>
      </div>
    </div>
  );
}