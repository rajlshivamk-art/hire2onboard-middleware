import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "../lib/api";

const uploadSchema = z.object({
    documentType: z.string().min(1, "Document type is required"),
    file: z.any().refine(
        (files) => files && files.length === 1,
        "File is required"
    ),
});

type UploadFormData = z.infer<typeof uploadSchema>;

interface OnboardingUploadPageProps {
    uploadToken: string;
}

export function OnboardingUploadPage({ uploadToken }: OnboardingUploadPageProps) {
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);

    // ✅ CORRECT: derive isExperienced from URL
    const isExperienced = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get("isExperienced") === "true";
    }, []);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<UploadFormData>({
        resolver: zodResolver(uploadSchema),
    });

    const onSubmit = async (data: UploadFormData) => {
        setError("");
        setMessage("");

        if (!uploadToken) {
            setError("Invalid or expired upload link");
            return;
        }

        try {
            setUploading(true);

            const res = await api.onboarding.uploadDocument(
                uploadToken,
                data.documentType,
                data.file[0]
            );

            setMessage(res.message || "Document uploaded successfully");
            reset();
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            setError(typeof detail === "string" ? detail : "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-content-center bg-slate-950 p-8 font-['Inter',sans-serif]">
            <div className="w-full max-w-md glass-card p-8">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-semibold text-white">
                        Upload Documents
                    </h1>
                    <p className="text-sm text-white/70">
                        Submit the requested onboarding documents
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col gap-6"
                >
                    {/* Document Type */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1">
                            Document Type
                        </label>

                        <select
                            {...register("documentType")}
                            className="glass-input w-full"
                        >
                            <option value="">Select document</option>
                            <option value="AADHAR">Aadhar Card</option>
                            <option value="PAN">PAN Card</option>
                            <option value="EDU_10TH">10th Certificate</option>
                            <option value="EDU_12TH">12th Certificate</option>
                            <option value="EDU_GRADUATION">Graduation Certificate</option>
                            <option value="EDU_POST_GRADUATION">
                                Post Graduation Certificate (if applicable)
                            </option>

                            {/* ✅ ONLY for experienced candidates */}
                            {isExperienced && (
                                <option value="EXPERIENCE">
                                    Experience Letter
                                </option>
                            )}

                            <option value="OFFER_ACCEPTANCE">
                                Offer Acceptance
                            </option>
                        </select>

                        {errors.documentType && (
                            <p className="text-xs text-rose-300 mt-1">
                                {errors.documentType.message}
                            </p>
                        )}
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-1">
                            Upload File
                        </label>

                        <input
                            type="file"
                            {...register("file")}
                            className="glass-input w-full"
                        />

                        {errors.file && (
                            <p className="text-xs text-rose-300 mt-1">
                                {errors.file.message as string}
                            </p>
                        )}
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="text-rose-300 bg-red-500/20 border border-red-500/30 p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 p-3 rounded-lg">
                            {message}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={uploading}
                        className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {uploading ? "Uploading…" : "Upload Document"}
                    </button>
                </form>
            </div>
        </div>
    );
}
