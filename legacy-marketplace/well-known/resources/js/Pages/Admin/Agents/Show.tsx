import { Head, Link, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface Agent {
    id: number;
    user: { id: number; name: string; email: string };
    agent_code: string;
    company_name: string | null;
    license_number: string | null;
    commission_rate: number;
    total_earnings: number;
    pending_earnings: number;
    withdrawn_earnings: number;
    status: string;
    notes: string | null;
    approved_at: string | null;
    approver: { id: number; name: string } | null;
    created_at: string;
}

interface Referral {
    id: number;
    referred_user: { id: number; name: string; email: string };
    status: string;
    registered_at: string;
}

interface Commission {
    id: number;
    user: { id: number; name: string };
    transaction_type: string;
    commission_amount: number;
    status: string;
    created_at: string;
}

interface Stats {
    total_referrals: number;
    active_referrals: number;
    pending_commissions: number;
    approved_commissions: number;
    paid_commissions: number;
    total_earnings: number;
    available_balance: number;
}

interface Props {
    agent: Agent;
    stats: Stats;
    recentReferrals: Referral[];
    recentCommissions: Commission[];
}

export default function AgentShow({ agent, stats, recentReferrals, recentCommissions }: Props) {
    const [showApproveForm, setShowApproveForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);

    const approveForm = useForm({
        commission_rate: '5',
        notes: '',
    });

    const editForm = useForm({
        commission_rate: agent.commission_rate.toString(),
        status: agent.status,
        notes: agent.notes || '',
    });

    const handleApprove = (e: React.FormEvent) => {
        e.preventDefault();
        approveForm.post(`/admin/agents/${agent.id}/approve`, {
            onSuccess: () => setShowApproveForm(false),
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.put(`/admin/agents/${agent.id}`, {
            onSuccess: () => setShowEditForm(false),
        });
    };

    const handleSuspend = () => {
        if (confirm('Are you sure you want to suspend this agent?')) {
            router.post(`/admin/agents/${agent.id}/suspend`);
        }
    };

    const handleReactivate = () => {
        router.post(`/admin/agents/${agent.id}/reactivate`);
    };

    return (
        <AdminLayout>
            <Head title={`Agent: ${agent.user.name}`} />

            <div className="p-6">
                <Link
                    href="/admin/agents"
                    className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to Agents
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Agent Details */}
                        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{agent.user.name}</h1>
                                    <p className="text-gray-500 dark:text-gray-400">{agent.user.email}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    agent.status === 'active' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' :
                                    agent.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                                    'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                                }`}>
                                    {agent.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Agent Code</p>
                                    <p className="font-mono font-medium text-gray-900 dark:text-white">{agent.agent_code}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Commission Rate</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{agent.commission_rate}%</p>
                                </div>
                                {agent.company_name && (
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Company</p>
                                        <p className="font-medium text-gray-900 dark:text-white">{agent.company_name}</p>
                                    </div>
                                )}
                                {agent.license_number && (
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">License</p>
                                        <p className="font-medium text-gray-900 dark:text-white">{agent.license_number}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Applied</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {new Date(agent.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                {agent.approved_at && (
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {new Date(agent.approved_at).toLocaleDateString()}
                                            {agent.approver && ` by ${agent.approver.name}`}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-3">
                                {agent.status === 'pending' && (
                                    <button
                                        onClick={() => setShowApproveForm(true)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                                    >
                                        Approve Agent
                                    </button>
                                )}
                                {agent.status === 'active' && (
                                    <>
                                        <button
                                            onClick={() => setShowEditForm(true)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={handleSuspend}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                                        >
                                            Suspend
                                        </button>
                                    </>
                                )}
                                {agent.status === 'suspended' && (
                                    <button
                                        onClick={handleReactivate}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                                    >
                                        Reactivate
                                    </button>
                                )}
                            </div>

                            {/* Approve Form */}
                            {showApproveForm && (
                                <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Approve Agent</h3>
                                    <form onSubmit={handleApprove} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Commission Rate (%)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                value={approveForm.data.commission_rate}
                                                onChange={(e) => approveForm.setData('commission_rate', e.target.value)}
                                                className="w-full px-4 py-2 border rounded-lg"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Notes
                                            </label>
                                            <textarea
                                                value={approveForm.data.notes}
                                                onChange={(e) => approveForm.setData('notes', e.target.value)}
                                                rows={2}
                                                className="w-full px-4 py-2 border rounded-lg resize-none"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowApproveForm(false)}
                                                className="px-4 py-2 bg-gray-200 dark:bg-dark-600 text-gray-700 dark:text-gray-300 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={approveForm.processing}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                                            >
                                                {approveForm.processing ? 'Approving...' : 'Approve'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Edit Form */}
                            {showEditForm && (
                                <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Edit Agent</h3>
                                    <form onSubmit={handleUpdate} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Commission Rate (%)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                value={editForm.data.commission_rate}
                                                onChange={(e) => editForm.setData('commission_rate', e.target.value)}
                                                className="w-full px-4 py-2 border rounded-lg"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Status
                                            </label>
                                            <select
                                                value={editForm.data.status}
                                                onChange={(e) => editForm.setData('status', e.target.value)}
                                                className="w-full px-4 py-2 border rounded-lg"
                                            >
                                                <option value="active">Active</option>
                                                <option value="suspended">Suspended</option>
                                                <option value="terminated">Terminated</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Notes
                                            </label>
                                            <textarea
                                                value={editForm.data.notes}
                                                onChange={(e) => editForm.setData('notes', e.target.value)}
                                                rows={2}
                                                className="w-full px-4 py-2 border rounded-lg resize-none"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowEditForm(false)}
                                                className="px-4 py-2 bg-gray-200 dark:bg-dark-600 text-gray-700 dark:text-gray-300 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={editForm.processing}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                                            >
                                                {editForm.processing ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* Recent Referrals */}
                        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Referrals</h2>
                            {recentReferrals.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400">No referrals yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {recentReferrals.map((referral) => (
                                        <div key={referral.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{referral.referred_user.name}</p>
                                                <p className="text-sm text-gray-500">{referral.referred_user.email}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                referral.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {referral.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Stats */}
                        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistics</h2>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Total Referrals</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{stats.total_referrals}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Active Referrals</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{stats.active_referrals}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Pending Commissions</span>
                                    <span className="font-medium text-yellow-600">${Number(stats.pending_commissions).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Approved Commissions</span>
                                    <span className="font-medium text-blue-600">${Number(stats.approved_commissions).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Paid Commissions</span>
                                    <span className="font-medium text-green-600">${Number(stats.paid_commissions).toFixed(2)}</span>
                                </div>
                                <div className="pt-4 border-t border-gray-200 dark:border-white/5">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Total Earnings</span>
                                        <span className="font-bold text-gray-900 dark:text-white">${Number(stats.total_earnings).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Commissions */}
                        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Commissions</h2>
                            {recentCommissions.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400">No commissions yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {recentCommissions.map((commission) => (
                                        <div key={commission.id} className="p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{commission.user.name}</p>
                                                <span className="text-green-600 font-medium">+${Number(commission.commission_amount).toFixed(2)}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">{commission.transaction_type.replace('_', ' ')}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
