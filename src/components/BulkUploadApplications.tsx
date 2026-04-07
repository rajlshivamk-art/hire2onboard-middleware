import React, { useState, useRef } from "react";
import { api } from "../lib/api";
import toast from "react-hot-toast";

interface Job {
    id: string;
    title: string;
}

interface Props {
    jobs: Job[];
    onSuccess?: () => void;
}

const MAX_FILE_SIZE_MB = 5;

export const BulkUploadApplications: React.FC<Props> = ({
    jobs,
    onSuccess,
}) => {
    const [selectedJobId, setSelectedJobId] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const validateFile = (selectedFile: File): boolean => {
        const allowedTypes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
        ];

        if (!allowedTypes.includes(selectedFile.type)) {
            toast.error("Only .xlsx or .xls files are allowed.");
            return false;
        }

        const fileSizeMB = selectedFile.size / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            toast.error(`File size must be less than ${MAX_FILE_SIZE_MB}MB.`);
            return false;
        }

        return true;
    };

    const handleUpload = async () => {
        if (!selectedJobId) {
            toast.error("Please select a job.");
            return;
        }

        if (!file) {
            toast.error("Please select an Excel file.");
            return;
        }

        try {
            setLoading(true);

            const res = await api.applications.bulkUpload(
                selectedJobId,
                file
            );

            toast.success(
                `Uploaded ${res.inserted} candidates successfully`
            );

            setFile(null);
            setSelectedJobId("");

            onSuccess?.();
        } catch (err: any) {
            toast.error(
                err.response?.data?.detail || "Bulk upload failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-6 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">
                Bulk Upload Candidates
            </h3>

            <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                disabled={loading}
                className="glass-input w-full mb-4 disabled:opacity-50"
            >
                <option value="">Select Job</option>
                {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                        {job.title}
                    </option>
                ))}
            </select>

            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                disabled={loading}
                onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (!selectedFile) return;

                    if (validateFile(selectedFile)) {
                        setFile(selectedFile);
                    } else {
                        e.target.value = "";
                        setFile(null);
                    }
                }}
                className="mb-4 block w-full text-white disabled:opacity-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-700 file:text-white hover:file:bg-slate-600"
            />

            <button
                onClick={handleUpload}
                disabled={loading}
                className="bg-cyan-500 text-white px-6 py-2 rounded-lg hover:bg-cyan-400 disabled:opacity-50 transition-colors"
            >
                {loading ? "Uploading..." : "Upload"}
            </button>
        </div>
    );
};
