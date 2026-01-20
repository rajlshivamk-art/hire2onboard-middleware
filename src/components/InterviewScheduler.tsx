import { useEffect, useState } from "react";
import {
    Calendar,
    User,
    XCircle,
    CheckCircle,
    AlertTriangle,
} from "lucide-react";
import { api } from "../lib/api";
import { User as UserType } from "../types";

type InterviewStatus =
    | "Scheduled"
    | "Completed"
    | "Cancelled"
    | "No-Show"
    | "Rescheduled";

type Interview = {
    id: string;
    applicationId: string;
    scheduledAt: string; // IST datetime-local string (NO timezone)
    roundName?: string;
    mode: string;
    status: InterviewStatus;
};

interface Props {
    applicationId: string;
    currentUser: UserType;
}

export function InterviewScheduler({ applicationId, currentUser }: Props) {
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [form, setForm] = useState({
        scheduledAt: "",
        round: "",
        mode: "Online",
    });

    const fetchInterviews = async () => {
        setLoading(true);
        try {
            const data = await api.interviews.getByApplication(applicationId);
            setInterviews(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterviews();
    }, [applicationId]);

    const scheduleInterview = async () => {
        if (!form.scheduledAt || !form.round) return;

        setActionLoading("create");
        try {
            await api.interviews.create({
                applicationId,
                candidateId: applicationId,
                createdById: currentUser.id,
                createdByRole: currentUser.role,

                // ⬇️ STORE EXACT IST VALUE — NO CONVERSION
                scheduledAt: form.scheduledAt,

                mode: form.mode,
                roundName: form.round,
            });

            setForm({ scheduledAt: "", round: "", mode: "Online" });
            await fetchInterviews();
        } finally {
            setActionLoading(null);
        }
    };

    const updateStatus = async (interviewId: string, status: InterviewStatus) => {
        setActionLoading(interviewId);
        try {
            await api.interviews.updateStatus(applicationId, interviewId, status);
            await fetchInterviews();
        } finally {
            setActionLoading(null);
        }
    };

    const statusBadge = (status: InterviewStatus) => {
        const map: Record<InterviewStatus, string> = {
            Scheduled: "bg-blue-100 text-blue-700",
            Completed: "bg-green-100 text-green-700",
            Cancelled: "bg-red-100 text-red-700",
            "No-Show": "bg-orange-100 text-orange-700",
            Rescheduled: "bg-purple-100 text-purple-700",
        };

        return (
            <span
                className={`inline-flex items-center px-4 py-1 rounded-full text-xs font-medium min-w-[110px] justify-center ${map[status]}`}
            >
                {status}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-xl border p-4 space-y-5">
            <h3 className="font-semibold text-gray-800">Interviews</h3>

            {/* Schedule Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) =>
                        setForm({ ...form, scheduledAt: e.target.value })
                    }
                    className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <input
                    type="text"
                    placeholder="Round (e.g. Round 1)"
                    value={form.round}
                    onChange={(e) => setForm({ ...form, round: e.target.value })}
                    className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <select
                    value={form.mode}
                    onChange={(e) =>
                        setForm({ ...form, mode: e.target.value })
                    }
                    className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option>Online</option>
                    <option>In-Person</option>
                    <option>Call</option>
                </select>

                <button
                    disabled={actionLoading === "create"}
                    onClick={scheduleInterview}
                    className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                    Schedule
                </button>
            </div>

            {/* Interviews List */}
            {loading ? (
                <p className="text-sm text-gray-500">Loading interviews…</p>
            ) : interviews.length === 0 ? (
                <p className="text-sm text-gray-500">No interviews scheduled</p>
            ) : (
                <div className="space-y-3">
                    {interviews.map((i) => (
                        <div
                            key={i.id}
                            className="border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4"
                        >
                            <div className="flex-1 space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <Calendar className="w-4 h-4" />
                                    {/* ✅ DISPLAY AS-IS (IST) */}
                                    {i.scheduledAt.replace("T", " ")}
                                </div>

                                <div className="flex items-center gap-2 text-gray-700">
                                    <User className="w-4 h-4" />
                                    {i.roundName} · {i.mode}
                                </div>

                                {statusBadge(i.status)}
                            </div>

                            {i.status === "Scheduled" && (
                                <div className="flex flex-col gap-2 items-end w-full md:w-auto">
                                    <button
                                        disabled={actionLoading === i.id}
                                        onClick={() => updateStatus(i.id, "Completed")}
                                        className="h-9 w-28 flex items-center justify-center gap-1 rounded-lg border border-green-500 text-green-600 text-sm font-medium hover:bg-green-50 disabled:opacity-50"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Done
                                    </button>

                                    <button
                                        disabled={actionLoading === i.id}
                                        onClick={() => updateStatus(i.id, "No-Show")}
                                        className="h-9 w-28 flex items-center justify-center gap-1 rounded-lg border border-orange-500 text-orange-600 text-sm font-medium hover:bg-orange-50 disabled:opacity-50"
                                    >
                                        <AlertTriangle className="w-4 h-4" />
                                        No-Show
                                    </button>

                                    <button
                                        disabled={actionLoading === i.id}
                                        onClick={() => updateStatus(i.id, "Cancelled")}
                                        className="h-9 w-28 flex items-center justify-center gap-1 rounded-lg border border-red-500 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
