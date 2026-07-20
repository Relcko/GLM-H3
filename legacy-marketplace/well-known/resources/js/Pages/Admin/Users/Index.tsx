import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    MagnifyingGlassIcon,
    UserIcon,
    ShieldCheckIcon,
    EyeIcon,
    TrashIcon,
    WalletIcon,
    NoSymbolIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface User {
    id: number;
    name: string;
    email: string;
    wallet_address: string | null;
    is_admin: boolean;
    status: 'active' | 'suspended' | 'banned';
    balance: number;
    created_at: string;
    investments_count: number;
    token_holdings_count: number;
}

interface AdminUsersIndexProps {
    users: {
        data: User[];
        links: any[];
    };
    filters: {
        search?: string;
        role?: string;
        status?: string;
    };
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

export default function AdminUsersIndex({ users, filters }: AdminUsersIndexProps) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/users', { ...filters, search }, { preserveState: true });
    };

    const handleDelete = (user: User) => {
        if (confirm(`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`)) {
            router.delete(`/admin/users/${user.id}`);
        }
    };

    const statusConfig: Record<string, { color: string; label: string }> = {
        active: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Active' },
        suspended: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Suspended' },
        banned: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Banned' },
    };

    return (
        <AdminLayout title="Users">
            <Head title="Users - Admin" />

            {/* Filters */}
            <div className="glass-card rounded-2xl p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <form onSubmit={handleSearch} className="flex-1">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or wallet..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full input-dark rounded-xl py-3 pl-12 pr-4"
                            />
                        </div>
                    </form>

                    <select
                        value={filters.role || ''}
                        onChange={(e) => router.get('/admin/users', { ...filters, role: e.target.value }, { preserveState: true })}
                        className="input-dark rounded-xl py-3 px-4"
                    >
                        <option value="">All Roles</option>
                        <option value="admin">Admins</option>
                        <option value="user">Users</option>
                    </select>

                    <select
                        value={filters.status || ''}
                        onChange={(e) => router.get('/admin/users', { ...filters, status: e.target.value }, { preserveState: true })}
                        className="input-dark rounded-xl py-3 px-4"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Wallet
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Balance
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Holdings
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {users.data.length > 0 ? (
                                users.data.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0">
                                                    <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center">
                                                        <span className="text-white text-sm font-bold">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-white">{user.name}</span>
                                                        {user.is_admin && (
                                                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                                <ShieldCheckIcon className="h-3 w-3 mr-1" />
                                                                Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.wallet_address ? (
                                                <div className="flex items-center text-gray-300">
                                                    <WalletIcon className="h-4 w-4 mr-2 text-emerald-400" />
                                                    <span className="font-mono text-sm">{formatAddress(user.wallet_address)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500">Not connected</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${statusConfig[user.status]?.color}`}>
                                                {user.status === 'suspended' && <NoSymbolIcon className="h-3.5 w-3.5 mr-1.5" />}
                                                {user.status === 'active' && <CheckCircleIcon className="h-3.5 w-3.5 mr-1.5" />}
                                                {statusConfig[user.status]?.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-white font-medium">{formatCurrency(Number(user.balance))}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {user.token_holdings_count} properties
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {formatDate(user.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Link
                                                    href={`/admin/users/${user.id}`}
                                                    className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
                                                    title="View Details"
                                                >
                                                    <EyeIcon className="h-5 w-5" />
                                                </Link>
                                                {!user.is_admin && user.token_holdings_count === 0 && (
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {users.links && users.links.length > 3 && (
                    <div className="px-6 py-4 border-t border-white/10">
                        <nav className="flex items-center justify-center space-x-2">
                            {users.links.map((link: any, index: number) => (
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
        </AdminLayout>
    );
}
