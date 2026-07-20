import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useState } from 'react';

interface Commission {
    id: number;
    agent: { id: number; user: { name: string } };
    user: { id: number; name: string };
    transaction_type: string;
    transaction_amount: number;
    commission_rate: number;
    commission_amount: number;
    currency: string;
    status: string;
    created_at: string;
}

interface Props {
    commissions: {
        data: Commission[];
        links: any[];
    };
    stats: {
        total: number;
        pending: number;
        approved: number;
        paid: number;
    };
    filters: {
        status?: string;
        type?: string;
        agent_id?: string;
    };
}

export default function CommissionsIndex({ commissions, stats, filters }: Props) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const handleStatusFilter = (status: string) => {
        router.get('/admin/commissions', { ...filters, status: status || undefined }, { preserveState: true });
    };

    const handleApprove = (id: number) => {
        router.post(`/admin/commissions/${id}/approve`);
    };

    const handleBulkApprove = () => {
        if (selectedIds.length === 0) return;
        router.post('/admin/commissions/bulk-approve', { ids: selectedIds }, {
            onSuccess: () => setSelectedIds([]),
        });
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        const pendingIds = commissions.data.filter(c => c.status === 'pending').map(c => c.id);
        if (selectedIds.length === pendingIds.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(pendingIds);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300';
            case 'approved':
                return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300';
            case 'pending':
                return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
            default:
                return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <AdminLayout>
            <Head title="Manage Commissions" />

            <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commissions</h1>
                        <p className="text-gray-600 dark:text-gray-400">Manage agent commissions and payouts</p>
                    </div>
                    <Link
                        href="/admin/commissions/settings"
                        className="px-4 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600"
                    >
                        Settings
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Commissions</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">${Number(stats.total).toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">${Number(stats.pending).toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
                        <p className="text-2xl font-bold text-blue-600">${Number(stats.approved).toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
                        <p className="text-2xl font-bold text-green-600">${Number(stats.paid).toFixed(2)}</p>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex gap-4">
                        <select
                            value={filters.status || ''}
                            onChange={(e) => handleStatusFilter(e.target.value)}
                            className="px-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-lg"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="paid">Paid</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkApprove}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                        >
                            Approve Selected ({selectedIds.length})
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-dark-700">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length > 0 && selectedIds.length === commissions.data.filter(c => c.status === 'pending').length}
                                            onChange={toggleSelectAll}
                                            className="rounded"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Agent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Transaction</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Commission</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {commissions.data.map((commission) => (
                                    <tr key={commission.id}>
                                        <td className="px-6 py-4">
                                            {commission.status === 'pending' && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(commission.id)}
                                                    onChange={() => toggleSelect(commission.id)}
                                                    className="rounded"
                                                />
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={`/admin/agents/${commission.agent.id}`} className="text-blue-600 hover:underline">
                                                {commission.agent.user.name}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {commission.user.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {commission.transaction_type.replace('_', ' ')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            ${Number(commission.transaction_amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-green-600">+${Number(commission.commission_amount).toFixed(2)}</p>
                                            <p className="text-xs text-gray-500">({commission.commission_rate}%)</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(commission.status)}`}>
                                                {commission.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {commission.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleApprove(commission.id)}
                                                        className="text-blue-600 hover:underline text-sm"
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                                <Link
                                                    href={`/admin/commissions/${commission.id}`}
                                                    className="text-gray-600 hover:underline text-sm"
                                                >
                                                    View
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {commissions.links && commissions.links.length > 3 && (
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/5 flex justify-center gap-2">
                            {commissions.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    className={`px-3 py-1 rounded text-sm ${
                                        link.active
                                            ? 'bg-blue-600 text-white'
                                            : link.url
                                                ? 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300'
                                                : 'bg-gray-50 dark:bg-dark-800 text-gray-400 cursor-not-allowed'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
