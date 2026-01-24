import { useEffect, useState } from "react";
import { api } from "../lib/api";
import toast from "react-hot-toast";

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

const toISTDateString = (date: Date) => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(date.getTime() + istOffset).toISOString().slice(0, 10);
};

export const RecruiterPerformanceReport = () => {
    const [data, setData] = useState<RecruiterReportResponse | null>(null);
    const [loading, setLoading] = useState(false);

    /* UI filter state */
    const [recruiterId, setRecruiterId] = useState("");
    const [dateRange, setDateRange] = useState<
        "today" | "weekly" | "monthly" | ""
    >("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const isValidDateRange = () => {
        if (!startDate || !endDate) return true;
        return new Date(startDate) <= new Date(endDate);
    };

    /* Auto-fill dates when preset selected */
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

    /* Single source of truth for filters */
    const buildParams = () => {
        const params: any = {};
        if (recruiterId) params.recruiterId = recruiterId;
        if (dateRange) params.dateRange = dateRange;
        if (startDate && endDate) {
            params.startDate = startDate;
            params.endDate = endDate;
        }
        return params;
    };

    const fetchReport = async () => {
        if (!isValidDateRange()) {
            toast.error("Start date must be before or equal to end date");
            return;
        }

        try {
            setLoading(true);
            const res = await api.reports.recruiterPerformance(buildParams());
            setData(res.data ?? res);
        } catch {
            toast.error("Failed to load recruiter performance report");
        } finally {
            setLoading(false);
        }
    };

    const exportExcel = async () => {
        try {
            const res = await api.reports.exportRecruiterPerformance(
                buildParams()
            );

            const blob = new Blob([res.data ?? res], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

    const resetFilters = () => {
        setRecruiterId("");
        setDateRange("");
        setStartDate("");
        setEndDate("");
        fetchReport();
    };

    /* Initial load */
    useEffect(() => {
        fetchReport();
    }, []);

    return (
        <div className="p-6 space-y-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                    Recruiter Performance Report
                </h2>

                <button
                    onClick={exportExcel}
                    disabled={!data || loading}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
                >
                    Export Excel
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
                <select
                    value={recruiterId}
                    onChange={(e) => setRecruiterId(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm"
                >
                    <option value="">All Recruiters</option>
                    {data?.rows.map((r) => (
                        <option key={r.recruiterId} value={r.recruiterId}>
                            {r.recruiterName}
                        </option>
                    ))}
                </select>

                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="border rounded-md px-3 py-2 text-sm"
                >
                    <option value="">Custom</option>
                    <option value="today">Today</option>
                    <option value="weekly">Last 7 Days</option>
                    <option value="monthly">This Month</option>
                </select>

                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm"
                />

                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border rounded-md px-3 py-2 text-sm"
                />

                <button
                    onClick={fetchReport}
                    className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm"
                >
                    Apply
                </button>

                <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-gray-200 rounded-md text-sm"
                >
                    Reset
                </button>
            </div>

            {/* Smooth loading overlay */}
            {loading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-md">
                    <div className="text-sm text-gray-600 animate-pulse">
                        Loading report…
                    </div>
                </div>
            )}

            {/* KPIs */}
            {data && (
                <div className="grid grid-cols-4 gap-4">
                    <KpiCard label="Total Lineups" value={data.kpis.totalLineups} />
                    <KpiCard label="Selected" value={data.kpis.selected} />
                    <KpiCard label="Rejected" value={data.kpis.rejected} />
                    <KpiCard
                        label="Selection Rate"
                        value={`${data.kpis.selectionRate}%`}
                    />
                </div>
            )}

            {/* Table */}
            {data && (
                <div className="overflow-x-auto border rounded-md">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left">Recruiter</th>
                                <th className="px-4 py-3 text-center">Lineups</th>
                                <th className="px-4 py-3 text-center">Selected</th>
                                <th className="px-4 py-3 text-center">Rejected</th>
                                <th className="px-4 py-3 text-center">
                                    Selection %
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-center py-6 text-gray-500"
                                    >
                                        No data available
                                    </td>
                                </tr>
                            )}

                            {data.rows.map((row) => (
                                <tr key={row.recruiterId} className="border-t">
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

const KpiCard = ({ label, value }: { label: string; value: string | number }) => (
    <div className="border rounded-md p-4 bg-white">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
);
