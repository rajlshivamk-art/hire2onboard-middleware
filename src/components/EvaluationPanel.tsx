import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { User } from "../types";

type EvaluationScore = {
    roundName: string;
    roundId: string;
    technical?: number;
    communication?: number;
    problemSolving?: number;
    cultureFit?: number;
    overall?: number;
    reviewerId: string;
    reviewerRole: string;
    createdAt?: string;
};

interface EvaluationPanelProps {
    user: User;
    applicationId: string;
    stage: string;
    evaluationScores: EvaluationScore[];
    cumulativeScore?: number;
    onRefresh: () => void;
}

const ROLE_ALLOWED = [
    "HR",
    "Manager",
    "Admin",
    "SuperAdmin",
    "Tech Interviewer",
    "Recruiter",
];

const getRoundFromStage = (stage: string) => {
    if (stage.startsWith("Round")) {
        const num = stage.split(" ")[1];
        return {
            roundName: stage,
            roundId: `ROUND_${num}`,
        };
    }
    if (stage === "Management Round") {
        return { roundName: stage, roundId: "MANAGEMENT" };
    }
    return null;
};

export function EvaluationPanel({
    user,
    applicationId,
    stage,
    evaluationScores = [],
    cumulativeScore,
    onRefresh,
}: EvaluationPanelProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [scores, setScores] = useState({
        technical: 3,
        communication: 3,
        problemSolving: 3,
        cultureFit: 3,
    });

    if (!ROLE_ALLOWED.includes(user.role)) return null;

    const round = getRoundFromStage(stage);

    const alreadyEvaluated =
        round &&
        evaluationScores.some(
            (s) => s.roundId === round.roundId && s.reviewerId === user.id
        );

    const calculateOverall = () => {
        const values = Object.values(scores)
            .map(Number)
            .filter(v => !isNaN(v));

        if (!values.length) return 0;

        const overall = values.reduce((a, b) => a + b, 0) / values.length;

        // Round to 2 decimal places
        return parseFloat(overall.toFixed(2));
    };


    const handleSubmit = async () => {
        if (!round) {
            toast.error("Evaluation not allowed at this stage");
            return;
        }

        try {
            setLoading(true);
            await api.applications.addEvaluationScore(applicationId, {
                ...round,
                ...scores,
                overall: calculateOverall(),
                reviewerId: user.id,
                reviewerRole: user.role,
            });

            toast.success("Evaluation submitted");
            setOpen(false);
            onRefresh();
        } catch (err: any) {
            const detail = err?.response?.data?.detail;

            if (Array.isArray(detail)) {
                toast.error(detail.map((e) => e.msg).join(", "));
            } else if (typeof detail === "string") {
                toast.error(detail);
            } else {
                toast.error("Failed to submit evaluation");
            }
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="glass-card !rounded-2xl !border !border-white/10 p-6 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white/90 font-semibold text-lg">Evaluation</h3>
                <span className="text-sm text-white/60">
                    Overall Score:{" "}
                    <b>{cumulativeScore !== undefined ? cumulativeScore : "N/A"}</b>
                </span>
            </div>

            {/* Existing Evaluations */}
            {evaluationScores.length > 0 ? (
                <div className="space-y-3 mb-5">
                    {evaluationScores.map((s, idx) => (
                        <div
                            key={idx}
                            className="flex justify-between items-center glass px-4 py-3 rounded-xl text-sm"
                        >
                            <div>
                                <p className="font-medium text-white/90">{s.roundName}</p>
                                <p className="text-xs text-white/50">
                                    Reviewed by {s.reviewerRole}
                                </p>
                            </div>
                            <span className="font-semibold text-indigo-300">
                                {s.overall}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-white/50 mb-4">
                    No evaluations submitted yet
                </p>
            )}

            {/* CTA */}
            {stage === "Rejected" ? (
                <p className="text-sm text-white/40 italic">
                    Evaluations are disabled for rejected candidates
                </p>
            ) : !round ? (
                <p className="text-sm text-white/40 italic">
                    Evaluation will be available once the interview round starts
                </p>
            ) : alreadyEvaluated ? (
                <p className="text-sm text-green-300 font-medium">
                    ✓ You’ve already evaluated this round
                </p>
            ) : (
                <button
                    onClick={() => setOpen(true)}
                    className="
        w-full py-3 rounded-xl
        font-semibold text-sm
        !bg-indigo-600 !text-white
        hover:!bg-indigo-700
        shadow-md hover:shadow-lg
        transition-all duration-200
    "
                >
                    Add Evaluation for {round.roundName}
                </button>

            )}

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center px-4">
                    <div className="glass-card rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/10">
                            <h4 className="font-semibold text-white/90">
                                {round?.roundName} Evaluation
                            </h4>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto">
                            {Object.keys(scores).map((key) => (
                                <div key={key} className="flex justify-between items-center">
                                    <label className="capitalize text-sm text-white/60">
                                        {key}
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={5}
                                        value={(scores as any)[key]}
                                        onChange={(e) =>
                                            setScores({
                                                ...scores,
                                                [key]: Number(e.target.value),
                                            })
                                        }
                                        className="w-20 glass-input text-white/90 text-center"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t flex justify-end gap-2 glass">
                            <button
                                onClick={() => setOpen(false)}
                                className="px-4 py-2 text-sm glass hover:bg-white/10 text-white/80 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="
        px-4 py-2 text-sm font-medium
        !bg-indigo-600 !text-white
        rounded-lg
        hover:!bg-indigo-700
        disabled:opacity-60 disabled:cursor-not-allowed
        transition
    "
                            >
                                {loading ? "Submitting..." : "Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
