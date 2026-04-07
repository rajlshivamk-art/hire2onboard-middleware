import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "../lib/api";

const schema = z
    .object({
        password: z.string().min(6, "Minimum 6 characters"),
        confirmPassword: z.string().min(6, "Minimum 6 characters"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type FormData = z.infer<typeof schema>;

interface ResetPasswordProps {
    token: string;
    onSuccess?: () => void; // optional callback after successful reset
}

export function ResetPasswordPage({ token, onSuccess }: ResetPasswordProps) {
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const { register, handleSubmit, formState } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        if (!token) {
            setError("Invalid or expired reset link");
            return;
        }

        try {
            const res = await api.auth.resetPassword(token, data.password);
            setMessage(res.message || "Password reset successful");

            // optional callback to switch screen
            if (onSuccess) {
                setTimeout(() => onSuccess(), 2000);
            }
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            setError(typeof detail === "string" ? detail : "Password reset failed");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <form onSubmit={handleSubmit(onSubmit)} className="glass-card w-96 space-y-4 p-6">
                <h1 className="text-xl font-semibold text-center text-white">Reset Password</h1>

                <input
                    type="password"
                    {...register("password")}
                    placeholder="New password"
                    className={`glass-input w-full text-white placeholder-white/50 ${formState.errors.password
                        ? 'border-rose-400'
                        : 'border-white/20 focus:border-cyan-400'
                        }`}
                />
                {formState.errors.password && (
                    <p className="text-rose-300 text-sm">{formState.errors.password.message}</p>
                )}

                <input
                    type="password"
                    {...register("confirmPassword")}
                    placeholder="Confirm password"
                    className={`glass-input w-full text-white placeholder-white/50 ${formState.errors.confirmPassword
                        ? 'border-rose-400'
                        : 'border-white/20 focus:border-cyan-400'
                        }`}
                />
                {formState.errors.confirmPassword && (
                    <p className="text-rose-300 text-sm">{formState.errors.confirmPassword.message}</p>
                )}

                {error && <p className="text-rose-300 text-center bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2">{error}</p>}
                {message && <p className="text-emerald-300 text-center bg-emerald-500/10 border border-emerald-500/20 rounded px-3 py-2">{message}</p>}

                <button type="submit" className="w-full bg-cyan-500 text-white py-2 rounded hover:bg-cyan-400 transition">
                    Reset Password
                </button>
            </form>
        </div>
    );
}
