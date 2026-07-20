import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { MagnifyingGlassIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface Agent {
    id: number;
    user: { id: number; name: string; email: string };
    agent_code: string;
    company_name: string | null;
    commission_rate: number;
    total_earnings: number;
    status: string;
    created_at: string;
}

interface Props {
    agents: {
        data: Agent[];
        links: any[];
    };
    stats: {
        total: number;
        pending: number;
        active: number;
    };
    filters: {
        status?: string;
        search?: string;
    };
}

export default function AgentsIndex({ agents, stats, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/agents', { ...filters, search }, { preserveState: true });
    };

    const handleStatusFilter = (status: string) => {
        router.get('/admin/agents', { ...filters, status: status || undefined }, { preserveState: true });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300';
            case 'pending':
                return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
            case 'suspended':
                return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300';
            default:
                return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300';
        }
    };

    return (
        <AdminLayout>
            <Head title="Manage Agents" />

            <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agents</h1>
                        <p className="text-gray-600 dark:text-gray-400">Manage referral agents and their commissions</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                <UserGroupIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Agents</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
                    </div>
                    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 p-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Active Agents</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <form onSubmit={handleSearch} className="flex-1 max-w-md">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search agents..."
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                        </div>
                    </form>
                    <select
                        value={filters.status || ''}
                        onChange={(e) => handleStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-white/10 rounded-lg"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="terminated">Terminated</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-dark-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Agent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Code</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Commission</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Earnings</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {agents.data.map((agent) => (
                                    <tr key={agent.id}>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900 dark:text-white">{agent.user.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{agent.user.email}</p>
                                            {agent.company_name && (
                                                <p className="text-xs text-gray-400">{agent.company_name}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm text-gray-600 dark:text-gray-300">{agent.agent_code}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {agent.commission_rate}%
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            ${Number(agent.total_earnings).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(agent.status)}`}>
                                                {agent.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/agents/${agent.id}`}
                                                className="text-blue-600 hover:underline text-sm"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {agents.links && agents.links.length > 3 && (
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/5 flex justify-center gap-2">
                            {agents.links.map((link, i) => (
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
