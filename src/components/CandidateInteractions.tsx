import { useEffect, useState } from 'react';
import {
    Phone,
    Mail,
    MessageSquare,
    Plus,
    CalendarClock,
    StickyNote,
} from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../types';

// --------------------- Types ---------------------
export interface Interaction {
    recruiterId: string;
    recruiterName: string;
    method: string;
    status: 'Completed' | 'No Answer' | 'Rescheduled' | 'Pending';
    candidateUpdate?: string;
    note?: string;
    timestamp: string;
}

const METHODS = [
    { label: 'Call', icon: Phone },
    { label: 'Email', icon: Mail },
    { label: 'WhatsApp', icon: MessageSquare },
    { label: 'Other', icon: Plus },
] as const;

const STATUS = ['Completed', 'No Answer', 'Rescheduled', 'Pending'] as const;

interface Props {
    candidateId: string;
    user: User;
}

// --------------------- Helpers ---------------------
const STATUS_STYLES: Record<
    Interaction['status'],
    { border: string; badge: string }
> = {
    Completed: {
        border: 'border-l-green-500',
        badge: 'bg-green-100 text-green-800',
    },
    Pending: {
        border: 'border-l-amber-400',
        badge: 'bg-amber-100 text-amber-800',
    },
    Rescheduled: {
        border: 'border-l-blue-500',
        badge: 'bg-blue-100 text-blue-800',
    },
    'No Answer': {
        border: 'border-l-gray-400',
        badge: 'bg-gray-100 text-gray-700',
    },
};

const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';

    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(date.getTime() + istOffset).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

// --------------------- Component ---------------------
export function CandidateInteractions({ candidateId, user }: Props) {
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [loading, setLoading] = useState(false);

    const [method, setMethod] =
        useState<typeof METHODS[number]['label']>('Call');
    const [customMethod, setCustomMethod] = useState('');
    const [status, setStatus] =
        useState<typeof STATUS[number]>('Completed');
    const [candidateUpdate, setCandidateUpdate] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        loadInteractions();
    }, []);

    const loadInteractions = async () => {
        try {
            const data: Interaction[] =
                await api.interactions.getByCandidate(candidateId);
            setInteractions(
                data.sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                )
            );
        } catch (err) {
            console.error('Failed to load interactions', err);
        }
    };

    const submitInteraction = async () => {
        if (!note.trim()) return alert('Recruiter note is required');

        const finalMethod =
            method === 'Other' ? customMethod.trim() : method;

        if (!finalMethod)
            return alert('Please specify interaction method');

        setLoading(true);
        try {
            await api.interactions.create(candidateId, {
                recruiterId: user.id,
                recruiterName: user.name,
                method: finalMethod,
                status,
                candidateUpdate: candidateUpdate || undefined,
                note,
            });

            setNote('');
            setCandidateUpdate('');
            setCustomMethod('');
            setMethod('Call');

            await loadInteractions();
        } catch (err) {
            console.error('Failed to log interaction', err);
            alert('Failed to log interaction');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-8 bg-gray-50 rounded-xl shadow-lg border border-gray-200">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-white rounded-t-xl">
                <h3 className="text-xl font-semibold text-gray-900">
                    Candidate Interactions
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    All recruiter-candidate touchpoints
                </p>
            </div>

            {/* Add Interaction */}
            <div className="p-6 space-y-4">
                {/* Method */}
                <div className="flex flex-wrap gap-3">
                    {METHODS.map((m) => {
                        const Icon = m.icon;
                        return (
                            <button
                                key={m.label}
                                onClick={() => setMethod(m.label)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition
                                    ${method === m.label
                                        ? 'bg-blue-600 text-white border-blue-600 shadow'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon size={16} />
                                {m.label}
                            </button>
                        );
                    })}
                </div>

                {method === 'Other' && (
                    <input
                        value={customMethod}
                        onChange={(e) => setCustomMethod(e.target.value)}
                        placeholder="Specify interaction method"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-1 focus:ring-blue-400"
                    />
                )}

                {/* Status + Update */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                        value={status}
                        onChange={(e) =>
                            setStatus(
                                e.target.value as typeof STATUS[number]
                            )
                        }
                        className="px-4 py-3 border rounded-lg focus:ring-1 focus:ring-blue-400"
                    >
                        {STATUS.map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>

                    <input
                        value={candidateUpdate}
                        onChange={(e) =>
                            setCandidateUpdate(e.target.value)
                        }
                        placeholder="Candidate availability / update"
                        className="px-4 py-3 border rounded-lg focus:ring-1 focus:ring-blue-400"
                    />
                </div>

                {/* Note */}
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Recruiter note (required)"
                    rows={3}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-1 focus:ring-blue-400"
                />

                {/* Submit */}
                <button
                    onClick={submitInteraction}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Log Interaction'}
                </button>
            </div>

            {/* Timeline */}
            <div className="p-6 space-y-4">
                {interactions.length === 0 && (
                    <p className="text-sm text-gray-500">
                        No interactions logged yet.
                    </p>
                )}

                {interactions.map((i, idx) => {
                    const style = STATUS_STYLES[i.status];
                    return (
                        <div
                            key={idx}
                            className={`border-l-4 ${style.border} bg-white p-4 rounded-lg shadow-sm grid grid-cols-[1fr_auto] gap-4`}
                        >
                            {/* Left */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-sm text-gray-900">
                                        {i.method}
                                    </span>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${style.badge}`}
                                    >
                                        {i.status}
                                    </span>
                                </div>

                                <p className="text-xs text-gray-500">
                                    Recruiter:{' '}
                                    <span className="font-medium text-gray-700">
                                        {i.recruiterName}
                                    </span>
                                </p>

                                {i.candidateUpdate && (
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <CalendarClock
                                            size={14}
                                            className="text-gray-400"
                                        />
                                        <span>{i.candidateUpdate}</span>
                                    </div>
                                )}

                                {i.note && (
                                    <div className="flex items-start gap-2 text-sm text-gray-700">
                                        <StickyNote
                                            size={14}
                                            className="text-gray-400 mt-0.5"
                                        />
                                        <span>{i.note}</span>
                                    </div>
                                )}
                            </div>

                            {/* Right */}
                            <div className="text-xs text-gray-400 whitespace-nowrap">
                                {formatTimestamp(i.timestamp)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
