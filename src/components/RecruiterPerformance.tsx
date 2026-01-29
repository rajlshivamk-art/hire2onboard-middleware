import { useEffect, useState } from "react";
import { api } from "../lib/api";
import toast from "react-hot-toast";
import { SmoothSelect } from "./ui/smooth-select";

/* ===================== TYPES ===================== */

type KPI = {
    totalLineups: number;
    selected: number;
    rejected: number;
    selectionRate: number;
};

type RecruiterRow = {
    recruiterId: string;
    recruiterName: string;
    totalLineups: number;
    selected: number;
    rejected: number;
    selectionRate: number;
};

type RecruiterReportResponse = {
    kpis: KPI;
    rows: RecruiterRow[];
    meta: {
        company: string;
        filters: {
            recruiterId: string | null;
            dateRange: "today" | "weekly" | "monthly" | null;
            startDate: string | null;
            endDate: string | null;
        };
    };
};

/* ===================== HELPERS ===================== */

const toISTDateString = (date: Date) => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(date.getTime() + istOffset)
        .toISOString()
        .slice(0, 10);
};

/* ===================== COMPONENT ===================== */

export const RecruiterPerformanceReport = () => {
    const [data, setData] = useState<RecruiterReportResponse | null>(null);
    const [loading, setLoading] = useState(false);

    /* UI filter state */
    const [recruiterId, setRecruiterId] = useState<string | undefined>(undefined);
    const [dateRange, setDateRange] = useState<
        "today" | "weekly" | "monthly" | ""
    >("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const isValidDateRange = () => {
        if (!startDate || !endDate) return true;
        return new Date(startDate) <= new Date(endDate);
    };

    /* ===================== DATE PRESETS ===================== */

    useEffect(() => {
        const today = new Date();

        if (dateRange === "today") {
            const d = toISTDateString(today);
            setStartDate(d);
            setEndDate(d);
        }

        if (dateRange === "weekly") {
            setStartDate(
                toISTDateString(
                    new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
                )
            );
            setEndDate(toISTDateString(today));
        }

        if (dateRange === "monthly") {
            setStartDate(
                toISTDateString(
                    new Date(today.getFullYear(), today.getMonth(), 1)
                )
            );
            setEndDate(toISTDateString(today));
        }

        if (!dateRange) {
            setStartDate("");
            setEndDate("");
        }
    }, [dateRange]);

    /* ===================== PARAM BUILDERS ===================== */

    // Used for TABLE (never filtered by recruiter)
    const buildBaseParams = () => {
        const params: any = {};

        if (startDate && endDate) {
            params.startDate = startDate;
            params.endDate = endDate;
            return params;
        }

        if (dateRange) {
            params.dateRange = dateRange;
        }

        return params;
    };

    // Used for KPI (can be filtered by recruiter)
    const buildKpiParams = () => {
        const params = buildBaseParams();

        if (recruiterId) {
            params.recruiterId = recruiterId;
        }

        return params;
    };

    /* ===================== DATA FETCH ===================== */

    const fetchReport = async () => {
        if (!isValidDateRange()) {
            toast.error("Start date must be before or equal to end date");
            return;
        }

        try {
            setLoading(true);

            /**
             * OPTION A — Comparison Mode
             * 1. Rows → unfiltered
             * 2. KPIs → recruiter filtered
             */
            const [rowsRes, kpiRes] = await Promise.all([
                api.reports.recruiterPerformance(buildBaseParams()),
                api.reports.recruiterPerformance(buildKpiParams()),
            ]);

            setData({
                rows: rowsRes.data?.rows ?? rowsRes.rows ?? [],
                kpis: kpiRes.data?.kpis ?? kpiRes.kpis,
                meta: kpiRes.data?.meta ?? kpiRes.meta,
            });
        } catch {
            toast.error("Failed to load recruiter performance report");
        } finally {
            setLoading(false);
        }
    };

    /* ===================== EXPORT ===================== */

    const exportExcel = async () => {
        try {
            const res = await api.reports.exportRecruiterPerformance(
                buildKpiParams()
            );

            const blob = new Blob([res.data ?? res], {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "recruiter_performance_report.xlsx";
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error("Failed to export Excel report");
        }
    };

    /* ===================== RESET ===================== */

    const resetFilters = () => {
        setRecruiterId(undefined);
        setDateRange("");
        setStartDate("");
        setEndDate("");
        fetchReport();
    };

    useEffect(() => {
        fetchReport();
    }, []);

    /* ===================== UI ===================== */

    return (
        <div className="p-6 space-y-6 relative bg-white rounded-2xl shadow-md">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold">
                        Recruiter Performance Report
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Track recruiter performance with clean KPI cards and easy
                        filters.
                    </p>
                </div>

                <button
                    onClick={exportExcel}
                    disabled={!data || loading}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                    Export Excel
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap items-center">
                <SmoothSelect
                    value={recruiterId}
                    onChange={setRecruiterId}
                    placeholder="All Recruiters"
                    options={
                        data?.rows.map((r) => ({
                            label: r.recruiterName,
                            value: r.recruiterId,
                        })) ?? []
                    }
                />

                <SmoothSelect
                    value={dateRange}
                    onChange={(v) => setDateRange(v as any)}
                    placeholder="Custom"
                    options={[
                        { label: "Today", value: "today" },
                        { label: "Last 7 Days", value: "weekly" },
                        { label: "This Month", value: "monthly" },
                    ]}
                />

                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border rounded-xl px-3 py-2 text-sm"
                />

                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border rounded-xl px-3 py-2 text-sm"
                />

                <button
                    onClick={fetchReport}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm shadow-sm transition hover:bg-blue-700"
                >
                    Apply
                </button>

                <button
                    onClick={resetFilters}
                    className="px-4 py-2 rounded-xl bg-gray-200 text-sm shadow-sm transition hover:bg-gray-300"
                >
                    Reset
                </button>
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                    <div className="text-sm text-gray-600 animate-pulse">
                        Loading report…
                    </div>
                </div>
            )}

            {data && (
                <div className="flex gap-4 items-stretch">
                    <KpiCard label="Total Lineups" value={data.kpis.totalLineups} />
                    <KpiCard label="Selected" value={data.kpis.selected} />
                    <KpiCard label="Rejected" value={data.kpis.rejected} />
                    <KpiCard
                        label="Selection Rate"
                        value={`${data.kpis.selectionRate}%`}
                    />
                </div>
            )}

            {data && (
                <div className="overflow-x-auto border rounded-2xl">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    Recruiter
                                </th>
                                <th className="px-4 py-3 text-center">
                                    Lineups
                                </th>
                                <th className="px-4 py-3 text-center">
                                    Selected
                                </th>
                                <th className="px-4 py-3 text-center">
                                    Rejected
                                </th>
                                <th className="px-4 py-3 text-center">
                                    Selection %
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((row) => (
                                <tr
                                    key={row.recruiterId}
                                    className={`border-t transition ${recruiterId === row.recruiterId
                                            ? "bg-blue-50 ring-1 ring-blue-200"
                                            : recruiterId
                                                ? "opacity-50"
                                                : ""
                                        }`}
                                >
                                    <td className="px-4 py-3">
                                        {row.recruiterName}
                                    </td>
                                    <td className="text-center px-4 py-3">
                                        {row.totalLineups}
                                    </td>
                                    <td className="text-center px-4 py-3 text-green-600">
                                        {row.selected}
                                    </td>
                                    <td className="text-center px-4 py-3 text-red-600">
                                        {row.rejected}
                                    </td>
                                    <td className="text-center px-4 py-3">
                                        {row.selectionRate}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

/* ===================== KPI CARD ===================== */

const KpiCard = ({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) => (
    <div className="flex-1 border rounded-2xl p-4 bg-white shadow-sm">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
);
