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
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f7f8fc",
                padding: "2rem",
                fontFamily: "'Inter', sans-serif",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "420px",
                    backgroundColor: "#ffffff",
                    borderRadius: "24px",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
                    border: "1px solid rgba(0,0,0,0.05)",
                    padding: "2rem",
                }}
            >
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                    <h1
                        style={{
                            fontSize: "1.75rem",
                            fontWeight: 600,
                            color: "#111827",
                        }}
                    >
                        Upload Documents
                    </h1>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                        Submit the requested onboarding documents
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.5rem",
                    }}
                >
                    {/* Document Type */}
                    <div>
                        <label
                            style={{
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                color: "#4b5563",
                            }}
                        >
                            Document Type
                        </label>

                        <select
                            {...register("documentType")}
                            style={{
                                marginTop: "0.25rem",
                                padding: "0.625rem 0.75rem",
                                borderRadius: "12px",
                                border: "1px solid #d1d5db",
                                fontSize: "0.875rem",
                                width: "100%",
                            }}
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
                            <p style={{ fontSize: "0.75rem", color: "#b91c1c" }}>
                                {errors.documentType.message}
                            </p>
                        )}
                    </div>

                    {/* File Upload */}
                    <div>
                        <label
                            style={{
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                color: "#4b5563",
                            }}
                        >
                            Upload File
                        </label>

                        <input
                            type="file"
                            {...register("file")}
                            style={{
                                marginTop: "0.25rem",
                                padding: "0.5rem 0.75rem",
                                borderRadius: "12px",
                                border: "1px solid #d1d5db",
                                width: "100%",
                            }}
                        />

                        {errors.file && (
                            <p style={{ fontSize: "0.75rem", color: "#b91c1c" }}>
                                {errors.file.message as string}
                            </p>
                        )}
                    </div>

                    {/* Messages */}
                    {error && (
                        <div
                            style={{
                                color: "#b91c1c",
                                background: "#fef2f2",
                                padding: "0.75rem",
                                borderRadius: "12px",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {message && (
                        <div
                            style={{
                                color: "#166534",
                                background: "#dcfce7",
                                padding: "0.75rem",
                                borderRadius: "12px",
                            }}
                        >
                            {message}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={uploading}
                        style={{
                            padding: "0.75rem",
                            borderRadius: "12px",
                            backgroundColor: "#6366f1",
                            color: "#fff",
                            fontWeight: 500,
                            border: "none",
                            cursor: "pointer",
                            opacity: uploading ? 0.6 : 1,
                        }}
                    >
                        {uploading ? "Uploading…" : "Upload Document"}
                    </button>
                </form>
            </div>
        </div>
    );
}
