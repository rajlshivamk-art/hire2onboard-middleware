import { useEffect, useState } from "react";
import {
    Calendar,
    User,
    XCircle,
    CheckCircle,
    AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
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
    scheduledAt: string;
    roundName?: string;
    mode: string;
    status: InterviewStatus;

    interviewerId?: string;
    interviewerName?: string;
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

    const [interviewers, setInterviewers] = useState<UserType[]>([]);
    const [assigningInterviewerId, setAssigningInterviewerId] = useState<string | null>(null);

    // ----------------------
    // Fetchers
    // ----------------------
    const fetchInterviews = async () => {
        setLoading(true);
        try {
            const data = await api.interviews.getByApplication(applicationId);
            setInterviews(data);
        } finally {
            setLoading(false);
        }
    };

    const fetchInterviewers = async () => {
        try {
            const users = await api.users.getAll();
            setInterviewers(users.filter(u => u.role === "Tech Interviewer"));
        } catch (err) {
            console.error("Failed to load interviewers", err);
            toast.error("Failed to fetch interviewers");
        }
    };

    // ----------------------
    // useEffects
    // ----------------------
    useEffect(() => {
        fetchInterviewers();
    }, []);

    useEffect(() => {
        fetchInterviews();
        fetchInterviewers();
    }, [applicationId]);

    // ----------------------
    // Actions
    // ----------------------
    const scheduleInterview = async () => {
        if (!form.scheduledAt || !form.round) {
            toast.error("Please fill all fields");
            return;
        }

        setActionLoading("create");
        try {
            await api.interviews.create({
                applicationId,
                candidateId: applicationId,
                createdById: currentUser.id,
                createdByRole: currentUser.role,
                scheduledAt: form.scheduledAt,
                mode: form.mode,
                roundName: form.round,
            });

            toast.success("Interview scheduled successfully");
            setForm({ scheduledAt: "", round: "", mode: "Online" });
            await fetchInterviews();
        } catch (error) {
            toast.error("Failed to schedule interview");
        } finally {
            setActionLoading(null);
        }
    };

    const updateStatus = async (interviewId: string, status: InterviewStatus) => {
        setActionLoading(interviewId);
        try {
            await api.interviews.updateStatus(applicationId, interviewId, status);
            toast.success("Status updated");
            await fetchInterviews();
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setActionLoading(null);
        }
    };

    const assignInterviewer = async (interviewId: string, interviewerId: string) => {
        setAssigningInterviewerId(interviewId);

        try {
            await api.interviews.assignInterviewer(applicationId, interviewId, interviewerId);

            toast.success("Interviewer assigned");
            await fetchInterviews();
        } catch (error) {
            toast.error("Failed to assign interviewer");
        } finally {
            setAssigningInterviewerId(null);
        }
    };

    // ----------------------
    // UI
    // ----------------------
    const statusBadge = (status: InterviewStatus) => {
        const map: Record<InterviewStatus, string> = {
            Scheduled: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
            Completed: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
            Cancelled: "bg-red-500/20 text-red-300 border border-red-500/30",
            "No-Show": "bg-orange-500/20 text-orange-300 border border-orange-500/30",
            Rescheduled: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
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
        <div className="glass-card p-4 space-y-5">
            <h3 className="font-semibold text-white">Interviews</h3>

            {/* Schedule Section */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
                <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                    className="glass-input text-sm w-full"
                />

                <input
                    type="text"
                    placeholder="Round (e.g. Round 1)"
                    value={form.round}
                    onChange={(e) => setForm({ ...form, round: e.target.value })}
                    className="glass-input text-sm w-full"
                />

                <select
                    value={form.mode}
                    onChange={(e) => setForm({ ...form, mode: e.target.value })}
                    className="glass-input text-sm w-full"
                >
                    <option>Online</option>
                    <option>In-Person</option>
                    <option>Call</option>
                </select>

                <button
                    disabled={actionLoading === "create"}
                    onClick={scheduleInterview}
                    className="bg-cyan-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-cyan-400 disabled:opacity-50 w-full md:w-auto"
                >
                    Schedule
                </button>
            </div>

            {/* Interviews List */}
            {loading ? (
                <p className="text-sm text-white/50">Loading interviews…</p>
            ) : interviews.length === 0 ? (
                <p className="text-sm text-white/50">No interviews scheduled</p>
            ) : (
                <div className="space-y-3">
                    {interviews.map((i) => (
                        <div
                            key={i.id}
                            className="border border-white/10 rounded-xl p-4 flex flex-col gap-4 md:flex-row md:items-center"
                        >
                            <div className="flex-1 space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-white/70">
                                    <Calendar className="w-4 h-4" />
                                    {i.scheduledAt.replace("T", " ")}
                                </div>

                                <div className="flex items-center gap-2 text-white/70">
                                    <User className="w-4 h-4" />
                                    {i.roundName} · {i.mode}
                                </div>

                                {statusBadge(i.status)}
                            </div>

                            {/* Interviewer Assignment */}
                            <div className="w-full md:w-64">
                                <select
                                    value={i.interviewerId || ""}
                                    onChange={(e) => assignInterviewer(i.id, e.target.value)}
                                    className="glass-input text-sm w-full"
                                    disabled={assigningInterviewerId === i.id}
                                >
                                    <option value="">Assign Tech Interviewer</option>
                                    {interviewers.map((int) => (
                                        <option key={int.id} value={int.id}>
                                            {int.name}
                                        </option>
                                    ))}
                                </select>

                                {assigningInterviewerId === i.id && (
                                    <p className="text-xs text-white/50 mt-1">Saving…</p>
                                )}
                            </div>

                            {i.status === "Scheduled" && (
                                <div className="flex flex-col gap-2 items-stretch md:items-end w-full md:w-auto">
                                    <button
                                        disabled={actionLoading === i.id}
                                        onClick={() => updateStatus(i.id, "Completed")}
                                        className="h-9 w-full md:w-28 flex items-center justify-center gap-1 rounded-lg border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:bg-emerald-500/20 disabled:opacity-50"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Done
                                    </button>

                                    <button
                                        disabled={actionLoading === i.id}
                                        onClick={() => updateStatus(i.id, "No-Show")}
                                        className="h-9 w-full md:w-28 flex items-center justify-center gap-1 rounded-lg border border-orange-500/30 text-orange-300 text-sm font-medium hover:bg-orange-500/20 disabled:opacity-50"
                                    >
                                        <AlertTriangle className="w-4 h-4" />
                                        No-Show
                                    </button>

                                    <button
                                        disabled={actionLoading === i.id}
                                        onClick={() => updateStatus(i.id, "Cancelled")}
                                        className="h-9 w-full md:w-28 flex items-center justify-center gap-1 rounded-lg border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/20 disabled:opacity-50"
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
