import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Investment } from '@/Types';
import {
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    EyeIcon,
    CurrencyDollarIcon,
    DocumentCheckIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface AdminInvestmentsIndexProps {
    investments: {
        data: Investment[];
        links: any[];
    };
    filters: {
        status?: string;
        search?: string;
    };
    stats: {
        pending: number;
        confirmed: number;
        total_value: number;
    };
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AdminInvestmentsIndex({ investments, filters, stats }: AdminInvestmentsIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/investments', { ...filters, search }, { preserveState: true });
    };

    const handleConfirm = (investment: Investment) => {
        if (confirm(`Confirm investment of ${investment.tokens_purchased} tokens for ${formatCurrency(investment.amount_paid)}?`)) {
            router.post(`/admin/investments/${investment.id}/confirm`);
        }
    };

    const handleReject = (investmentId: number) => {
        if (!rejectReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }
        router.post(`/admin/investments/${investmentId}/reject`, { reason: rejectReason }, {
            onSuccess: () => {
                setRejectingId(null);
                setRejectReason('');
            }
        });
    };

    const statusConfig = {
        pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: ClockIcon },
        confirmed: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircleIcon },
        failed: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircleIcon },
    };

    return (
        <AdminLayout title="Investments">
            <Head title="Investments - Admin" />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Pending</p>
                            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                            <ClockIcon className="h-6 w-6 text-yellow-400" />
                        </div>
                    </div>
                </div>
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Confirmed</p>
                            <p className="text-2xl font-bold text-emerald-400">{stats.confirmed}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <DocumentCheckIcon className="h-6 w-6 text-emerald-400" />
                        </div>
                    </div>
                </div>
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Total Value</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(stats.total_value)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <CurrencyDollarIcon className="h-6 w-6 text-blue-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card rounded-2xl p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <form onSubmit={handleSearch} className="flex-1">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by user or tx hash..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full input-dark rounded-xl py-3 pl-12 pr-4"
                            />
                        </div>
                    </form>

                    <select
                        value={filters.status || ''}
                        onChange={(e) => router.get('/admin/investments', { ...filters, status: e.target.value }, { preserveState: true })}
                        className="input-dark rounded-xl py-3 px-4"
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
            </div>

            {/* Investments Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Property
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Tokens
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {investments.data.length > 0 ? (
                                investments.data.map((investment: any) => (
                                    <tr key={investment.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="font-medium text-white">{investment.user?.name}</div>
                                                <div className="text-sm text-gray-400">{investment.user?.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-white">{investment.property?.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-white">{investment.tokens_purchased.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-semibold text-white">{formatCurrency(investment.amount_paid)}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {(() => {
                                                const config = statusConfig[investment.status as keyof typeof statusConfig];
                                                const Icon = config?.icon || ClockIcon;
                                                return (
                                                    <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${config?.color}`}>
                                                        <Icon className="h-3.5 w-3.5 mr-1.5" />
                                                        {investment.status}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {formatDate(investment.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                {investment.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleConfirm(investment)}
                                                            className="text-emerald-400 hover:text-emerald-300 p-2 rounded-lg hover:bg-emerald-500/10 transition-colors"
                                                            title="Confirm"
                                                        >
                                                            <CheckCircleIcon className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectingId(investment.id)}
                                                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                                            title="Reject"
                                                        >
                                                            <XCircleIcon className="h-5 w-5" />
                                                        </button>
                                                    </>
                                                )}
                                                <a
                                                    href={`https://sepolia.etherscan.io/tx/${investment.tx_hash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-gray-400 hover:text-blue-400 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                                    title="View on Etherscan"
                                                >
                                                    <EyeIcon className="h-5 w-5" />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        No investments found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {investments.links && investments.links.length > 3 && (
                    <div className="px-6 py-4 border-t border-white/10">
                        <nav className="flex items-center justify-center space-x-2">
                            {investments.links.map((link: any, index: number) => (
                                <button
                                    key={index}
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        link.active
                                            ? 'bg-blue-600 text-white'
                                            : link.url
                                            ? 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                            : 'bg-white/5 text-gray-500 cursor-not-allowed'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </nav>
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {rejectingId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card rounded-2xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Reject Investment</h3>
                        </div>
                        <p className="text-gray-400 mb-4">Please provide a reason for rejecting this investment.</p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection..."
                            className="w-full input-dark rounded-xl py-3 px-4 mb-4"
                            rows={3}
                        />
                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setRejectingId(null);
                                    setRejectReason('');
                                }}
                                className="flex-1 py-2.5 px-4 border border-white/20 rounded-xl text-gray-300 hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleReject(rejectingId)}
                                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
